import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import prisma from '../../config/database';
import { validate } from '../../middleware/validate';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth';
import { sendSuccess, sendPaginated, sendCreated } from '../../utils/response';
import { NotFoundError, AppError } from '../../utils/errors';
import { cacheDelPattern } from '../../config/redis';
import { UserRole } from '@prisma/client';

const router = Router();

async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE', endDate: { gte: new Date() } },
  });
  return !!sub;
}

/**
 * @swagger
 * /api/v1/quizzes:
 *   get:
 *     tags: [Quizzes]
 *     summary: List quizzes
 */
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const { examId, subjectId, type, search } = req.query;

    const where = {
      isActive: true,
      ...(examId && { examId: examId as string }),
      ...(subjectId && { subjectId: subjectId as string }),
      ...(type && { type: type as any }),
      ...(search && { title: { contains: search as string, mode: 'insensitive' as const } }),
    };

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true, title: true, slug: true, description: true, type: true,
          durationMinutes: true, totalMarks: true, negativeMarking: true,
          requiresSubscription: true, isFeatured: true, publishedAt: true,
          exam: { select: { id: true, name: true, slug: true } },
          subject: { select: { id: true, name: true } },
          _count: { select: { quizQuestions: true, attempts: true } },
        },
      }),
      prisma.quiz.count({ where }),
    ]);

    return sendPaginated(res, quizzes, total, page, limit);
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { slug: req.params.slug },
      include: {
        exam: { select: { id: true, name: true, slug: true } },
        subject: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
        _count: { select: { quizQuestions: true, attempts: true } },
        seo: true,
      },
    });
    if (!quiz || !quiz.isActive) throw new NotFoundError('Quiz');
    return sendSuccess(res, quiz);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/quizzes/{id}/start:
 *   post:
 *     tags: [Quizzes]
 *     summary: Start a quiz attempt
 *     security: [{ BearerAuth: [] }]
 */
