import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { body } from 'express-validator';
import prisma from '../../config/database';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { NotFoundError, AppError } from '../../utils/errors';
import { getRazorpayInstance, getRazorpayConfig } from '../../utils/razorpay';
import { UserRole } from '@prisma/client';
import { sendEmail } from '../../utils/email';
import { config } from '../../config';

const router = Router();

// ─── Subscription Plans ───────────────────────────────────────────────────────

router.get('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { examId } = req.query;
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        ...(examId ? { examId: examId as string } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
      include: { exam: { select: { id: true, name: true } } },
    });
    return sendSuccess(res, plans);
  } catch (err) {
    next(err);
  }
});

router.get('/my', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true, payment: { select: { id: true, finalAmount: true, status: true, createdAt: true } } },
    });
    return sendSuccess(res, subscriptions);
  } catch (err) {
    next(err);
  }
});

// Helper: check if user has active subscription with a specific feature
export async function hasUserFeature(userId: string, featureKey?: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE', endDate: { gte: new Date() } },
    include: { plan: true },
  });
  if (!sub) return false;
  if (!featureKey) return true;
  const features = (sub.plan?.features as string[]) || [];
  return features.includes(featureKey);
}

// ─── Coupon Validation ────────────────────────────────────────────────────────
router.post('/validate-coupon', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, planId } = req.body;
    if (!code || !planId) throw new AppError('Coupon code and Plan ID are required', 400);

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) throw new NotFoundError('Subscription Plan');

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive || (coupon.expiresAt && coupon.expiresAt < new Date())) {
      throw new AppError('Invalid or expired coupon code', 400);
    }

    if (plan.discountedPrice < coupon.minPurchase) {
      throw new AppError(`Minimum purchase of ₹${coupon.minPurchase} required for coupon ${coupon.code}`, 400);
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new AppError('Coupon usage limit reached', 400);
    }

    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (plan.discountedPrice * coupon.value) / 100;
      if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    } else {
      discountAmount = coupon.value;
    }

    const baseAmount = Math.max(0, plan.discountedPrice - discountAmount);
    const gstAmount = (baseAmount * plan.gstPercent) / 100;
    const finalAmount = baseAmount + gstAmount;

    return sendSuccess(res, {
      valid: true,
      code: coupon.code,
      couponId: coupon.id,
      discountAmount,
      type: coupon.type,
      value: coupon.value,
      baseAmount,
      gstAmount,
      finalAmount,
    }, 'Coupon applied successfully!');
  } catch (err) {
    next(err);
  }
});

// ─── Razorpay Order Creation ──────────────────────────────────────────────────

router.post(
  '/create-order',
  authenticate,
  [
    body('planId').notEmpty().withMessage('Plan ID required'),
    body('couponCode').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { planId, couponCode } = req.body;
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan || !plan.isActive) throw new NotFoundError('Subscription Plan');

      let discountAmount = 0;
      let coupon: any = null;

      if (couponCode) {
        coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
        if (coupon && coupon.isActive && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
          if (plan.discountedPrice >= coupon.minPurchase) {
            if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
              if (coupon.type === 'PERCENTAGE') {
                discountAmount = (plan.discountedPrice * coupon.value) / 100;
                if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
              } else {
                discountAmount = coupon.value;
              }
            }
          }
        }
      }

      const baseAmount = plan.discountedPrice - discountAmount;
      const gstAmount = (baseAmount * plan.gstPercent) / 100;
      const finalAmount = baseAmount + gstAmount;
      const amountInPaise = Math.round(finalAmount * 100);

      let providerOrderId = `manual_${Date.now()}`;

      const razorpay = await getRazorpayInstance();
      const razorpayConfig = await getRazorpayConfig();

      if (razorpay) {
        const order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
          notes: { userId: req.user!.userId, planId },
        });
        providerOrderId = order.id;
      }

      // Create pending payment record
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      const payment = await prisma.payment.create({
        data: {
          userId: req.user!.userId,
          planId,
          amount: plan.discountedPrice,
          gstAmount,
          discountAmount,
          finalAmount,
          status: 'PENDING',
          provider: 'RAZORPAY',
          providerOrderId,
          couponId: coupon?.id || null,
          invoiceNumber,
        },
      });

      return sendSuccess(res, {
        orderId: providerOrderId,
        paymentId: payment.id,
        amount: amountInPaise,
        currency: 'INR',
        keyId: razorpayConfig.keyId,
        plan: { name: plan.name, discountedPrice: plan.discountedPrice },
        breakdown: { baseAmount, discountAmount, gstAmount, finalAmount },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Razorpay Payment Verification ───────────────────────────────────────────

router.post(
  '/verify-payment',
  authenticate,
  [
    body('razorpay_order_id').optional(),
    body('razorpay_payment_id').notEmpty(),
    body('razorpay_signature').optional(),
    body('paymentId').notEmpty(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = req.body;

      // Verify signature
      const razorpayConfig = await getRazorpayConfig();

      if (!razorpay_order_id || !razorpay_signature) {
        if (config.env !== 'development') {
          throw new AppError('Missing payment signature', 400);
        }
      } else if (razorpayConfig.keySecret) {
        const expectedSignature = crypto
          .createHmac('sha256', razorpayConfig.keySecret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');

        if (expectedSignature !== razorpay_signature && config.env !== 'development') {
          throw new AppError('Payment verification failed', 400);
        }
      }

      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.userId !== req.user!.userId) throw new NotFoundError('Payment');
      if (payment.status === 'COMPLETED') throw new AppError('Payment already processed', 400);

      // Update payment status
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'COMPLETED', providerPaymentId: razorpay_payment_id, providerSignature: razorpay_signature },
      });

      // Activate subscription
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: payment.planId! } });
      if (!plan) throw new NotFoundError('Plan');

      const startDate = new Date();
      const endDate = plan.duration === 'LIFETIME' ? new Date('2099-12-31') : new Date(Date.now() + plan.durationDays * 86400000);

      const subscription = await prisma.subscription.create({
        data: {
          userId: req.user!.userId,
          planId: plan.id,
          status: 'ACTIVE',
          startDate,
          endDate,
          isLifetime: plan.duration === 'LIFETIME',
          paymentId,
        },
        include: { plan: true },
      });

      // Update coupon usage
      if (payment.couponId) {
        await prisma.coupon.update({ where: { id: payment.couponId }, data: { usedCount: { increment: 1 } } });
      }

      // Send confirmation email
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: '🎉 Subscription Activated — Open E Academy',
          html: `<h2>Hi ${user.name},</h2><p>Your <strong>${plan.name}</strong> subscription is now active until ${endDate.toLocaleDateString('en-IN')}.</p><p>Start learning at <a href="${config.webAppUrl}">Open E Academy</a></p>`,
        });
      }

      return sendSuccess(res, { subscription, payment: { id: paymentId, invoiceNumber: payment.invoiceNumber } }, 'Payment successful! Subscription activated.');
    } catch (err) {
      next(err);
    }
  },
);

