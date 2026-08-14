import { Router, Request, Response, NextFunction } from 'express';
import { body, query } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
const pdfParse = require('pdf-parse');
import prisma from '../../config/database';
import { validate } from '../../middleware/validate';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth';
import { pdfUpload, imageUpload } from '../../middleware/upload';
import { sendSuccess, sendPaginated, sendCreated } from '../../utils/response';
import { NotFoundError, ForbiddenError, AppError } from '../../utils/errors';
import { uploadFile, getSignedUrl, deleteFile } from '../../utils/storage';
import { cacheGet, cacheSet, cacheDelPattern } from '../../config/redis';
import { UserRole } from '@prisma/client';

import { hasUserFeature } from './subscriptions';

const router = Router();

// Helper: check if user has active subscription with specific feature
async function hasActiveSubscription(userId: string, featureKey?: string): Promise<boolean> {
  return hasUserFeature(userId, featureKey);
}

/**
 * @swagger
 * /api/v1/pdfs:
 *   get:
 *     tags: [PDFs]
 *     summary: List PDFs with filtering
 */
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const { examId, subjectId, language, search, featured } = req.query;

    // When filtering by subjectId, use OR logic:
    //   - PDFs explicitly assigned to this subject, OR
    //   - PDFs assigned to the exam (examId) but with NO subject set (uncategorized exam PDFs)
    // This ensures uploaded PDFs always appear even if subjectId wasn't saved correctly.
    let where: any = { isActive: true };

    if (subjectId) {
      const subjectCondition: any[] = [{ subjectId: subjectId as string }];
      // Fetch the subject's examId so we can include unassigned exam PDFs
      if (examId) {
        subjectCondition.push({
          examId: examId as string,
          subjectId: null,
        });
      } else {
        // Look up subject's examId from DB
        const subject = await prisma.subject.findUnique({
          where: { id: subjectId as string },
          select: { examId: true },
        });
        if (subject?.examId) {
          subjectCondition.push({
            examId: subject.examId,
            subjectId: null,
          });
        }
      }
      where.OR = subjectCondition;
    } else {
      if (examId) where.examId = examId as string;
    }

    if (language) where.language = language as any;
    if (featured === 'true') where.isFeatured = true;
    if (search) where.title = { contains: search as string, mode: 'insensitive' as const };

    const [pdfs, total] = await Promise.all([
      prisma.pDF.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true, title: true, slug: true, description: true, thumbnailUrl: true,
          totalPages: true, fileSize: true, language: true, author: true,
          publishedAt: true, tags: true, freePreviewPages: true,
          requiresSubscription: true, allowDownload: true, viewCount: true,
          downloadCount: true, isFeatured: true, createdAt: true,
          exam: { select: { id: true, name: true, slug: true } },
          subject: { select: { id: true, name: true } },
        },
      }),
      prisma.pDF.count({ where }),
    ]);

    return sendPaginated(res, pdfs, total, page, limit);
  } catch (err) {
    next(err);
  }

});

/**
 * @swagger
 * /api/v1/pdfs/{slug}:
 *   get:
 *     tags: [PDFs]
 *     summary: Get PDF metadata by slug
 */