router.post('/:id/start', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        quizQuestions: {
          include: {
            question: {
              include: { 
                options: { orderBy: { sortOrder: 'asc' } },
                category: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!quiz || !quiz.isActive) throw new NotFoundError('Quiz');

    // Check subscription
    if (quiz.requiresSubscription) {
      const isSubscribed = await hasActiveSubscription(req.user!.userId);
      if (!isSubscribed) {
        return res.status(402).json({ success: false, message: 'Subscription required', code: 'SUBSCRIPTION_REQUIRED' });
      }
    }

    // Check max attempts
    if (quiz.maxAttempts) {
      const attemptCount = await prisma.quizAttempt.count({ where: { userId: req.user!.userId, quizId: quiz.id } });
      if (attemptCount >= quiz.maxAttempts) {
        throw new AppError(`Maximum ${quiz.maxAttempts} attempts reached`, 403);
      }
    }

    let questions = quiz.quizQuestions.map(qq => qq.question);
    
    // Group questions by category and shuffle within category if needed
    const questionsByCategory: Record<string, typeof questions> = {};
    for (const q of questions) {
      const catId = q.categoryId || 'uncategorized';
      if (!questionsByCategory[catId]) questionsByCategory[catId] = [];
      questionsByCategory[catId].push(q);
    }

    let finalQuestions: typeof questions = [];
    
    // Iterate over categories (sorting category keys to maintain consistent order across attempts)
    const categoryKeys = Object.keys(questionsByCategory).sort();
    for (const key of categoryKeys) {
      let catQs = questionsByCategory[key];
      if (quiz.shuffleQuestions) {
        catQs = catQs.sort(() => Math.random() - 0.5);
      }
      finalQuestions = finalQuestions.concat(catQs);
    }
    
    questions = finalQuestions;

    // Create attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: req.user!.userId,
        quizId: quiz.id,
        totalQuestions: questions.length,
        totalMarks: quiz.totalMarks,
      },
    });

    // Sanitize — remove isCorrect from options
    const sanitizedQuestions = questions.map(q => {
      const opts = quiz.shuffleOptions ? [...q.options].sort(() => Math.random() - 0.5) : q.options;
      return {
        id: q.id, questionText: q.questionText, questionImage: q.questionImage,
        type: q.type, marks: q.marks, negativeMarks: q.negativeMarks,
        categoryId: q.categoryId, categoryName: q.category?.name || 'General',
        options: opts.map(o => ({ id: o.id, optionText: o.optionText, optionImage: o.optionImage, sortOrder: o.sortOrder })),
      };
    });

    return sendSuccess(res, {
      attemptId: attempt.id,
      quiz: { id: quiz.id, title: quiz.title, durationMinutes: quiz.durationMinutes, negativeMarking: quiz.negativeMarking, negativeMarkValue: quiz.negativeMarkValue },
      questions: sanitizedQuestions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/quizzes/attempts/{attemptId}/submit:
 *   post:
 *     tags: [Quizzes]
 *     summary: Submit quiz responses
 *     security: [{ BearerAuth: [] }]
 */
router.post('/attempts/:attemptId/submit', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { responses, timeTakenSeconds } = req.body;
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: req.params.attemptId },
      include: { responses: true },
    });
    if (!attempt || attempt.userId !== req.user!.userId) throw new NotFoundError('Attempt');
    if (attempt.completedAt) throw new AppError('Quiz already submitted', 400);

    const quiz = await prisma.quiz.findUnique({ where: { id: attempt.quizId } });
    if (!quiz) throw new NotFoundError('Quiz');

    let correct = 0, incorrect = 0, skipped = 0, marksObtained = 0;
    const responsesToCreate: any[] = [];

    for (const r of responses) {
      const question = await prisma.question.findUnique({
        where: { id: r.questionId },
        include: { options: true },
      });
      if (!question) continue;

      const correctOptions = question.options.filter(o => o.isCorrect).map(o => o.id);
      const selectedOptions: string[] = Array.isArray(r.selectedOptions) ? r.selectedOptions : (r.selectedOptionId ? [r.selectedOptionId] : []);

      let isCorrect = false;
      let questionMarks = 0;

      if (selectedOptions.length === 0 || r.isSkipped) {
        skipped++;
      } else if (question.type === 'MULTIPLE_CORRECT') {
        isCorrect = selectedOptions.length === correctOptions.length && selectedOptions.every(id => correctOptions.includes(id));
        if (isCorrect) { correct++; questionMarks = question.marks || 1; }
        else { incorrect++; if (quiz.negativeMarking) questionMarks = -(quiz.negativeMarkValue || 0); }
      } else {
        isCorrect = selectedOptions.length === 1 && correctOptions.includes(selectedOptions[0]);
        if (isCorrect) { correct++; questionMarks = question.marks || 1; }
        else { incorrect++; if (quiz.negativeMarking) questionMarks = -(quiz.negativeMarkValue || 0); }
      }
      marksObtained += questionMarks;

      responsesToCreate.push({
        attemptId: attempt.id,
        questionId: r.questionId,
        selectedOptionId: r.selectedOptionId || null,
        selectedOptions,
        isCorrect,
        marksObtained: questionMarks,
        isSkipped: !!r.isSkipped,
        markedForReview: !!r.markedForReview,
        timeTakenSeconds: r.timeTakenSeconds,
      });
    }

    marksObtained = Math.max(0, marksObtained);
    const percentage = (marksObtained / quiz.totalMarks) * 100;

    await prisma.attemptResponse.createMany({ data: responsesToCreate, skipDuplicates: true });
    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { completedAt: new Date(), correct, incorrect, skipped, marksObtained, percentage, attempted: correct + incorrect, timeTakenSeconds },
    });

    // Fetch with correct answers for result
    const fullResponses = await prisma.attemptResponse.findMany({
      where: { attemptId: attempt.id },
      include: { question: { include: { options: true } } },
    });

    return sendSuccess(res, {
      attempt: updatedAttempt,
      result: { correct, incorrect, skipped, marksObtained, totalMarks: quiz.totalMarks, percentage: percentage.toFixed(2), passed: marksObtained >= quiz.passingMarks },
      responses: fullResponses,
    }, 'Quiz submitted successfully');
  } catch (err) {
    next(err);
  }
});

// Get attempt result
router.get('/attempts/:attemptId/result', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: req.params.attemptId },
    });
    if (!attempt || attempt.userId !== req.user!.userId) throw new NotFoundError('Attempt');
    if (!attempt.completedAt) throw new AppError('Quiz not yet submitted', 400);

    const quiz = await prisma.quiz.findUnique({ where: { id: attempt.quizId } });
    const fullResponses = await prisma.attemptResponse.findMany({
      where: { attemptId: attempt.id },
      include: { question: { include: { options: true } } },
    });

    return sendSuccess(res, {
      attempt,
      result: {
        correct: attempt.correct,
        incorrect: attempt.incorrect,
        skipped: attempt.skipped,
        marksObtained: attempt.marksObtained,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage.toFixed(2),
        passed: quiz ? attempt.marksObtained >= quiz.passingMarks : false,
      },
      responses: fullResponses,
    });
  } catch (err) {
    next(err);
  }
});

