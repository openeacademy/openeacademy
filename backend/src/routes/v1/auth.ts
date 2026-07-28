import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/database';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendCreated, sendError } from '../../utils/response';
import { AppError, UnauthorizedError, NotFoundError, ConflictError } from '../../utils/errors';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getTokenExpiry } from '../../utils/jwt';
import { sendEmail, otpEmailTemplate } from '../../utils/email';
import { config } from '../../config';

const router = Router();

// Generate a 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register new user
 */
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email'),
    body('mobile').optional().matches(/^\d{10}$/).withMessage('Invalid 10-digit mobile number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, mobile, password, deviceInfo, ipAddress } = req.body;
      if (!email && !mobile) {
        return sendError(res, 'Email or mobile number is required', 400);
      }

      // Check duplicates
      const existing = await prisma.user.findFirst({
        where: { OR: [email ? { email } : {}, mobile ? { mobile } : {}] },
      });
      if (existing) throw new ConflictError('Account already exists with this email or mobile');

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { name, email, mobile, passwordHash },
        select: { id: true, name: true, email: true, mobile: true, role: true, status: true, avatar: true, createdAt: true },
      });

      // Send OTP for email verification
      if (email) {
        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);
        await prisma.otp.create({ data: { userId: user.id, contact: email, type: 'EMAIL_VERIFICATION', code: otp, expiresAt } });
        await sendEmail({ to: email, subject: 'Verify your email — Open E Academy', html: otpEmailTemplate(otp, name) });
      }

      // Create initial session & tokens
      const sessionId = uuidv4();
      const refreshToken = signRefreshToken({ userId: user.id, sessionId });
      const refreshExpiry = getTokenExpiry('30d');

      await prisma.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshToken,
          deviceInfo: deviceInfo || req.headers['user-agent'],
          ipAddress: ipAddress || req.ip,
          userAgent: req.headers['user-agent'],
          expiresAt: refreshExpiry,
        },
      });

      const accessToken = signAccessToken({ userId: user.id, role: user.role, email: user.email || undefined, mobile: user.mobile || undefined });

      return sendCreated(res, { user, accessToken, refreshToken }, 'Registration successful. Please verify your email.');
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email/mobile and password
 */