router.get('/:slug', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pdf = await prisma.pDF.findUnique({
      where: { slug: req.params.slug },
      include: {
        exam: { select: { id: true, name: true, slug: true } },
        subject: { select: { id: true, name: true } },
        seo: true,
      },
    });
    if (!pdf || !pdf.isActive) throw new NotFoundError('PDF');

    // Increment view count
    await prisma.pDF.update({ where: { id: pdf.id }, data: { viewCount: { increment: 1 } } });

    // Track access
    if (req.user) {
      await prisma.pDFAccess.upsert({
        where: { userId_pdfId: { userId: req.user.userId, pdfId: pdf.id } },
        update: { lastAccessAt: new Date(), accessCount: { increment: 1 } },
        create: { userId: req.user.userId, pdfId: pdf.id },
      });
    }

    // Don't expose S3 key
    const { s3Key, ...pdfData } = pdf as any;
    return sendSuccess(res, pdfData);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/pdfs/{id}/stream:
 *   get:
 *     tags: [PDFs]
 *     summary: Get signed URL for PDF page range (enforces preview limit)
 *     security: [{ BearerAuth: [] }]
 */
router.get('/:id/stream', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pdf = await prisma.pDF.findUnique({ where: { id: req.params.id } });
    if (!pdf || !pdf.isActive) throw new NotFoundError('PDF');

    const requestedPage = parseInt(req.query.page as string) || 1;
    const isSubscribed = await hasActiveSubscription(req.user!.userId, 'access_all_pdfs');

    // Enforce preview limit
    if (pdf.requiresSubscription && !isSubscribed) {
      if (requestedPage > pdf.freePreviewPages) {
        return res.status(402).json({
          success: false,
          message: 'Subscription required to access this page',
          code: 'SUBSCRIPTION_REQUIRED',
          freePreviewPages: pdf.freePreviewPages,
          currentPage: requestedPage,
        });
      }
    }

    // Generate signed URL with short TTL
    const signedUrl = getSignedUrl(pdf.s3Key, 300); // 5 minutes

    // Update reading progress
    await prisma.pDFAccess.upsert({
      where: { userId_pdfId: { userId: req.user!.userId, pdfId: pdf.id } },
      update: {
        lastPage: requestedPage,
        lastAccessAt: new Date(),
        isUnlocked: isSubscribed,
        readingProgress: pdf.totalPages ? (requestedPage / pdf.totalPages) * 100 : 0,
      },
      create: { userId: req.user!.userId, pdfId: pdf.id, lastPage: requestedPage, isUnlocked: isSubscribed },
    });

    return sendSuccess(res, {
      signedUrl,
      page: requestedPage,
      totalPages: pdf.totalPages,
      freePreviewPages: pdf.freePreviewPages,
      isSubscribed,
      watermark: pdf.watermarkText,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/pdfs/{id}/download:
 *   get:
 *     tags: [PDFs]
 *     summary: Download PDF document (verifies subscription or permission)
 *     security: [{ BearerAuth: [] }]
 */
router.get('/:id/download', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pdf = await prisma.pDF.findUnique({ where: { id: req.params.id } });
    if (!pdf || !pdf.isActive) throw new NotFoundError('PDF');

    const canDownload = await hasActiveSubscription(req.user!.userId, 'download_pdfs');
    if (pdf.requiresSubscription && !canDownload && !pdf.allowDownload) {
      return res.status(402).json({
        success: false,
        message: 'A plan with PDF Downloads enabled is required to download this document.',
        code: 'FEATURE_NOT_IN_PLAN',
      });
    }

    // Increment download count
    await prisma.pDF.update({ where: { id: pdf.id }, data: { downloadCount: { increment: 1 } } });

    // Generate signed stream URL for direct download
    const downloadUrl = getSignedUrl(pdf.s3Key, 3600);

    return sendSuccess(res, {
      downloadUrl,
      filename: `${pdf.slug || 'study-note'}.pdf`,
      title: pdf.title,
    });
  } catch (err) {
    next(err);
  }
});


/**
 * @swagger
 * /api/v1/pdfs (POST):
 *   post:
 *     tags: [PDFs - Admin]
 *     summary: Upload new PDF
 *     security: [{ BearerAuth: [] }]
 */
// ─── Admin Routes ─────────────────────────────────────────────────────────────

function sanitizePdfData(body: any) {
  const { id, createdAt, updatedAt, _count, exam, subject, s3Key, bookmarks, highlights, accessLogs, seo, fileUrl, ...data } = body;
  return data;
}

/**
 * @swagger
 * /api/v1/pdfs/admin/all:
 *   get:
 *     tags: [PDFs - Admin]
 *     summary: Get all study notes & PDFs for admin management
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
      const { search, examId, subjectId, access, status } = req.query;

      const where = {
        ...(examId && examId !== 'all' && { examId: examId as string }),
        ...(subjectId && subjectId !== 'all' && { subjectId: subjectId as string }),
        ...(status === 'active' && { isActive: true }),
        ...(status === 'inactive' && { isActive: false }),
        ...(access === 'free' && { requiresSubscription: false }),
        ...(access === 'paid' && { requiresSubscription: true }),
        ...(search && {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' as const } },
            { slug: { contains: search as string, mode: 'insensitive' as const } },
            { author: { contains: search as string, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [pdfs, total] = await Promise.all([
        prisma.pDF.findMany({
          where, skip, take: limit,
          orderBy: [{ createdAt: 'desc' }],
          include: {
            exam: { select: { id: true, name: true, slug: true, color: true } },
            subject: { select: { id: true, name: true, slug: true } },
            _count: { select: { bookmarks: true, accesses: true } },
          },
        }),
        prisma.pDF.count({ where }),
      ]);

      return sendPaginated(res, pdfs, total, page, limit);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/pdfs/admin/upload-file:
 *   post:
 *     tags: [PDFs - Admin]
 *     summary: Upload a PDF file and get the S3 key
 */
router.post(
  '/admin/upload-file',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  pdfUpload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('PDF file is required', 400);

      // Parse PDF to get total pages
      let totalPages = 1;
      try {
        const parsed = await pdfParse(req.file.buffer);
        if (parsed && parsed.numpages) {
          totalPages = parsed.numpages;
        }
      } catch (parseErr) {
        console.warn('Failed to parse PDF for page count:', parseErr);
      }

      // Regex fallback if pdf-parse returned 1 or failed
      if (totalPages <= 1) {
        try {
          const str = req.file.buffer.toString('binary');
          const matches = [...str.matchAll(/\/Count\s+(\d+)/g)];
          if (matches.length > 0) {
            const counts = matches.map(m => parseInt(m[1], 10)).filter(n => !isNaN(n));
            if (counts.length > 0) {
              totalPages = Math.max(...counts);
            }
          }
        } catch {}
      }

      const s3Key = `pdfs/${uuidv4()}-${Date.now()}.pdf`;
      await uploadFile({ key: s3Key, buffer: req.file.buffer, contentType: 'application/pdf' });
      
      return sendSuccess(res, { s3Key, fileSize: req.file.size, totalPages }, 'File uploaded successfully');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/pdfs/admin/json:
 *   post:
 *     tags: [PDFs - Admin]
 *     summary: Create PDF metadata from URL/S3Key or JSON form
 */
router.post(
  '/admin/json',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileUrl, s3Key, ...raw } = req.body;
      const key = s3Key || fileUrl || `pdfs/${uuidv4()}.pdf`;
      const sanitized = sanitizePdfData(raw);
      let finalSlug = sanitized.slug;
      if (finalSlug) {
        const exists = await prisma.pDF.findUnique({ where: { slug: finalSlug } });
        if (exists) {
          finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
        }
      }

      const pdf = await prisma.pDF.create({
        data: {
          ...sanitized,
          ...(finalSlug && { slug: finalSlug }),
          s3Key: key,
          totalPages: Number(raw.totalPages) || 1,
          fileSize: Number(raw.fileSize) || 102400,
          freePreviewPages: Number(raw.freePreviewPages) || 3,
        },
        include: { exam: true, subject: true },
      });
      await cacheDelPattern('pdfs:*');
      await cacheDelPattern('exam:*');
      await cacheDelPattern('exams:*');
      return sendCreated(res, pdf, 'Study note created successfully');
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  pdfUpload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('PDF file is required', 400);

      const {
        title, slug, description, examId, subjectId, language = 'ENGLISH',
        freePreviewPages = '10', requiresSubscription = 'true',
        allowDownload = 'false', watermarkText, author, tags, totalPages = '10',
      } = req.body;

      if (!title || !slug) throw new AppError('Title and slug are required', 400);

      // Parse PDF to get accurate total pages
      let actualTotalPages = parseInt(totalPages) || 10;
      try {
        const parsed = await pdfParse(req.file.buffer);
        if (parsed && parsed.numpages) {
          actualTotalPages = parsed.numpages;
        }
      } catch (parseErr) {
        console.warn('Failed to parse PDF for page count:', parseErr);
      }

      const s3Key = `pdfs/${uuidv4()}-${Date.now()}.pdf`;
      await uploadFile({ key: s3Key, buffer: req.file.buffer, contentType: 'application/pdf' });

      let finalSlug = slug;
      const exists = await prisma.pDF.findUnique({ where: { slug: finalSlug } });
      if (exists) {
        finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
      }

      const pdf = await prisma.pDF.create({
        data: {
          title, slug: finalSlug, description, examId: examId || null, subjectId: subjectId || null,
          s3Key, fileSize: req.file.size, totalPages: actualTotalPages,
          language: language as any,
          freePreviewPages: parseInt(freePreviewPages) || 3,
          requiresSubscription: requiresSubscription === 'true',
          allowDownload: allowDownload === 'true',
          watermarkText: watermarkText || null,
          author: author || null,
          tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
        },
      });

      await cacheDelPattern('pdfs:*');
      await cacheDelPattern('exam:*');
      await cacheDelPattern('exams:*');
      return sendCreated(res, { ...pdf, s3Key: undefined }, 'PDF uploaded successfully');
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
      const { fileUrl, s3Key, ...raw } = req.body;
      const updateData: any = { ...sanitizePdfData(raw) };
      if (s3Key || fileUrl) updateData.s3Key = s3Key || fileUrl;
      if (raw.totalPages !== undefined) updateData.totalPages = Number(raw.totalPages) || 1;
      if (raw.fileSize !== undefined) updateData.fileSize = Number(raw.fileSize) || 102400;
      if (raw.freePreviewPages !== undefined) updateData.freePreviewPages = Number(raw.freePreviewPages) || 0;

      if (updateData.slug) {
        const exists = await prisma.pDF.findUnique({ where: { slug: updateData.slug } });
        if (exists && exists.id !== req.params.id) {
          updateData.slug = `${updateData.slug}-${Date.now().toString().slice(-4)}`;
        }
      }

      const pdf = await prisma.pDF.update({ where: { id: req.params.id }, data: updateData });
      await cacheDelPattern('pdfs:*');
      await cacheDelPattern('exam:*');
      await cacheDelPattern('exams:*');
      return sendSuccess(res, pdf, 'Study note updated successfully');
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
      const current = await prisma.pDF.findUnique({ where: { id: req.params.id }, select: { isActive: true } });
      if (!current) throw new NotFoundError('PDF');
      const updated = await prisma.pDF.update({
        where: { id: req.params.id },
        data: { isActive: !current.isActive },
      });
      await cacheDelPattern('pdfs:*');
      await cacheDelPattern('exam:*');
      await cacheDelPattern('exams:*');
      return sendSuccess(res, updated, `Study note ${updated.isActive ? 'published' : 'unpublished'}`);
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
      const original = await prisma.pDF.findUnique({ where: { id: req.params.id } });
      if (!original) throw new NotFoundError('PDF');

      const copySlug = `${original.slug}-copy-${Date.now().toString().slice(-4)}`;
      const clone = await prisma.pDF.create({
        data: {
          title: `Copy of ${original.title}`,
          slug: copySlug,
          description: original.description,
          examId: original.examId,
          subjectId: original.subjectId,
          s3Key: original.s3Key,
          thumbnailUrl: original.thumbnailUrl,
          totalPages: original.totalPages,
          fileSize: original.fileSize,
          language: original.language,
          author: original.author,
          tags: original.tags,
          freePreviewPages: original.freePreviewPages,
          requiresSubscription: original.requiresSubscription,
          allowDownload: original.allowDownload,
          watermarkText: original.watermarkText,
          isActive: false,
          isFeatured: false,
        },
      });
      await cacheDelPattern('pdfs:*');
      await cacheDelPattern('exam:*');
      await cacheDelPattern('exams:*');
      return sendCreated(res, clone, 'Study note duplicated successfully');
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
      await prisma.pDF.update({ where: { id: req.params.id }, data: { isActive: false } });
      await cacheDelPattern('pdfs:*');
      await cacheDelPattern('exam:*');
      await cacheDelPattern('exams:*');
      return sendSuccess(res, null, 'Study note soft-deleted successfully');
    } catch (err) {
      next(err);
    }
  }
);

// Thumbnail upload
router.post(
  '/:id/thumbnail',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER),
  imageUpload.single('thumbnail'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('Image file is required', 400);
      const optimized = await sharp(req.file.buffer).resize(400, 565).webp({ quality: 85 }).toBuffer();
      const key = `thumbnails/${uuidv4()}.webp`;
      await uploadFile({ key, buffer: optimized, contentType: 'image/webp', acl: 'public-read' });
      const pdf = await prisma.pDF.update({ where: { id: req.params.id }, data: { thumbnailUrl: key } });
      return sendSuccess(res, { thumbnailUrl: key }, 'Thumbnail uploaded');
    } catch (err) {
      next(err);
    }
  },
);

export default router;