// Attempt history
router.get('/my/attempts', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const [attempts, total] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { userId: req.user!.userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: { responses: { select: { id: true, isCorrect: true } } },
      }),
      prisma.quizAttempt.count({ where: { userId: req.user!.userId } }),
    ]);
    return sendPaginated(res, attempts, total, page, limit);
  } catch (err) {
    next(err);
  }
});

// Leaderboard
router.get('/:id/leaderboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const top = await prisma.quizAttempt.findMany({
      where: { quizId: req.params.id, completedAt: { not: null } },
      orderBy: [{ marksObtained: 'desc' }, { timeTakenSeconds: 'asc' }],
      take: 50,
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    const leaderboard = top.map((a, i) => ({ rank: i + 1, user: a.user, marks: a.marksObtained, percentage: a.percentage, time: a.timeTakenSeconds }));
    return sendSuccess(res, leaderboard);
  } catch (err) {
    next(err);
  }
});

function sanitizeQuizData(body: any) {
  const {
    id, createdAt, updatedAt, _count, questionsCount, attemptsCount, isPublished,
    exam, subject, topic, quizQuestions, attempts, seo, subjectConfigs,
    ...data
  } = body;
  
  if (isPublished !== undefined) {
    data.isActive = Boolean(isPublished);
    if (isPublished && !data.publishedAt) {
      data.publishedAt = new Date();
    }
  }
  if (data.durationMinutes !== undefined) data.durationMinutes = Number(data.durationMinutes) || 60;
  if (data.totalMarks !== undefined) data.totalMarks = Number(data.totalMarks) || 100;
  if (data.passingMarks !== undefined) data.passingMarks = Number(data.passingMarks) || 35;
  if (data.negativeMarkValue !== undefined) data.negativeMarkValue = Number(data.negativeMarkValue) || 0.25;
  if (data.maxAttempts !== undefined && data.maxAttempts !== null && data.maxAttempts !== '') {
    data.maxAttempts = Number(data.maxAttempts) || null;
  } else if (data.maxAttempts === '' || data.maxAttempts === 0) {
    data.maxAttempts = null;
  }
  return data;
}

/**
 * @swagger
 * /api/v1/quizzes/admin/all:
 *   get:
 *     tags: [Quizzes - Admin]
 *     summary: List all quizzes (active + draft) with filters
 */
