import multer from 'multer';
import path from 'path';
import { AppError } from '../utils/errors';

const ALLOWED_PDF_TYPES = ['application/pdf'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const memoryStorage = multer.memoryStorage();

export const pdfUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_PDF_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_PDF_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF files are allowed', 400) as any);
    }
  },
});

export const imageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files (JPEG, PNG, WebP, SVG) are allowed', 400) as any);
    }
  },
});

export const csvUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError('Only CSV/Excel files are allowed', 400) as any);
    }
  },
});
