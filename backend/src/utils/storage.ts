import { config } from '../config';
import { logger } from './logger';
import prisma from '../config/database';

export async function uploadFile(options: {
  key: string;
  buffer: Buffer;
  contentType: string;
  acl?: 'private' | 'public-read';
}): Promise<string> {
  try {
    // Upsert the file in PostgreSQL to avoid duplicate key errors
    await prisma.fileStorage.upsert({
      where: { key: options.key },
      update: {
        data: options.buffer,
        mimeType: options.contentType,
        size: options.buffer.length,
      },
      create: {
        key: options.key,
        data: options.buffer,
        mimeType: options.contentType,
        size: options.buffer.length,
      },
    });
    return options.key;
  } catch (err) {
    logger.error(`PostgreSQL upload error for ${options.key}:`, err);
    throw err;
  }
}

export function getSignedUrl(key: string, expiresIn = 3600): string {
  // Returns a relative local stream URL so it works seamlessly with Vite proxy on web
  // and gets prepended with absolute host on mobile.
  const base = process.env.APP_URL || '';
  return `${base}/api/v1/files/stream/${encodeURIComponent(key)}`;
}

export async function deleteFile(key: string): Promise<void> {
  try {
    await prisma.fileStorage.deleteMany({ where: { key } });
  } catch (err) {
    logger.error('PostgreSQL delete error:', err);
  }
}

export function getPublicUrl(key: string): string {
  const base = process.env.APP_URL || '';
  return `${base}/api/v1/files/public/${encodeURIComponent(key)}`;
}

export default { uploadFile, getSignedUrl, deleteFile, getPublicUrl };
