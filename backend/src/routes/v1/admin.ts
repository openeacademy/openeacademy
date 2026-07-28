import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import prisma from '../../config/database';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';
import { UserRole, UserStatus } from '@prisma/client';
import { imageUpload } from '../../middleware/upload';
import { uploadFile, getPublicUrl } from '../../utils/storage';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// All routes require admin
router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

// ─── Image Upload ──────────────────────────────────────────────────────────────
router.post('/upload-image', imageUpload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const ext = path.extname(req.file.originalname) || '.jpg';
    const key = `images/${uuidv4()}${ext}`;
    await uploadFile({ key, buffer: req.file.buffer, contentType: req.file.mimetype, acl: 'public-read' });
    const url = getPublicUrl(key);
    return sendSuccess(res, { url, key }, 'Image uploaded');
  } catch (err) { next(err); }
});

// Users list with search and filtering
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const { search, status, role } = req.query;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' as const } },
          { email: { contains: search as string, mode: 'insensitive' as const } },
          { mobile: { contains: search as string } },
        ],
      }),
      ...(status && { status: status as UserStatus }),
      ...(role && { role: role as UserRole }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, mobile: true, role: true, status: true,
          emailVerified: true, mobileVerified: true, lastLoginAt: true, createdAt: true,
          _count: { select: { subscriptions: true, quizAttempts: true, pdfAccesses: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return sendPaginated(res, users, total, page, limit);
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
        quizAttempts: { orderBy: { startedAt: 'desc' }, take: 10 },
        sessions: { orderBy: { createdAt: 'desc' }, take: 5 },
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
        devices: true,
      },
    });
    if (!user) throw new NotFoundError('User');
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/status', [body('status').isIn(Object.values(UserStatus))], validate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: req.body.status } });
    return sendSuccess(res, { id: user.id, status: user.status }, 'User status updated');
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/role', [body('role').isIn(Object.values(UserRole))], validate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.role } });
    return sendSuccess(res, { id: user.id, role: user.role }, 'User role updated');
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:id', authorize(UserRole.SUPER_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { status: UserStatus.BANNED } });
    return sendSuccess(res, null, 'User banned');
  } catch (err) {
    next(err);
  }
});