router.get(
  '/admin/all',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
      const skip = (page - 1) * limit;
      const { search, examId, subjectId, type, status } = req.query;

      const where: any = {
        ...(examId && examId !== 'all' && { examId: examId as string }),
        ...(subjectId && subjectId !== 'all' && { subjectId: subjectId as string }),
        ...(type && type !== 'all' && { type: type as any }),
        ...(status === 'active' && { isActive: true }),
        ...(status === 'inactive' && { isActive: false }),
        ...(search && {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' as const } },
            { slug: { contains: search as string, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [quizzes, total] = await Promise.all([
        prisma.quiz.findMany({
          where, skip, take: limit,
          orderBy: [{ createdAt: 'desc' }],
          include: {
            exam: { select: { id: true, name: true, slug: true } },
            subject: { select: { id: true, name: true } },
            _count: { select: { quizQuestions: true, attempts: true } },
          },
        }),
        prisma.quiz.count({ where }),
      ]);

      return sendPaginated(res, quizzes, total, page, limit);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/quizzes/{id}/builder:
 *   get:
 *     tags: [Quizzes - Admin]
 *     summary: Get full quiz + all ordered questions and options
 */
router.get(
  '/:id/builder',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id: req.params.id },
        include: {
          exam: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          quizQuestions: {
            orderBy: { sortOrder: 'asc' },
            include: {
              question: {
                include: { options: { orderBy: { sortOrder: 'asc' } } },
              },
            },
          },
        },
      });
      if (!quiz) throw new NotFoundError('Quiz');
      return sendSuccess(res, quiz);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: create quiz
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = sanitizeQuizData(req.body);
      
      let finalSlug = data.slug;
      if (finalSlug) {
        const exists = await prisma.quiz.findUnique({ where: { slug: finalSlug } });
        if (exists) {
          finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
        }
        data.slug = finalSlug;
      }

      const subjectConfigs = req.body.subjectConfigs || [];
      
      const quiz = await prisma.quiz.create({ 
        data: {
          ...data,
          subjectConfigs: {
            create: subjectConfigs.map((cfg: any) => ({
              subjectId: cfg.subjectId,
              questionCount: Number(cfg.questionCount) || 0,
              marksPerQuestion: cfg.marksPerQuestion ? Number(cfg.marksPerQuestion) : null,
              isRandom: Boolean(cfg.isRandom),
              selectionMode: cfg.selectionMode === 'SELECTIVE' ? 'SELECTIVE' : 'TOTAL_RANDOM',
              categoryIds: Array.isArray(cfg.categoryIds) ? cfg.categoryIds : [],
              categoryDistribution: cfg.selectionMode === 'SELECTIVE' && Array.isArray(cfg.categoryDistribution) ? cfg.categoryDistribution : null,
            }))
          }
        },
        include: { subjectConfigs: true }
      });
      await cacheDelPattern('quizzes:*');
      return sendCreated(res, quiz, 'Quiz created successfully');
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = sanitizeQuizData(req.body);

      let finalSlug = data.slug;
      if (finalSlug) {
        const exists = await prisma.quiz.findUnique({ where: { slug: finalSlug } });
        if (exists && exists.id !== req.params.id) {
          finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
        }
        data.slug = finalSlug;
      }

      const subjectConfigs = req.body.subjectConfigs;

      const updateData: any = { ...data };

      if (subjectConfigs) {
        updateData.subjectConfigs = {
          deleteMany: {}, // Delete all existing
          create: subjectConfigs.map((cfg: any) => ({
            subjectId: cfg.subjectId,
            questionCount: Number(cfg.questionCount) || 0,
            marksPerQuestion: cfg.marksPerQuestion ? Number(cfg.marksPerQuestion) : null,
            isRandom: Boolean(cfg.isRandom),
            selectionMode: cfg.selectionMode === 'SELECTIVE' ? 'SELECTIVE' : 'TOTAL_RANDOM',
            categoryIds: Array.isArray(cfg.categoryIds) ? cfg.categoryIds : [],
            categoryDistribution: cfg.selectionMode === 'SELECTIVE' && Array.isArray(cfg.categoryDistribution) ? cfg.categoryDistribution : null,
          })),
        };
      }

      const quiz = await prisma.quiz.update({
        where: { id: req.params.id },
        data: updateData,
        include: { subjectConfigs: true }
      });
      await cacheDelPattern('quizzes:*');
      return sendSuccess(res, quiz, 'Quiz updated successfully');
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const current = await prisma.quiz.findUnique({ where: { id: req.params.id }, select: { isActive: true } });
      if (!current) throw new NotFoundError('Quiz');
      const updated = await prisma.quiz.update({
        where: { id: req.params.id },
        data: { isActive: !current.isActive },
      });
      await cacheDelPattern('quizzes:*');
      return sendSuccess(res, updated, `Quiz ${updated.isActive ? 'published' : 'unpublished'}`);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/duplicate',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const original = await prisma.quiz.findUnique({
        where: { id: req.params.id },
        include: { quizQuestions: true },
      });
      if (!original) throw new NotFoundError('Quiz');

      const copySlug = `${original.slug}-copy-${Date.now().toString().slice(-4)}`;
      const clone = await prisma.quiz.create({
        data: {
          title: `Copy of ${original.title}`,
          slug: copySlug,
          description: original.description,
          examId: original.examId,
          subjectId: original.subjectId,
          topicId: original.topicId,
          type: original.type,
          durationMinutes: original.durationMinutes,
          totalMarks: original.totalMarks,
          passingMarks: original.passingMarks,
          negativeMarking: original.negativeMarking,
          negativeMarkValue: original.negativeMarkValue,
          shuffleQuestions: original.shuffleQuestions,
          shuffleOptions: original.shuffleOptions,
          maxAttempts: original.maxAttempts,
          requiresSubscription: original.requiresSubscription,
          isActive: false,
          isFeatured: false,
        },
      });

      if (original.quizQuestions.length > 0) {
        await prisma.quizQuestion.createMany({
          data: original.quizQuestions.map(qq => ({
            quizId: clone.id,
            questionId: qq.questionId,
            sortOrder: qq.sortOrder,
          })),
        });
      }

      await cacheDelPattern('quizzes:*');
      return sendCreated(res, clone, 'Quiz and questions duplicated successfully');
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quizId = req.params.id;
      const deleteQuestions = req.query.deleteQuestions === 'true';

      const existingQuiz = await prisma.quiz.findUnique({ where: { id: quizId } });
      if (!existingQuiz) throw new NotFoundError('Quiz');

      // Fetch attached question IDs before deletion if deleteQuestions requested
      let questionIds: string[] = [];
      if (deleteQuestions) {
        const attached = await prisma.quizQuestion.findMany({
          where: { quizId },
          select: { questionId: true },
        });
        questionIds = attached.map(q => q.questionId);
      }

      await prisma.$transaction(async (tx) => {
        // Delete quiz attempts & responses
        const attempts = await tx.quizAttempt.findMany({ where: { quizId }, select: { id: true } });
        const attemptIds = attempts.map(a => a.id);
        if (attemptIds.length > 0) {
          await tx.attemptResponse.deleteMany({ where: { attemptId: { in: attemptIds } } });
          await tx.quizAttempt.deleteMany({ where: { quizId } });
        }

        // Delete quizQuestions links
        await tx.quizQuestion.deleteMany({ where: { quizId } });

        // If user requested to delete underlying questions from bank
        if (deleteQuestions && questionIds.length > 0) {
          await tx.attemptResponse.deleteMany({ where: { questionId: { in: questionIds } } });
          await tx.questionOption.deleteMany({ where: { questionId: { in: questionIds } } });
          await tx.question.deleteMany({ where: { id: { in: questionIds } } });
        }

        // Permanently delete quiz
        await tx.quiz.delete({ where: { id: quizId } });
      });

      await cacheDelPattern('quizzes:*');
      return sendSuccess(res, null, 'Quiz permanently deleted');
    } catch (err) {
      next(err);
    }
  }
);

