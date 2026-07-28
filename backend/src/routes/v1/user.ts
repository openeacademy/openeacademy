import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { imageUpload } from '../../middleware/upload';
import { uploadFile } from '../../utils/storage';
import { AppError } from '../../utils/errors';

const router = Router();

// Dashboard data for user
router.get('/dashboard', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const [
      user, activeSubscription, recentPDFs, bookmarks,
      recentAttempts, unreadNotifications,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, avatar: true, createdAt: true } }),
      prisma.subscription.findFirst({ where: { userId, status: 'ACTIVE', endDate: { gte: new Date() } }, include: { plan: true }, orderBy: { endDate: 'desc' } }),
      prisma.pDFAccess.findMany({ where: { userId }, orderBy: { lastAccessAt: 'desc' }, take: 6, include: { pdf: { select: { id: true, title: true, slug: true, thumbnailUrl: true, totalPages: true } } } }),
      prisma.bookmark.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 6, include: { pdf: { select: { id: true, title: true, slug: true, thumbnailUrl: true } } } }),
      prisma.quizAttempt.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: 5 }),
      prisma.userNotification.count({ where: { userId, isRead: false } }),
    ]);

    return sendSuccess(res, { user, activeSubscription, recentPDFs, bookmarks, recentAttempts, unreadNotifications });
  } catch (err) {
    next(err);
  }
});

// Profile update
router.put('/profile', authenticate, [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
], validate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { ...(name && { name }), ...(email && { email }) },
      select: { id: true, name: true, email: true, mobile: true, avatar: true },
    });
    return sendSuccess(res, user, 'Profile updated');
  } catch (err) {
    next(err);
  }
});

// Avatar upload
router.post('/avatar', authenticate, imageUpload.single('avatar'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Image file required', 400);
    const optimized = await sharp(req.file.buffer).resize(200, 200).webp({ quality: 85 }).toBuffer();
    const key = `avatars/${uuidv4()}.webp`;
    await uploadFile({ key, buffer: optimized, contentType: 'image/webp', acl: 'public-read' });
    await prisma.user.update({ where: { id: req.user!.userId }, data: { avatar: key } });
    return sendSuccess(res, { avatarKey: key }, 'Avatar updated');
  } catch (err) {
    next(err);
  }
});

// Change password
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], validate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user || !user.passwordHash) throw new AppError('Cannot change password', 400);
    const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Current password is incorrect', 400);
    const hash = await bcrypt.hash(req.body.newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    return sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
});

// Bookmarks
router.get('/bookmarks', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      include: { pdf: { select: { id: true, title: true, slug: true, thumbnailUrl: true } } },
    });
    return sendSuccess(res, bookmarks);
  } catch (err) {
    next(err);
  }
});

router.post('/bookmarks', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookmark = await prisma.bookmark.create({ data: { ...req.body, userId: req.user!.userId } });
    return sendSuccess(res, bookmark, 'Bookmarked');
  } catch (err) {
    next(err);
  }
});

router.delete('/bookmarks/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.bookmark.deleteMany({ where: { id: req.params.id, userId: req.user!.userId } });
    return sendSuccess(res, null, 'Bookmark removed');
  } catch (err) {
    next(err);
  }
});

// Progress
router.get('/progress', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const progress = await prisma.userProgress.findMany({
      where: { userId: req.user!.userId },
      include: { user: false },
    });
    return sendSuccess(res, progress);
  } catch (err) {
    next(err);
  }
});

// Quiz History
router.get('/attempts', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: req.user!.userId },
      orderBy: { startedAt: 'desc' },
      include: {
        Quiz: { select: { id: true, title: true, slug: true, durationMinutes: true, totalMarks: true } },
      },
    });
    return sendSuccess(res, attempts);
  } catch (err) {
    next(err);
  }
});

export default router;
