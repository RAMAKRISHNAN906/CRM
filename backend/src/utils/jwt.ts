import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as any,
    issuer: 'crm-api',
    audience: 'crm-client',
  });
};

export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as any,
    issuer: 'crm-api',
    audience: 'crm-client',
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.accessSecret, {
    issuer: 'crm-api',
    audience: 'crm-client',
  }) as TokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, config.jwt.refreshSecret, {
    issuer: 'crm-api',
    audience: 'crm-client',
  }) as RefreshTokenPayload;
};

export const getTokenExpiry = (expiresIn: string): Date => {
  const now = new Date();
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error('Invalid token expiry format');
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return new Date(now.getTime() + value * multipliers[unit]);
};
