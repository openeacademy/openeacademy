import nodemailer from 'nodemailer';
import prisma from '../config/database';
import { logger } from './logger';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/**
 * Get email config: tries DB settings first, falls back to env/defaults.
 */
async function getEmailConfig(): Promise<EmailConfig> {
  try {
    const settings = await (prisma as any).systemSetting.findMany({
      where: { key: { in: ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'email_from'] } },
    });
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;

    if (map['smtp_host'] && map['smtp_user'] && map['smtp_pass']) {
      return {
        host: map['smtp_host'],
        port: parseInt(map['smtp_port'] || '587', 10),
        secure: map['smtp_secure'] === 'true',
        user: map['smtp_user'],
        pass: map['smtp_pass'],
        from: map['email_from'] || process.env.EMAIL_FROM || 'Open E Academy <noreply@openacademy.in>',
      };
    }
  } catch {
    // Fall through to env config
  }

  // Fallback to environment variables
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'Open E Academy <noreply@openacademy.in>',
  };
}

/**
 * Creates a transporter using current config (DB or env)
 */
async function createTransporter() {
  const cfg = await getEmailConfig();
  return {
    transporter: nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    }),
    from: cfg.from,
  };
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { transporter, from } = await createTransporter();
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info(`Email sent to ${options.to}: ${options.subject}`);
    return { success: true };
  } catch (err: any) {
    const errorMsg = err?.message || 'Unknown error';
    logger.error('Email send failed:', err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Test email configuration — sends a test email and returns result
 */
export async function testEmailConfig(testTo: string): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: testTo,
    subject: 'Test Email — Open E Academy',
    html: `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Test Email</title></head>
    <body style="font-family: Inter, sans-serif; background: #f9fafb; padding: 40px; text-align: center;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="color: #2563EB; margin-bottom: 8px; font-size: 24px;">Open E Academy</h1>
        <p style="color: #6B7280; margin-bottom: 32px;">Email Configuration Test</p>
        <p style="color: #374151;">✅ Your email configuration is working correctly!</p>
        <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px;">© 2025 Open E Academy. All rights reserved.</p>
      </div>
    </body>
    </html>`,
  });
}

export function otpEmailTemplate(otp: string, name: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>OTP Verification</title></head>
  <body style="font-family: Inter, sans-serif; background: #f9fafb; padding: 40px; text-align: center;">
    <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h1 style="color: #2563EB; margin-bottom: 8px; font-size: 24px;">Open E Academy</h1>
      <p style="color: #6B7280; margin-bottom: 32px;">Your Gateway to Government Job Success</p>
      <h2 style="color: #111827; margin-bottom: 8px;">Hi ${name},</h2>
      <p style="color: #374151; margin-bottom: 24px;">Your OTP for verification is:</p>
      <div style="background: #EFF6FF; border: 2px solid #BFDBFE; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2563EB;">${otp}</span>
      </div>
      <p style="color: #6B7280; font-size: 14px;">This OTP expires in 10 minutes. Do not share it with anyone.</p>
      <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px;">© 2025 Open E Academy. All rights reserved.</p>
    </div>
  </body>
  </html>`;
}
