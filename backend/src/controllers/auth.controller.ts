import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, getTokenExpiry } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { RegisterInput, LoginInput } from '../utils/validation';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password }: RegisterInput = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendError(res, 'Email already registered', 409);
      return;
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        preference: {
          create: {
            theme: 'dark',
            accentColor: 'violet',
            selectedModules: JSON.stringify(['leads','contacts','deals','tasks','pipeline','calendar','products','quotes','email','reports','support','documents']),
          },
        },
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    await prisma.activityLog.create({
      data: { action: 'USER_REGISTERED', entity: 'User', entityId: user.id, userId: user.id, details: { email } },
    });

    const tokenId = uuidv4();
    const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id, tokenId });

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: getTokenExpiry('7d') },
    });

    logger.info(`User registered: ${email}`);
    sendSuccess(res, { user, accessToken, refreshToken }, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password }: LoginInput = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { preference: true },
    });

    if (!user || !user.isActive) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const tokenId = uuidv4();
    const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id, tokenId });

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: getTokenExpiry('7d') },
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    await prisma.activityLog.create({
      data: {
        action: 'USER_LOGIN',
        entity: 'User',
        entityId: user.id,
        userId: user.id,
        details: { email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    logger.info(`User logged in: ${email}`);
    sendSuccess(res, { user: userWithoutPassword, accessToken, refreshToken }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      sendError(res, 'Invalid or expired refresh token', 401);
      return;
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      await prisma.refreshToken.update({ where: { token: refreshToken }, data: { isRevoked: true } });
      sendError(res, 'Invalid refresh token', 401);
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      sendError(res, 'User not found or inactive', 401);
      return;
    }

    // Rotate refresh token
    await prisma.refreshToken.update({ where: { token: refreshToken }, data: { isRevoked: true } });

    const newTokenId = uuidv4();
    const newAccessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
    const newRefreshToken = generateRefreshToken({ userId: user.id, tokenId: newTokenId });

    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: user.id, expiresAt: getTokenExpiry('7d') },
    });

    sendSuccess(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { isRevoked: true },
      });
    }
    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) { sendError(res, 'User not found', 404); return; }

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) { sendError(res, 'Current password is incorrect', 400); return; }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    logger.info(`Password changed for user: ${user.email}`);
    sendSuccess(res, null, 'Password updated successfully');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, name: true, role: true, avatar: true,
        lastLoginAt: true, createdAt: true, preference: true,
      },
    });
    if (!user) { sendError(res, 'User not found', 404); return; }

    // Parse JSON-string fields in preference before returning
    const payload = user.preference ? {
      ...user,
      preference: {
        ...user.preference,
        selectedModules: (() => {
          const raw = user.preference!.selectedModules;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? []);
          const DEFAULT = ['leads','contacts','deals','tasks','pipeline','calendar','products','quotes','email','reports','support','documents'];
          return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT;
        })(),
        dashboardLayout: typeof user.preference.dashboardLayout === 'string'
          ? JSON.parse(user.preference.dashboardLayout as string) : (user.preference.dashboardLayout ?? {}),
        notifications: typeof user.preference.notifications === 'string'
          ? JSON.parse(user.preference.notifications as string)  : (user.preference.notifications ?? {}),
      },
    } : user;

    sendSuccess(res, payload, 'User retrieved');
  } catch (error) {
    next(error);
  }
};
