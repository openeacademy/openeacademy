import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

const router = Router();

/**
 * @swagger
 * /api/v1/files/stream/{key}:
 *   get:
 *     tags: [Files]
 *     summary: Serve a file stored in Postgres
 */
router.get('/stream/*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = decodeURIComponent((req.params as any)[0] || '');
    const file = await prisma.fileStorage.findUnique({
      where: { key }
    });
    
    if (!file) throw new NotFoundError('File not found in storage');

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size.toString());
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(file.data);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/files/public/{key}:
 *   get:
 *     tags: [Files]
 *     summary: Serve a public file (like thumbnails) stored in Postgres
 */
router.get('/public/*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = decodeURIComponent((req.params as any)[0] || '');
    const file = await prisma.fileStorage.findUnique({
      where: { key }
    });
    
    if (!file) throw new NotFoundError('Public file not found in storage');

    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size.toString());
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(file.data);
  } catch (err) {
    next(err);
  }
});

export default router;