// Method 2: Pick from Question Bank (Attach existing question IDs)
router.post(
  '/:quizId/questions',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { questionIds } = req.body;
      const maxSort = await prisma.quizQuestion.count({ where: { quizId: req.params.quizId } });
      const data = (questionIds as string[]).map((qId: string, i: number) => ({
        quizId: req.params.quizId, questionId: qId, sortOrder: maxSort + i,
      }));
      await prisma.quizQuestion.createMany({ data, skipDuplicates: true });
      await cacheDelPattern('quizzes:*');
      return sendSuccess(res, null, `${questionIds.length} questions attached to quiz`);
    } catch (err) {
      next(err);
    }
  }
);

// Method 1: Inline Create Question & Attach
router.post(
  '/:quizId/questions/inline',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { options, ...questionData } = req.body;
      const question = await prisma.question.create({
        data: {
          ...questionData,
          options: {
            create: (options || []).map((o: any, idx: number) => ({
              optionText: o.optionText || o.text || '',
              isCorrect: Boolean(o.isCorrect),
              sortOrder: idx,
            })),
          },
        },
      });

      const maxSort = await prisma.quizQuestion.count({ where: { quizId: req.params.quizId } });
      await prisma.quizQuestion.create({
        data: {
          quizId: req.params.quizId,
          questionId: question.id,
          sortOrder: maxSort,
        },
      });

      await cacheDelPattern('quizzes:*');
      return sendCreated(res, question, 'Question created and attached to quiz');
    } catch (err) {
      next(err);
    }
  }
);

// Method 3: Bulk Import Questions & Attach
router.post(
  '/:quizId/questions/bulk',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items } = req.body; // Array of question items
      if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('No valid questions provided for bulk import', 400);
      }

      const maxSort = await prisma.quizQuestion.count({ where: { quizId: req.params.quizId } });
      let addedCount = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.questionText) continue;

        const question = await prisma.question.create({
          data: {
            questionText: item.questionText,
            explanation: item.explanation || null,
            difficulty: item.difficulty || 'MEDIUM',
            marks: Number(item.marks) || 1,
            negativeMarks: Number(item.negativeMarks) || 0.25,
            options: {
              create: (item.options || []).map((opt: any, idx: number) => ({
                optionText: typeof opt === 'string' ? opt : opt.optionText || opt.text || '',
                isCorrect: typeof opt === 'string' ? idx === Number(item.correctIndex || 0) : Boolean(opt.isCorrect),
                sortOrder: idx,
              })),
            },
          },
        });

        await prisma.quizQuestion.create({
          data: {
            quizId: req.params.quizId,
            questionId: question.id,
            sortOrder: maxSort + addedCount,
          },
        });
        addedCount++;
      }

      await cacheDelPattern('quizzes:*');
      return sendSuccess(res, { addedCount }, `Successfully imported ${addedCount} questions into test`);
    } catch (err) {
      next(err);
    }
  }
);

