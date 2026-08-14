import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param } from 'express-validator';
import prisma from '../../config/database';
import { validate } from '../../middleware/validate';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth';
import { sendSuccess, sendPaginated, sendCreated, sendError } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';
import { cacheGet, cacheSet, cacheDelPattern } from '../../config/redis';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * @swagger
 * /api/v1/exams:
 *   get:
 *     tags: [Exams]
 *     summary: Get all active exams
 */
router.get(
  '/',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
      const skip = (page - 1) * limit;
      const featured = req.query.featured === 'true';
      const search = req.query.search as string;

      const cacheKey = `exams:list:${page}:${limit}:${featured}:${search || ''}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return res.json(JSON.parse(cached));

      const where = {
        isActive: true,
        ...(featured && { isFeatured: true }),
        ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
      };

      const [exams, total] = await Promise.all([
        prisma.exam.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            _count: { select: { subjects: true, pdfs: true, quizzes: true } },
            seo: { select: { title: true, description: true } },
          },
        }),
        prisma.exam.count({ where }),
      ]);

      const response = {
        success: true, message: 'Success',
        data: exams,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
      await cacheSet(cacheKey, JSON.stringify(response), 300);
      return res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/v1/exams/{slug}:
 *   get:
 *     tags: [Exams]
 *     summary: Get exam by slug
 */
router.get('/:slug', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cached = await cacheGet(`exam:${req.params.slug}`);
    if (cached) return res.json(JSON.parse(cached));

    const exam = await prisma.exam.findUnique({
      where: { slug: req.params.slug },
      include: {
        subjects: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: { pdfs: true, quizzes: true } } },
        },
        plans: { where: { isActive: true }, orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }] },
        faqs: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
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
        seo: true,
        _count: { select: { pdfs: true, quizzes: true, subjects: true } },
      },
    });

    if (!exam || !exam.isActive) throw new NotFoundError('Exam');

    // Count exam-level PDFs (subjectId is null) to distribute across subjects as fallback
    const examLevelPdfCount = await prisma.pDF.count({
      where: { examId: exam.id, subjectId: null, isActive: true },
    });

    // Attach effectivePdfCount = actual subject pdfs + share of unassigned exam pdfs
    const enrichedSubjects = exam.subjects.map((s: any, idx: number) => ({
      ...s,
      _count: {
        ...s._count,
        // If subject has 0 pdfs but exam has unassigned pdfs, show them on the first subject
        // This is a soft fallback; proper fix is to assign PDFs to subjects in admin.
        pdfs: s._count.pdfs > 0
          ? s._count.pdfs
          : idx === 0 && examLevelPdfCount > 0
            ? examLevelPdfCount
            : 0,
      },
    }));

    const response = { success: true, message: 'Success', data: { ...exam, subjects: enrichedSubjects } };
    await cacheSet(`exam:${req.params.slug}`, JSON.stringify(response), 300);
    return res.json(response);
  } catch (err) {
    next(err);
  }
});


// ─── Admin Routes ─────────────────────────────────────────────────────────────

function sanitizeExamData(body: any) {
  const {
    id, createdAt, updatedAt, _count, subjectsCount, pdfsCount, quizzesCount,
    subjects, pdfs, quizzes, plans, notifications, faqs, seo, activeEnrolledCount,
    ...data
  } = body;
  return data;
}

/**
 * @swagger
 * /api/v1/exams/admin/all:
 *   get:
 *     tags: [Exams - Admin]
 *     summary: Get all exams including inactive/soft-deleted for admin list
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
      const { search, status } = req.query;

      const where = {
        ...(status === 'active' && { isActive: true }),
        ...(status === 'inactive' && { isActive: false }),
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' as const } },
            { slug: { contains: search as string, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [exams, total] = await Promise.all([
        prisma.exam.findMany({
          where, skip, take: limit,
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          include: {
            _count: { select: { subjects: true, pdfs: true, quizzes: true } },
            seo: true,
            plans: { include: { _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } } } },
          },
        }),
        prisma.exam.count({ where }),
      ]);

      const enriched = exams.map(e => ({
        ...e,
        activeEnrolledCount: e.plans.reduce((sum, p) => sum + (p._count.subscriptions || 0), 0),
      }));

      return sendPaginated(res, enriched, total, page, limit);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/exams:
 *   post:
 *     tags: [Exams - Admin]
 *     summary: Create exam with optional inline SEO and subjects
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  [
    body('name').trim().notEmpty().withMessage('Exam name is required'),
    body('slug').trim().notEmpty(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { seo, subjects, ...raw } = req.body;
      const examData = sanitizeExamData(raw);
      let finalSlug = examData.slug || `exam-${Date.now()}`;
      const exists = await prisma.exam.findUnique({ where: { slug: finalSlug } });
      if (exists) {
        finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
      }
      
      const exam = await prisma.exam.create({
        data: {
          ...examData,
          slug: finalSlug,
          ...(seo && {
            seo: {
              create: {
                title: seo.title || raw.name,
                description: seo.description || raw.description || '',
                keywords: Array.isArray(seo.keywords) ? seo.keywords : [],
                canonical: seo.canonical || undefined,
                ogImage: seo.ogImage || raw.banner || undefined,
              },
            },
          }),
        },
        include: { seo: true, _count: { select: { subjects: true, pdfs: true, quizzes: true } } },
      });

      // Quick create subjects if provided
      if (Array.isArray(subjects) && subjects.length > 0) {
        for (const sub of subjects) {
          if (typeof sub === 'string' && sub.trim()) {
            const sanitizedSubSlug = sub.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
            const subSlug = `${exam.slug}-${sanitizedSubSlug}`;
            await prisma.subject.upsert({
              where: { examId_slug: { examId: exam.id, slug: subSlug } },
              update: {},
              create: { examId: exam.id, name: sub.trim(), slug: subSlug, isActive: true },
            });
          }
        }
      }

      await cacheDelPattern('exams:*');
      return sendCreated(res, exam, 'Exam created successfully');
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
      const { seo, subjects, ...raw } = req.body;
      const examData = sanitizeExamData(raw);
      let finalSlug = examData.slug;
      if (finalSlug) {
        const exists = await prisma.exam.findUnique({ where: { slug: finalSlug } });
        if (exists && exists.id !== req.params.id) {
          finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
        }
        examData.slug = finalSlug;
      }

      const exam = await prisma.exam.update({
        where: { id: req.params.id },
        data: {
          ...examData,
          ...(seo && {
            seo: {
              upsert: {
                create: {
                  title: seo.title || raw.name || 'Exam',
                  description: seo.description || '',
                  keywords: Array.isArray(seo.keywords) ? seo.keywords : [],
                  canonical: seo.canonical || undefined,
                  ogImage: seo.ogImage || raw.banner || undefined,
                },
                update: {
                  title: seo.title,
                  description: seo.description,
                  keywords: Array.isArray(seo.keywords) ? seo.keywords : [],
                  canonical: seo.canonical,
                  ogImage: seo.ogImage,
                },
              },
            },
          }),
        },
        include: { seo: true, _count: { select: { subjects: true, pdfs: true, quizzes: true } } },
      });

      await cacheDelPattern('exams:*');
      await cacheDelPattern(`exam:*`);
      return sendSuccess(res, exam, 'Exam updated successfully');
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
      const current = await prisma.exam.findUnique({ where: { id: req.params.id }, select: { isActive: true } });
      if (!current) throw new NotFoundError('Exam');
      const updated = await prisma.exam.update({
        where: { id: req.params.id },
        data: { isActive: !current.isActive },
      });
      await cacheDelPattern('exams:*');
      return sendSuccess(res, updated, `Exam ${updated.isActive ? 'published' : 'unpublished'}`);
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
      const original = await prisma.exam.findUnique({
        where: { id: req.params.id },
        include: { subjects: true, seo: true },
      });
      if (!original) throw new NotFoundError('Exam');

      const copyName = `Copy of ${original.name}`;
      const copySlug = `${original.slug}-copy-${Date.now().toString().slice(-4)}`;

      const clone = await prisma.exam.create({
        data: {
          name: copyName,
          slug: copySlug,
          description: original.description,
          banner: original.banner,
          icon: original.icon,
          color: original.color,
          isActive: false, // Start disabled/draft per best practices
          isFeatured: false,
          sortOrder: original.sortOrder + 1,
          ...(original.seo && {
            seo: {
              create: {
                title: `Copy of ${original.seo.title || original.name}`,
                description: original.seo.description,
                keywords: original.seo.keywords,
              },
            },
          }),
        },
      });

      // Clone subjects if any
      if (original.subjects.length > 0) {
        for (const sub of original.subjects) {
          await prisma.subject.create({
            data: {
              examId: clone.id,
              name: sub.name,
              slug: `${copySlug}-${sub.slug.split('-').pop()}`,
              description: sub.description,
              icon: sub.icon,
              coverImage: sub.coverImage,
              isActive: sub.isActive,
              sortOrder: sub.sortOrder,
            },
          });
        }
      }

      await cacheDelPattern('exams:*');
      return sendCreated(res, clone, 'Exam duplicated successfully');
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
      await prisma.exam.update({ where: { id: req.params.id }, data: { isActive: false } });
      await cacheDelPattern('exams:*');
      return sendSuccess(res, null, 'Exam soft-deleted successfully');
    } catch (err) {
      next(err);
    }
  }
);

export default router;
