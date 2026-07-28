import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import prisma from '../../config/database';
import { validate } from '../../middleware/validate';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';
import { cacheGet, cacheSet, cacheDelPattern } from '../../config/redis';
import { UserRole } from '@prisma/client';

const router = Router();

// GET /api/v1/subjects?examId=xxx
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { examId, search } = req.query;
    const cacheKey = `subjects:${examId || 'all'}:${search || ''}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const subjects = await prisma.subject.findMany({
      where: {
        isActive: true,
        ...(examId && { examId: examId as string }),
        ...(search && { name: { contains: search as string, mode: 'insensitive' } }),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        exam: { select: { id: true, name: true, slug: true } },
        topics: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } },
        _count: { select: { pdfs: true, quizzes: true } },
      },
    });

    const resp = { success: true, message: 'Success', data: subjects };
    await cacheSet(cacheKey, JSON.stringify(resp), 300);
    return res.json(resp);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subject = await prisma.subject.findUnique({
      where: { id: req.params.id },
      include: {
        exam: { select: { id: true, name: true, slug: true } },
        topics: { orderBy: { sortOrder: 'asc' } },
        pdfs: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, slug: true, totalPages: true, s3Key: true, thumbnailUrl: true, requiresSubscription: true, fileSize: true, freePreviewPages: true, createdAt: true },
        },
        quizzes: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, slug: true, durationMinutes: true, totalMarks: true, requiresSubscription: true, passingMarks: true, createdAt: true, _count: { select: { quizQuestions: true } } },
        },
        _count: { select: { pdfs: true, quizzes: true } },
      },
    });
    if (!subject || !subject.isActive) throw new NotFoundError('Subject');
    return sendSuccess(res, subject);
  } catch (err) {
    next(err);
  }
});

function sanitizeSubjectData(body: any) {
  const { id, createdAt, updatedAt, _count, exam, topics, pdfs, quizzes, activeEnrolledCount, ...data } = body;
  return data;
}

/**
 * @swagger
 * /api/v1/subjects/admin/all:
 *   get:
 *     tags: [Subjects - Admin]
 *     summary: Get all subjects including inactive for admin management
 */
router.get(
  '/admin/all',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
      const skip = (page - 1) * limit;
      const { search, examId, status } = req.query;

      const where = {
        ...(examId && examId !== 'all' && { examId: examId as string }),
        ...(status === 'active' && { isActive: true }),
        ...(status === 'inactive' && { isActive: false }),
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' as const } },
            { slug: { contains: search as string, mode: 'insensitive' as const } },
            { exam: { name: { contains: search as string, mode: 'insensitive' as const } } },
          ],
        }),
      };

      const [subjects, total] = await Promise.all([
        prisma.subject.findMany({
          where, skip, take: limit,
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          include: {
            exam: {
              select: {
                id: true, name: true, slug: true, color: true,
                plans: { include: { _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } } } },
              },
            },
            topics: { orderBy: { sortOrder: 'asc' } },
            _count: { select: { topics: true, pdfs: true, quizzes: true } },
          },
        }),
        prisma.subject.count({ where }),
      ]);

      const enriched = subjects.map(s => ({
        ...s,
        activeEnrolledCount: s.exam?.plans?.reduce((sum, p) => sum + (p._count?.subscriptions || 0), 0) || 0,
      }));

      return sendPaginated(res, enriched, total, page, limit);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  [
    body('examId').notEmpty().withMessage('Exam ID required'),
    body('name').trim().notEmpty(),
    body('slug').trim().notEmpty().matches(/^[a-z0-9-]+$/),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { topics, ...raw } = req.body;
      const subject = await prisma.subject.create({
        data: {
          ...sanitizeSubjectData(raw),
          ...(Array.isArray(topics) && topics.length > 0 && {
            topics: {
              create: topics.map((t: any, idx: number) => ({
                name: t.name,
                description: t.description || null,
                sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : idx + 1,
              })),
            },
          }),
        },
        include: { exam: true, topics: true, _count: { select: { topics: true, pdfs: true, quizzes: true } } },
      });

      await cacheDelPattern('subjects:*');
      return sendCreated(res, subject, 'Subject created successfully');
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { topics, ...raw } = req.body;

      // Update subject fields
      const subject = await prisma.subject.update({
        where: { id: req.params.id },
        data: sanitizeSubjectData(raw),
      });

      // Synchronize inline topics if array provided
      if (Array.isArray(topics)) {
        for (const t of topics) {
          if (t.id && !t.id.startsWith('new_')) {
            await prisma.topic.update({
              where: { id: t.id },
              data: {
                name: t.name,
                description: t.description || null,
                sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : 0,
              },
            });
          } else if (t.name && t.name.trim()) {
            await prisma.topic.create({
              data: {
                subjectId: subject.id,
                name: t.name.trim(),
                description: t.description || null,
                sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : 0,
              },
            });
          }
        }
      }

      const updated = await prisma.subject.findUnique({
        where: { id: subject.id },
        include: { exam: true, topics: { orderBy: { sortOrder: 'asc' } }, _count: { select: { topics: true, pdfs: true, quizzes: true } } },
      });

      await cacheDelPattern('subjects:*');
      return sendSuccess(res, updated, 'Subject updated successfully');
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const current = await prisma.subject.findUnique({ where: { id: req.params.id }, select: { isActive: true } });
      if (!current) throw new NotFoundError('Subject');
      const updated = await prisma.subject.update({
        where: { id: req.params.id },
        data: { isActive: !current.isActive },
      });
      await cacheDelPattern('subjects:*');
      return sendSuccess(res, updated, `Subject ${updated.isActive ? 'published' : 'unpublished'}`);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/duplicate',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const original = await prisma.subject.findUnique({
        where: { id: req.params.id },
        include: { topics: true },
      });
      if (!original) throw new NotFoundError('Subject');

      const copySlug = `${original.slug}-copy-${Date.now().toString().slice(-4)}`;
      const clone = await prisma.subject.create({
        data: {
          examId: original.examId,
          name: `Copy of ${original.name}`,
          slug: copySlug,
          description: original.description,
          icon: original.icon,
          coverImage: original.coverImage,
          isActive: false,
          sortOrder: original.sortOrder + 1,
        },
      });

      if (original.topics.length > 0) {
        await prisma.topic.createMany({
          data: original.topics.map(t => ({
            subjectId: clone.id,
            name: t.name,
            description: t.description,
            sortOrder: t.sortOrder,
          })),
        });
      }

      await cacheDelPattern('subjects:*');
      return sendCreated(res, clone, 'Subject duplicated successfully');
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.subject.update({ where: { id: req.params.id }, data: { isActive: false } });
      await cacheDelPattern('subjects:*');
      return sendSuccess(res, null, 'Subject soft-deleted successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Topics management endpoints
router.post(
  '/:subjectId/topics',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const topic = await prisma.topic.create({ data: { ...req.body, subjectId: req.params.subjectId } });
      await cacheDelPattern('subjects:*');
      return sendCreated(res, topic, 'Topic created');
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/topics/:topicId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.topic.delete({ where: { id: req.params.topicId } });
      await cacheDelPattern('subjects:*');
      return sendSuccess(res, null, 'Topic deleted');
    } catch (err) {
      next(err);
    }
  }
);

export default router;