// Pick from Question Bank by Category & Custom Count
router.post(
  '/:quizId/questions/pick-by-category',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categorySelections } = req.body; // Array of { categoryId: string, count: number }
      if (!Array.isArray(categorySelections) || categorySelections.length === 0) {
        throw new AppError('No category selections provided', 400);
      }

      // Existing questions already in this quiz
      const existing = await prisma.quizQuestion.findMany({
        where: { quizId: req.params.quizId },
        select: { questionId: true },
      });
      const existingIds = new Set(existing.map((e) => e.questionId));
      let currentSort = existing.length;
      let totalAttached = 0;

      for (const sel of categorySelections) {
        if (!sel.categoryId || !sel.count || sel.count <= 0) continue;

        // Fetch active questions for category not already attached
        const questions = await prisma.question.findMany({
          where: {
            categoryId: sel.categoryId,
            isActive: true,
            id: { notIn: Array.from(existingIds) },
          },
          take: Number(sel.count),
          orderBy: { createdAt: 'desc' },
        });

        for (const q of questions) {
          await prisma.quizQuestion.create({
            data: {
              quizId: req.params.quizId,
              questionId: q.id,
              sortOrder: currentSort++,
            },
          });
          existingIds.add(q.id);
          totalAttached++;
        }
      }

      await cacheDelPattern('quizzes:*');
      return sendSuccess(res, { totalAttached }, `Successfully attached ${totalAttached} questions from categories`);
    } catch (err) {
      next(err);
    }
  }
);
router.post(
  '/:quizId/questions/auto-generate',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { count = 10, difficulty, topicId } = req.body;
      const targetCount = Math.min(100, Math.max(1, Number(count) || 10));

      const where: any = { isActive: true };
      if (difficulty && difficulty !== 'ALL') where.difficulty = difficulty;
      if (topicId && topicId !== 'ALL') where.topicId = topicId;

      // Find existing linked question IDs so we don't attach duplicates
      const existingLinked = await prisma.quizQuestion.findMany({
        where: { quizId: req.params.quizId },
        select: { questionId: true },
      });
      const excludeIds = existingLinked.map(e => e.questionId);
      if (excludeIds.length > 0) {
        where.id = { notIn: excludeIds };
      }

      const availableQuestions = await prisma.question.findMany({
        where,
        take: targetCount * 3, // fetch extra to randomize
        select: { id: true },
      });

      if (availableQuestions.length === 0) {
        throw new AppError('No matching questions found in question bank for criteria', 404);
      }

      // Shuffle & slice target count
      const selected = availableQuestions.sort(() => Math.random() - 0.5).slice(0, targetCount);
      const maxSort = await prisma.quizQuestion.count({ where: { quizId: req.params.quizId } });

      await prisma.quizQuestion.createMany({
        data: selected.map((q, idx) => ({
          quizId: req.params.quizId,
          questionId: q.id,
          sortOrder: maxSort + idx,
        })),
        skipDuplicates: true,
      });

      await cacheDelPattern('quizzes:*');
      return sendSuccess(res, { addedCount: selected.length }, `Auto-generated ${selected.length} questions into quiz`);
    } catch (err) {
      next(err);
    }
  }
);

// Clear all questions from a quiz (with optional question bank deletion)
router.delete(
  '/:quizId/questions/all',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quizId } = req.params;
      const deleteFromBank = req.query.deleteFromBank === 'true';

      const attached = await prisma.quizQuestion.findMany({
        where: { quizId },
        select: { questionId: true },
      });
      const questionIds = attached.map(q => q.questionId);

      if (deleteFromBank && questionIds.length > 0) {
        await prisma.$transaction([
          prisma.quizQuestion.deleteMany({ where: { quizId } }),
          prisma.attemptResponse.deleteMany({ where: { questionId: { in: questionIds } } }),
          prisma.questionOption.deleteMany({ where: { questionId: { in: questionIds } } }),
          prisma.question.deleteMany({ where: { id: { in: questionIds } } }),
        ]);
      } else {
        await prisma.quizQuestion.deleteMany({ where: { quizId } });
      }

      await cacheDelPattern('quizzes:*');
      return sendSuccess(res, null, deleteFromBank ? 'All questions deleted from quiz and Question Bank' : 'All questions detached from quiz');
    } catch (err) {
      next(err);
    }
  }
);

