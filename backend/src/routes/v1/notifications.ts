import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendPaginated } from '../../utils/response';

const router = Router();

// User notifications
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const [notifications, total] = await Promise.all([
      prisma.userNotification.findMany({
        where: { userId: req.user!.userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { notification: true },
      }),
      prisma.userNotification.count({ where: { userId: req.user!.userId } }),
    ]);
    return sendPaginated(res, notifications, total, page, limit);
  } catch (err) {
    next(err);
  }
});

router.get('/unread-count', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.userNotification.count({ where: { userId: req.user!.userId, isRead: false } });
    return sendSuccess(res, { count });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.userNotification.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { isRead: true, readAt: new Date() },
    });
    return sendSuccess(res, null, 'Marked as read');
  } catch (err) {
    next(err);
  }
});

router.patch('/mark-all-read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.userNotification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return sendSuccess(res, null, 'All marked as read');
  } catch (err) {
    next(err);
  }
});

export default router;
