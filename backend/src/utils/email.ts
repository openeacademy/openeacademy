import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  try {
    await transporter.sendMail({
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info(`Email sent to ${options.to}: ${options.subject}`);
  } catch (err) {
    logger.error('Email send failed:', err);
    // Non-fatal — don't throw
  }
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