// Delete single question link or purge from bank
router.delete(
  '/:quizId/questions/:questionId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quizId, questionId } = req.params;
      const deleteFromBank = req.query.deleteFromBank === 'true';

      if (deleteFromBank) {
        await prisma.$transaction([
          prisma.quizQuestion.deleteMany({ where: { questionId } }),
          prisma.attemptResponse.deleteMany({ where: { questionId } }),
          prisma.questionOption.deleteMany({ where: { questionId } }),
          prisma.question.delete({ where: { id: questionId } }),
        ]);
      } else {
        await prisma.quizQuestion.deleteMany({
          where: { quizId, questionId },
        });
      }

      await cacheDelPattern('quizzes:*');
      return sendSuccess(res, null, deleteFromBank ? 'Question deleted from Question Bank' : 'Question removed from quiz');
    } catch (err) {
      next(err);
    }
  }
);

// Pick from Question Bank by Category & Custom Count
router.post(
  '/:quizId/questions/pick-by-category',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categorySelections } = req.body; // Array of { categoryId: string, count: number }
      if (!Array.isArray(categorySelections) || categorySelections.length === 0) {
        throw new AppError('No category selections provided', 400);
      }

      // Existing questions already in this quiz
      const existing = await prisma.quizQuestion.findMany({
        where: { quizId: req.params.quizId },
        select: { questionId: true },
      });
      const existingIds = new Set(existing.map((e) => e.questionId));
      let currentSort = existing.length;
      let totalAttached = 0;

      for (const sel of categorySelections) {
        if (!sel.categoryId || !sel.count || sel.count <= 0) continue;

        // Fetch active questions for category not already attached
        const questions = await prisma.question.findMany({
          where: {
            categoryId: sel.categoryId,
            isActive: true,
            id: { notIn: Array.from(existingIds) },
          },
          take: Number(sel.count),
          orderBy: { createdAt: 'desc' },
        });

        for (const q of questions) {
          await prisma.quizQuestion.create({
            data: {
              quizId: req.params.quizId,
              questionId: q.id,
              sortOrder: currentSort++,
            },
          });
          existingIds.add(q.id);
          totalAttached++;
        }
      }

      await cacheDelPattern('quizzes:*');
      return sendSuccess(res, { totalAttached }, `Successfully attached ${totalAttached} questions from categories`);
    } catch (err) {
      next(err);
    }
  }
);
router.post(
  '/:quizId/questions/auto-generate',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { count = 10, difficulty, topicId } = req.body;
      const targetCount = Math.min(100, Math.max(1, Number(count) || 10));

      const where: any = { isActive: true };
      if (difficulty && difficulty !== 'ALL') where.difficulty = difficulty;
      if (topicId && topicId !== 'ALL') where.topicId = topicId;

      // Find existing linked question IDs so we don't attach duplicates
      const existingLinked = await prisma.quizQuestion.findMany({
        where: { quizId: req.params.quizId },
        select: { questionId: true },
      });
      const excludeIds = existingLinked.map(e => e.questionId);
      if (excludeIds.length > 0) {
        where.id = { notIn: excludeIds };
      }

      const availableQuestions = await prisma.question.findMany({
        where,
        take: targetCount * 3, // fetch extra to randomize
        select: { id: true },
      });

      if (availableQuestions.length === 0) {
        throw new AppError('No matching questions found in question bank for criteria', 404);
      }

      // Shuffle & slice target count
      const selected = availableQuestions.sort(() => Math.random() - 0.5).slice(0, targetCount);
      const maxSort = await prisma.quizQuestion.count({ where: { quizId: req.params.quizId } });

      await prisma.quizQuestion.createMany({
        data: selected.map((q, idx) => ({
          quizId: req.params.quizId,
          questionId: q.id,
          sortOrder: maxSort + idx,
        })),
        skipDuplicates: true,
      });

      await cacheDelPattern('quizzes:*');
      return sendSuccess(res, { addedCount: selected.length }, `Auto-generated ${selected.length} questions into quiz`);
    } catch (err) {
      next(err);
    }
  }
);