// ─── Razorpay Webhook ─────────────────────────────────────────────────────────

router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);
    const razorpayConfig = await getRazorpayConfig();
    const expectedSig = crypto.createHmac('sha256', razorpayConfig.webhookSecret).update(body).digest('hex');

    if (signature !== expectedSig) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body;
    if (event.event === 'payment.failed') {
      const orderId = event.payload?.payment?.entity?.order_id;
      if (orderId) {
        await prisma.payment.updateMany({ where: { providerOrderId: orderId, status: 'PENDING' }, data: { status: 'FAILED' } });
      }
    }

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

// ─── Manual Subscription (Admin) ─────────────────────────────────────────────

router.post(
  '/manual-assign',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  [
    body('identifier').notEmpty().withMessage('User email, mobile or ID required'),
    body('planId').notEmpty(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identifier, planId, startDate, endDate, notes } = req.body;

      let user = await prisma.user.findFirst({
        where: { OR: [{ id: identifier }, { email: identifier }, { mobile: identifier }] },
      });

      if (!user) {
        // Create placeholder user
        user = await prisma.user.create({
          data: { name: identifier, email: identifier.includes('@') ? identifier : null, mobile: !identifier.includes('@') ? identifier : null },
        });
      }

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) throw new NotFoundError('Plan');

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id, planId,
          status: 'ACTIVE',
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isLifetime: plan.duration === 'LIFETIME',
          assignedBy: req.user!.userId,
          notes: notes || null,
        },
        include: { plan: true, user: { select: { id: true, name: true, email: true } } },
      });

      return sendCreated(res, subscription, 'Subscription manually assigned');
    } catch (err) {
      next(err);
    }
  },
);

// Payment history
router.get('/payments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const where = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN'
      ? {}
      : { userId: req.user!.userId };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.payment.count({ where }),
    ]);
    return sendPaginated(res, payments, total, page, limit);
  } catch (err) {
    next(err);
  }
});

// ─── Admin Plan Management ─────────────────────────────────────────────────────

router.post(
  '/admin/plans',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, duration, durationDays, originalPrice, discountedPrice, features, isFeatured } = req.body;
      const plan = await prisma.subscriptionPlan.create({
        data: {
          name, description, duration, durationDays: Number(durationDays),
          originalPrice: Number(originalPrice), discountedPrice: Number(discountedPrice),
          features: Array.isArray(features) ? features : [],
          isFeatured: Boolean(isFeatured),
        }
      });
      return sendCreated(res, plan, 'Subscription plan created');
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/admin/plans/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, duration, durationDays, originalPrice, discountedPrice, features, isFeatured, isActive } = req.body;
      const plan = await prisma.subscriptionPlan.update({
        where: { id: req.params.id },
        data: {
          name, description, duration, durationDays: Number(durationDays),
          originalPrice: Number(originalPrice), discountedPrice: Number(discountedPrice),
          features: Array.isArray(features) ? features : [],
          isFeatured: Boolean(isFeatured),
          isActive: Boolean(isActive),
        }
      });
      return sendSuccess(res, plan, 'Subscription plan updated');
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/admin/plans/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.subscriptionPlan.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Subscription plan deleted');
    } catch (err) {
      next(err);
    }
  }
);

export default router;
