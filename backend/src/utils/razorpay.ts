import Razorpay from 'razorpay';
import prisma from '../config/database';
import { config } from '../config';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

/**
 * Fetches Razorpay configuration from the database (SystemSetting).
 * Falls back to environment variables from config if not found in DB.
 */
export async function getRazorpayConfig(): Promise<RazorpayConfig> {
  const keys = ['razorpay_key_id', 'razorpay_key_secret', 'razorpay_webhook_secret'];
  const settings = await (prisma as any).systemSetting.findMany({
    where: { key: { in: keys } },
  });

  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }

  return {
    keyId: map['razorpay_key_id'] || config.razorpay.keyId || '',
    keySecret: map['razorpay_key_secret'] || config.razorpay.keySecret || '',
    webhookSecret: map['razorpay_webhook_secret'] || config.razorpay.webhookSecret || '',
  };
}

/**
 * Returns a dynamically configured Razorpay instance based on DB settings or env vars.
 * Returns null if keyId or keySecret is missing.
 */
export async function getRazorpayInstance(): Promise<Razorpay | null> {
  const cfg = await getRazorpayConfig();
  if (cfg.keyId && cfg.keySecret) {
    return new Razorpay({
      key_id: cfg.keyId,
      key_secret: cfg.keySecret,
    });
  }
  return null;
}