// Clear all questions from a quiz (with optional question bank deletion)
router.delete(
  '/:quizId/questions/all',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quizId } = req.params;
      const deleteFromBank = req.query.deleteFromBank === 'true';

      const attached = await prisma.quizQuestion.findMany({
        where: { quizId },
        select: { questionId: true },
      });
      const questionIds = attached.map(q => q.questionId);

      if (deleteFromBank && questionIds.length > 0) {
        await prisma.$transaction([
          prisma.quizQuestion.deleteMany({ where: { quizId } }),
          prisma.attemptResponse.deleteMany({ where: { questionId: { in: questionIds } } }),
          prisma.questionOption.deleteMany({ where: { questionId: { in: questionIds } } }),
          prisma.question.deleteMany({ where: { id: { in: questionIds } } }),
        ]);
      } else {
        await prisma.quizQuestion.deleteMany({ where: { quizId } });
      }

      await cacheDelPattern('quizzes:*');
      return sendSuccess(res, null, deleteFromBank ? 'All questions deleted from quiz and Question Bank' : 'All questions detached from quiz');
    } catch (err) {
      next(err);
    }
  }
);

// Delete single question link or purge from bank
router.delete(
  '/:quizId/questions/:questionId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quizId, questionId } = req.params;
      const deleteFromBank = req.query.deleteFromBank === 'true';

      if (deleteFromBank) {
        await prisma.$transaction([
          prisma.quizQuestion.deleteMany({ where: { questionId } }),
          prisma.attemptResponse.deleteMany({ where: { questionId } }),
          prisma.questionOption.deleteMany({ where: { questionId } }),
          prisma.question.delete({ where: { id: questionId } }),
        ]);
      } else {
        await prisma.quizQuestion.deleteMany({
          where: { quizId, questionId },
        });
      }

      await cacheDelPattern('quizzes:*');
      return sendSuccess(res, null, deleteFromBank ? 'Question deleted from Question Bank' : 'Question removed from quiz');
    } catch (err) {
      next(err);
    }
  }
);

// Generate questions based on quiz subject config rules
router.post(
  '/:quizId/generate-questions-from-rules',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id: req.params.quizId },
        include: { subjectConfigs: true },
      });
      if (!quiz) throw new NotFoundError('Quiz');
      if (!quiz.isMultiSubject || quiz.subjectConfigs.length === 0) {
        throw new AppError('Quiz does not have multi-subject rules configured', 400);
      }

      let totalGenerated = 0;
      let currentSortIndex = await prisma.quizQuestion.count({ where: { quizId: req.params.quizId } });

      const newQuizQuestions: any[] = [];

      for (const config of quiz.subjectConfigs) {
        if (config.selectionMode === 'SELECTIVE' && Array.isArray(config.categoryDistribution)) {
          for (const cat of config.categoryDistribution as any[]) {
            const count = Number(cat.count) || 0;
            if (count <= 0) continue;
            
            const where: any = { isActive: true, categoryId: cat.categoryId };
            const available = await prisma.question.findMany({
              where,
              take: config.isRandom ? count * 3 : count,
              select: { id: true },
            });

            if (available.length === 0) continue;

            const selected = config.isRandom 
              ? available.sort(() => Math.random() - 0.5).slice(0, count)
              : available.slice(0, count);

            for (const q of selected) {
              newQuizQuestions.push({ quizId: quiz.id, questionId: q.id, sortOrder: currentSortIndex++ });
            }
            totalGenerated += selected.length;
          }
        } else {
          if (config.questionCount <= 0) continue;
          
          const where: any = { isActive: true };
          if (config.categoryIds && config.categoryIds.length > 0) {
            where.categoryId = { in: config.categoryIds };
          }

          const available = await prisma.question.findMany({
            where,
            take: config.isRandom ? config.questionCount * 3 : config.questionCount,
            select: { id: true },
          });

          if (available.length === 0) continue;

          const selected = config.isRandom 
            ? available.sort(() => Math.random() - 0.5).slice(0, config.questionCount)
            : available.slice(0, config.questionCount);

          for (const q of selected) {
            newQuizQuestions.push({ quizId: quiz.id, questionId: q.id, sortOrder: currentSortIndex++ });
          }
          totalGenerated += selected.length;
        }
      }

      if (newQuizQuestions.length > 0) {
        await prisma.quizQuestion.createMany({
          data: newQuizQuestions,
          skipDuplicates: true,
        });
        await cacheDelPattern('quizzes:*');
      }

      return sendSuccess(res, { addedCount: totalGenerated }, `Auto-generated ${totalGenerated} questions based on rules`);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
