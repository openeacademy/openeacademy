import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JWTPayload {
  userId: string;
  role: string;
  email?: string;
  mobile?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
}

export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: 'opene-academy',
    audience: 'opene-users',
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'opene-academy',
    audience: 'opene-users',
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, config.jwt.secret, {
    issuer: 'opene-academy',
    audience: 'opene-users',
  }) as JWTPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret, {
    issuer: 'opene-academy',
    audience: 'opene-users',
  }) as RefreshTokenPayload;
}

export function getTokenExpiry(expiresIn: string): Date {
  const units: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 86400000);
  return new Date(Date.now() + parseInt(match[1]) * units[match[2]]);
}