router.post(
  '/login',
  [
    body('identifier').notEmpty().withMessage('Email or mobile is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identifier, password, rememberMe = false, deviceInfo, ipAddress } = req.body;

      const isEmail = identifier.includes('@');
      const user = await prisma.user.findFirst({
        where: isEmail ? { email: identifier } : { mobile: identifier },
      });

      if (!user || !user.passwordHash) {
        throw new UnauthorizedError('Invalid credentials');
      }

      if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
        throw new UnauthorizedError(`Account is ${user.status.toLowerCase()}`);
      }

      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) throw new UnauthorizedError('Invalid credentials');

      // Create session
      const sessionId = uuidv4();
      const refreshToken = signRefreshToken({ userId: user.id, sessionId });
      const refreshExpiry = rememberMe ? getTokenExpiry('30d') : getTokenExpiry('7d');

      await prisma.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshToken,
          deviceInfo: deviceInfo || req.headers['user-agent'],
          ipAddress: ipAddress || req.ip,
          userAgent: req.headers['user-agent'],
          expiresAt: refreshExpiry,
        },
      });

      // Update last login
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      // Activity log
      await prisma.activityLog.create({
        data: { userId: user.id, action: 'LOGIN', ipAddress: req.ip, userAgent: req.headers['user-agent'] },
      });

      const accessToken = signAccessToken({ userId: user.id, role: user.role, email: user.email || undefined, mobile: user.mobile || undefined });

      return sendSuccess(res, {
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role, avatar: user.avatar },
      }, 'Login successful');
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new UnauthorizedError('Refresh token required');

    const payload = verifyRefreshToken(refreshToken);
    const session = await prisma.session.findUnique({ where: { refreshToken } });

    if (!session || session.userId !== payload.userId || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new UnauthorizedError('User not found');

    const newAccessToken = signAccessToken({ userId: user.id, role: user.role, email: user.email || undefined });
    return sendSuccess(res, { accessToken: newAccessToken }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 */
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.session.deleteMany({ where: { refreshToken, userId: req.user!.userId } });
    }
    await prisma.activityLog.create({
      data: { userId: req.user!.userId, action: 'LOGOUT', ipAddress: req.ip },
    });
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP to email or mobile
 */
router.post(
  '/send-otp',
  [body('contact').notEmpty().withMessage('Contact is required'), body('type').notEmpty()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contact, type } = req.body;
      const user = await prisma.user.findFirst({ where: { OR: [{ email: contact }, { mobile: contact }] } });
      const userId = user?.id;

      // Rate limit: max 3 OTPs per 10 minutes
      const recentOtps = await prisma.otp.count({
        where: { contact, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
      });
      if (recentOtps >= 3) {
        return sendError(res, 'Too many OTP requests. Please wait 10 minutes.', 429);
      }

      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);
      await prisma.otp.create({ data: { userId, contact, type, code: otp, expiresAt } });

      if (contact.includes('@')) {
        await sendEmail({ to: contact, subject: 'Your OTP — Open E Academy', html: otpEmailTemplate(otp, user?.name || 'User') });
      }

      return sendSuccess(res, { expiryMinutes: config.otp.expiryMinutes }, 'OTP sent successfully');
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP
 */
router.post(
  '/verify-otp',
  [
    body('contact').notEmpty(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('type').notEmpty(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contact, otp, type } = req.body;
      const record = await prisma.otp.findFirst({
        where: { contact, code: otp, type, used: false, expiresAt: { gte: new Date() } },
        orderBy: { createdAt: 'desc' },
      });

      if (!record) throw new AppError('Invalid or expired OTP', 400);

      await prisma.otp.update({ where: { id: record.id }, data: { used: true } });

      // Update user verification status
      if (record.userId) {
        if (type === 'EMAIL_VERIFICATION') {
          await prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true, status: 'ACTIVE' } });
        } else if (type === 'MOBILE_VERIFICATION') {
          await prisma.user.update({ where: { id: record.userId }, data: { mobileVerified: true, status: 'ACTIVE' } });
        }
      }

      return sendSuccess(res, { verified: true }, 'OTP verified successfully');
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Send password reset OTP
 */
router.post(
  '/forgot-password',
  [body('contact').notEmpty()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contact } = req.body;
      const user = await prisma.user.findFirst({ where: { OR: [{ email: contact }, { mobile: contact }] } });
      // Always return success to prevent user enumeration
      if (user) {
        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);
        await prisma.otp.create({ data: { userId: user.id, contact, type: 'PASSWORD_RESET', code: otp, expiresAt } });
        if (contact.includes('@')) {
          await sendEmail({ to: contact, subject: 'Reset Password — Open E Academy', html: otpEmailTemplate(otp, user.name) });
        }
      }
      return sendSuccess(res, null, 'If the account exists, a reset code has been sent');
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using OTP
 */
router.post(
  '/reset-password',
  [
    body('contact').notEmpty(),
    body('otp').isLength({ min: 6, max: 6 }),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contact, otp, newPassword } = req.body;
      const record = await prisma.otp.findFirst({
        where: { contact, code: otp, type: 'PASSWORD_RESET', used: false, expiresAt: { gte: new Date() } },
        orderBy: { createdAt: 'desc' },
      });
      if (!record || !record.userId) throw new AppError('Invalid or expired OTP', 400);

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
      await prisma.otp.update({ where: { id: record.id }, data: { used: true } });
      // Invalidate all sessions
      await prisma.session.deleteMany({ where: { userId: record.userId } });

      return sendSuccess(res, null, 'Password reset successfully');
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security: [{ BearerAuth: [] }]
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, name: true, email: true, mobile: true, avatar: true,
        role: true, status: true, emailVerified: true, mobileVerified: true,
        createdAt: true, lastLoginAt: true,
        subscriptions: {
          where: { status: 'ACTIVE', endDate: { gte: new Date() } },
          include: { plan: { select: { name: true, type: true, duration: true } } },
          orderBy: { endDate: 'desc' },
          take: 5,
        },
      },
    });
    if (!user) throw new NotFoundError('User');
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/sessions:
 *   get:
 *     tags: [Auth]
 *     summary: List active sessions
 *     security: [{ BearerAuth: [] }]
 */
router.get('/sessions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.userId, expiresAt: { gte: new Date() } },
      select: { id: true, deviceInfo: true, ipAddress: true, createdAt: true, expiresAt: true },
    });
    return sendSuccess(res, sessions);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/sessions/{id}:
 *   delete:
 *     tags: [Auth]
 *     summary: Revoke a session
 *     security: [{ BearerAuth: [] }]
 */
router.delete('/sessions/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.session.deleteMany({ where: { id: req.params.id, userId: req.user!.userId } });
    return sendSuccess(res, null, 'Session revoked');
  } catch (err) {
    next(err);
  }
});

export default router;