// Dashboard stats with comprehensive analytics per ADMIN_PANEL_SPEC.md Section 2
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [
      totalUsers, newUsersToday, activeSubscriptions,
      totalRevenueAgg, totalExams, totalPDFs, totalQuizzes, quizAttemptsToday,
      recentPayments, popularExams, popularPDFs, recentRegistrations, topAttempts,
      recentPaymentsForTrend, recentUsersForTrend, recentAttemptsForTrend, planSubscriptions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.subscription.count({ where: { status: 'ACTIVE', endDate: { gte: new Date() } } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { finalAmount: true } }),
      prisma.exam.count({ where: { isActive: true } }),
      prisma.pDF.count({ where: { isActive: true } }),
      prisma.quiz.count({ where: { isActive: true } }),
      prisma.quizAttempt.count({ where: { startedAt: { gte: today } } }),
      prisma.payment.findMany({ where: { status: 'COMPLETED' }, orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { id: true, name: true, email: true, mobile: true } } } }),
      prisma.exam.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, take: 6, include: { _count: { select: { pdfs: true, quizzes: true } } } }),
      prisma.pDF.findMany({ where: { isActive: true }, orderBy: { viewCount: 'desc' }, take: 6, select: { id: true, title: true, viewCount: true, downloadCount: true } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, name: true, email: true, mobile: true, role: true, status: true, createdAt: true } }),
      prisma.quizAttempt.findMany({ where: { completedAt: { not: null } }, orderBy: { percentage: 'desc' }, take: 10, include: { user: { select: { id: true, name: true, email: true } }, Quiz: { select: { title: true } } } }),
      prisma.payment.findMany({ where: { status: 'COMPLETED', createdAt: { gte: sevenDaysAgo } }, select: { finalAmount: true, createdAt: true } }),
      prisma.user.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
      prisma.quizAttempt.findMany({ where: { startedAt: { gte: sevenDaysAgo } }, select: { startedAt: true } }),
      prisma.subscription.findMany({ where: { status: 'ACTIVE' }, include: { plan: { select: { name: true } } } }),
    ]);

    // Build 7 days date keys
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const revenueTrend = days.map(day => {
      const total = recentPaymentsForTrend
        .filter(p => p.createdAt.toISOString().split('T')[0] === day)
        .reduce((sum, p) => sum + (p.finalAmount || 0), 0);
      return { date: day, value: total };
    });

    const userGrowth = days.map(day => {
      const count = recentUsersForTrend.filter(u => u.createdAt.toISOString().split('T')[0] === day).length;
      return { date: day, value: count };
    });

    const quizAttemptsTrend = days.map(day => {
      const count = recentAttemptsForTrend.filter(a => a.startedAt.toISOString().split('T')[0] === day).length;
      return { date: day, value: count };
    });

    // Plan distribution pie
    const planDistMap: Record<string, number> = {};
    for (const sub of planSubscriptions) {
      const name = sub.plan?.name || 'Unknown Plan';
      planDistMap[name] = (planDistMap[name] || 0) + 1;
    }
    const planDistribution = Object.entries(planDistMap).map(([name, count]) => ({ name, value: count }));

    return sendSuccess(res, {
      stats: {
        totalUsers,
        activeSubscriptions,
        todayRevenue: revenueTrend[revenueTrend.length - 1]?.value || 0,
        totalRevenue: totalRevenueAgg._sum.finalAmount || 0,
        todayRegistrations: newUsersToday,
        totalExams,
        totalPDFs,
        quizAttemptsToday,
      },
      charts: {
        revenueTrend,
        userGrowth,
        planDistribution,
        popularExams: popularExams.map(e => ({ name: e.name, pdfs: e._count.pdfs, quizzes: e._count.quizzes })),
        popularPDFs: popularPDFs.map(p => ({ title: p.title, views: p.viewCount, downloads: p.downloadCount })),
        quizAttemptsTrend,
      },
      tables: {
        recentRegistrations,
        recentPayments,
        topPerformingUsers: topAttempts.map(a => ({
          userId: a.userId,
          name: a.user?.name || 'Student',
          email: a.user?.email || 'N/A',
          quizTitle: a.Quiz?.title || 'Quiz',
          score: `${a.marksObtained}/${a.totalMarks}`,
          percentage: a.percentage,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// /admin/stats — alias that returns flat stats for admin dashboard frontend
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers, newUsersToday, activeSubscriptions,
      totalRevenue, totalPDFs, totalQuizzes,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.subscription.count({ where: { status: 'ACTIVE', endDate: { gte: new Date() } } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { finalAmount: true } }),
      prisma.pDF.count({ where: { isActive: true } }),
      prisma.quiz.count({ where: { isActive: true } }),
    ]);

    return sendSuccess(res, {
      totalUsers, newUsersToday, activeSubscriptions,
      totalRevenue: totalRevenue._sum.finalAmount || 0,
      totalPDFs, totalQuizzes,
    });
  } catch (err) {
    next(err);
  }
});

// Reports
router.get('/reports/revenue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'monthly' } = req.query;
    // Aggregate revenue by month
    const payments = await prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'asc' },
      select: { finalAmount: true, createdAt: true },
    });

    const grouped: Record<string, number> = {};
    for (const p of payments) {
      const key = period === 'daily'
        ? p.createdAt.toISOString().split('T')[0]
        : `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
      grouped[key] = (grouped[key] || 0) + p.finalAmount;
    }

    const data = Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

// Coupons
router.get('/coupons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return sendSuccess(res, coupons);
  } catch (err) {
    next(err);
  }
});

router.post('/coupons', [
  body('code').trim().notEmpty().toUpperCase(),
  body('type').isIn(['FLAT', 'PERCENTAGE']),
  body('value').isFloat({ min: 0 }),
], validate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await prisma.coupon.create({ data: { ...req.body, code: req.body.code.toUpperCase() } });
    return sendSuccess(res, coupon, 'Coupon created');
  } catch (err) {
    next(err);
  }
});

router.put('/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data: req.body });
    return sendSuccess(res, coupon, 'Coupon updated');
  } catch (err) {
    next(err);
  }
});

router.delete('/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.coupon.update({ where: { id: req.params.id }, data: { isActive: false } });
    return sendSuccess(res, null, 'Coupon deactivated');
  } catch (err) {
    next(err);
  }
});

// Admin Logs
router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 50;
    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.adminLog.count(),
    ]);
    return sendPaginated(res, logs, total, page, limit);
  } catch (err) {
    next(err);
  }
});

// App Settings
router.get('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.appSetting.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });
    return sendSuccess(res, settings);
  } catch (err) {
    next(err);
  }
});

router.put('/settings/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const setting = await prisma.appSetting.upsert({
      where: { key: req.params.key },
      update: { value: req.body.value },
      create: { key: req.params.key, value: req.body.value, group: req.body.group || 'general' },
    });
    return sendSuccess(res, setting, 'Setting updated');
  } catch (err) {
    next(err);
  }
});

// Question Categories (admin CRUD)
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.questionCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            questions: {
              where: { isActive: true },
            },
          },
        },
      },
    });
    return sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
});

router.post('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Category name is required' });
    
    const category = await prisma.questionCategory.upsert({
      where: { name: name.trim() },
      create: { name: name.trim(), description },
      update: { description: description || undefined },
    });
    return sendSuccess(res, category, 'Category created/retrieved', 201);
  } catch (err) {
    next(err);
  }
});

router.delete('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.questionCategory.delete({ where: { id: req.params.id } });
    return sendSuccess(res, null, 'Category deleted');
  } catch (err) {
    next(err);
  }
});

// Questions (admin CRUD)
router.get('/questions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const { search, topicId, categoryId, difficulty } = req.query;

    const where = {
      isActive: true,
      ...(topicId && { topicId: topicId as string }),
      ...(categoryId && categoryId !== 'all' && { categoryId: categoryId as string }),
      ...(difficulty && difficulty !== 'all' && { difficulty: difficulty as any }),
      ...(search && { questionText: { contains: search as string, mode: 'insensitive' as const } }),
    };

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          options: { orderBy: { sortOrder: 'asc' } },
          topic: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      }),
      prisma.question.count({ where }),
    ]);
    return sendPaginated(res, questions, total, page, limit);
  } catch (err) {
    next(err);
  }
});

router.post('/questions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { options, categoryId, ...questionData } = req.body;
    const question = await prisma.question.create({
      data: {
        ...questionData,
        ...(categoryId && { categoryId }),
        options: { create: options || [] },
      },
      include: { options: true, category: true },
    });
    return sendSuccess(res, question, 'Question created');
  } catch (err) {
    next(err);
  }
});

router.post('/questions/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId, questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Questions array is required' });
    }

    const validCategories = await prisma.questionCategory.findMany({ select: { id: true } });
    const categoryIdsSet = new Set(validCategories.map(c => c.id));
    const targetCatId = (categoryId && categoryId !== 'all' && categoryIdsSet.has(categoryId)) ? categoryId : null;

    const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
    const createdQuestions = [];

    for (const q of questions) {
      const questionText = (q.questionText || q.question || 'Untitled Question').trim();
      if (!questionText) continue;

      const rawDiff = (q.difficulty || '').toString().toUpperCase().trim();
      const difficulty = validDifficulties.includes(rawDiff) ? rawDiff as any : 'MEDIUM';

      const hasMarks = q.marks !== undefined && q.marks !== null && q.marks !== '';
      const parsedMarks = hasMarks ? parseFloat(q.marks) : NaN;
      const marks = !isNaN(parsedMarks) ? parsedMarks : 1;

      const hasNeg = q.negativeMarks !== undefined && q.negativeMarks !== null && q.negativeMarks !== '';
      const parsedNeg = hasNeg ? parseFloat(q.negativeMarks) : NaN;
      const negativeMarks = !isNaN(parsedNeg) ? parsedNeg : 0;

      const rawOptions = Array.isArray(q.options) ? q.options : [];
      const optionsToCreate = rawOptions.map((opt: any, idx: number) => ({
        optionText: (typeof opt === 'string' ? opt : opt.optionText || opt.text || `Option ${idx + 1}`).trim() || `Option ${idx + 1}`,
        isCorrect: typeof opt === 'object' ? Boolean(opt.isCorrect) : idx === (q.correctIndex || 0),
        sortOrder: idx,
      }));

      const created = await prisma.question.create({
        data: {
          questionText,
          difficulty,
          marks,
          negativeMarks,
          explanation: q.explanation ? String(q.explanation).trim() : null,
          categoryId: targetCatId || (q.categoryId && categoryIdsSet.has(q.categoryId) ? q.categoryId : null),
          options: {
            create: optionsToCreate.length > 0 ? optionsToCreate : [
              { optionText: 'Option A', isCorrect: true, sortOrder: 0 },
              { optionText: 'Option B', isCorrect: false, sortOrder: 1 },
            ],
          },
        },
        include: { options: true },
      });
      createdQuestions.push(created);
    }

    return sendSuccess(res, createdQuestions, `${createdQuestions.length} questions imported successfully`, 201);
  } catch (err) {
    console.error('Error during bulk question import:', err);
    next(err);
  }
});

router.put('/questions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { options, categoryId, ...questionData } = req.body;
    const question = await prisma.question.update({
      where: { id: req.params.id },
      data: {
        ...questionData,
        ...(categoryId !== undefined && { categoryId }),
      },
    });
    return sendSuccess(res, question, 'Question updated');
  } catch (err) {
    next(err);
  }
});

router.delete('/questions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const questionId = req.params.id;
    await prisma.$transaction([
      prisma.attemptResponse.deleteMany({ where: { questionId } }),
      prisma.quizQuestion.deleteMany({ where: { questionId } }),
      prisma.questionOption.deleteMany({ where: { questionId } }),
      prisma.question.delete({ where: { id: questionId } }),
    ]);
    return sendSuccess(res, null, 'Question deleted permanently');
  } catch (err) {
    next(err);
  }
});

// Notifications
router.post('/notifications', [
  body('title').notEmpty(),
  body('message').notEmpty(),
  body('category').notEmpty(),
], validate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await prisma.notification.create({ data: req.body });
    // If global, create for all users
    if (notification.isGlobal) {
      const users = await prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
      await prisma.userNotification.createMany({
        data: users.map(u => ({ userId: u.id, notificationId: notification.id })),
        skipDuplicates: true,
      });
    }
    return sendSuccess(res, notification, 'Notification sent');
  } catch (err) {
    next(err);
  }
});

// ─── Admin Payments ──────────────────────────────────────────────────────────

router.get('/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const { search, status, from, to } = req.query;

    const where: any = {
      ...(status && { status: status as string }),
      ...(from && { createdAt: { gte: new Date(from as string) } }),
      ...(to && { createdAt: { ...((from && { gte: new Date(from as string) }) || {}), lte: new Date(to as string) } }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search as string, mode: 'insensitive' as const } },
          { user: { OR: [{ name: { contains: search as string, mode: 'insensitive' as const } }, { email: { contains: search as string, mode: 'insensitive' as const } }] } },
        ],
      }),
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, mobile: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    // Enrich with plan names
    const planIds = [...new Set(payments.map((p: any) => p.planId).filter(Boolean))];
    let planMap: Record<string, any> = {};
    if (planIds.length > 0) {
      const plans = await prisma.subscriptionPlan.findMany({ where: { id: { in: planIds as string[] } }, select: { id: true, name: true } });
      planMap = Object.fromEntries(plans.map(p => [p.id, p]));
    }
    const enriched = payments.map((p: any) => ({ ...p, plan: p.planId ? planMap[p.planId] || null : null }));

    return sendPaginated(res, enriched, total, page, limit);
  } catch (err) { next(err); }
});

router.get('/payment-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalRevenueAgg, todayRevenueAgg, pendingCount, refundedAgg] = await Promise.all([
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { finalAmount: true } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: today } }, _sum: { finalAmount: true } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.aggregate({ where: { status: 'REFUNDED' }, _sum: { finalAmount: true }, _count: true }),
    ]);
    return sendSuccess(res, {
      totalRevenue: totalRevenueAgg._sum.finalAmount || 0,
      todayRevenue: todayRevenueAgg._sum.finalAmount || 0,
      pendingCount,
      refundedAmount: refundedAgg._sum.finalAmount || 0,
      refundedCount: refundedAgg._count,
    });
  } catch (err) { next(err); }
});

router.post('/payments/:id/refund', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status !== 'COMPLETED') throw new Error('Only completed payments can be refunded');

    await prisma.$transaction(async (tx) => {
      // Mark payment as refunded
      await tx.payment.update({
        where: { id: req.params.id },
        data: { status: 'REFUNDED' },
      });
      // Deactivate linked subscription
      await tx.subscription.updateMany({
        where: { paymentId: req.params.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });
    });

    return sendSuccess(res, null, 'Refund processed. Subscription cancelled.');
  } catch (err) { next(err); }
});

// Subscription Plan Management (admin)
router.get('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }] });
    return sendSuccess(res, plans);
  } catch (err) { next(err); }
});

function sanitizePlanData(body: any) {
  const { id, createdAt, updatedAt, _count, subscriptions, exam, ...data } = body;
  return data;
}

router.post('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await prisma.subscriptionPlan.create({ data: sanitizePlanData(req.body) });
    return sendSuccess(res, plan, 'Plan created');
  } catch (err) { next(err); }
});

router.put('/plans/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await prisma.subscriptionPlan.update({ where: { id: req.params.id }, data: sanitizePlanData(req.body) });
    return sendSuccess(res, plan, 'Plan updated');
  } catch (err) { next(err); }
});

router.delete('/plans/:id', authorize(UserRole.SUPER_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.subscriptionPlan.update({ where: { id: req.params.id }, data: { isActive: false } });
    return sendSuccess(res, null, 'Plan deactivated');
  } catch (err) { next(err); }
});

export default router;
