"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.changePassword = exports.logout = exports.refresh = exports.login = exports.register = void 0;
const prisma_1 = require("../config/prisma");
const hash_1 = require("../utils/hash");
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            (0, response_1.sendError)(res, 'Email already registered', 409);
            return;
        }
        const hashedPassword = await (0, hash_1.hashPassword)(password);
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                preference: {
                    create: {
                        theme: 'dark',
                        accentColor: 'violet',
                        selectedModules: JSON.stringify(['leads', 'contacts', 'deals', 'tasks', 'pipeline', 'calendar', 'products', 'quotes', 'email', 'reports', 'support', 'documents']),
                    },
                },
            },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
        await prisma_1.prisma.activityLog.create({
            data: { action: 'USER_REGISTERED', entity: 'User', entityId: user.id, userId: user.id, details: { email } },
        });
        const tokenId = (0, uuid_1.v4)();
        const accessToken = (0, jwt_1.generateAccessToken)({ userId: user.id, email: user.email, role: user.role });
        const refreshToken = (0, jwt_1.generateRefreshToken)({ userId: user.id, tokenId });
        await prisma_1.prisma.refreshToken.create({
            data: { token: refreshToken, userId: user.id, expiresAt: (0, jwt_1.getTokenExpiry)('7d') },
        });
        logger_1.logger.info(`User registered: ${email}`);
        (0, response_1.sendSuccess)(res, { user, accessToken, refreshToken }, 'Registration successful', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: { preference: true },
        });
        if (!user || !user.isActive) {
            (0, response_1.sendError)(res, 'Invalid email or password', 401);
            return;
        }
        const isValid = await (0, hash_1.comparePassword)(password, user.password);
        if (!isValid) {
            (0, response_1.sendError)(res, 'Invalid email or password', 401);
            return;
        }
        const tokenId = (0, uuid_1.v4)();
        const accessToken = (0, jwt_1.generateAccessToken)({ userId: user.id, email: user.email, role: user.role });
        const refreshToken = (0, jwt_1.generateRefreshToken)({ userId: user.id, tokenId });
        await prisma_1.prisma.refreshToken.create({
            data: { token: refreshToken, userId: user.id, expiresAt: (0, jwt_1.getTokenExpiry)('7d') },
        });
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await prisma_1.prisma.activityLog.create({
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
        logger_1.logger.info(`User logged in: ${email}`);
        (0, response_1.sendSuccess)(res, { user: userWithoutPassword, accessToken, refreshToken }, 'Login successful');
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const storedToken = await prisma_1.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
        if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
            (0, response_1.sendError)(res, 'Invalid or expired refresh token', 401);
            return;
        }
        let payload;
        try {
            payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
        }
        catch {
            await prisma_1.prisma.refreshToken.update({ where: { token: refreshToken }, data: { isRevoked: true } });
            (0, response_1.sendError)(res, 'Invalid refresh token', 401);
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user || !user.isActive) {
            (0, response_1.sendError)(res, 'User not found or inactive', 401);
            return;
        }
        // Rotate refresh token
        await prisma_1.prisma.refreshToken.update({ where: { token: refreshToken }, data: { isRevoked: true } });
        const newTokenId = (0, uuid_1.v4)();
        const newAccessToken = (0, jwt_1.generateAccessToken)({ userId: user.id, email: user.email, role: user.role });
        const newRefreshToken = (0, jwt_1.generateRefreshToken)({ userId: user.id, tokenId: newTokenId });
        await prisma_1.prisma.refreshToken.create({
            data: { token: newRefreshToken, userId: user.id, expiresAt: (0, jwt_1.getTokenExpiry)('7d') },
        });
        (0, response_1.sendSuccess)(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
    }
    catch (error) {
        next(error);
    }
};
exports.refresh = refresh;
const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await prisma_1.prisma.refreshToken.updateMany({
                where: { token: refreshToken },
                data: { isRevoked: true },
            });
        }
        (0, response_1.sendSuccess)(res, null, 'Logged out successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user) {
            (0, response_1.sendError)(res, 'User not found', 404);
            return;
        }
        const isValid = await (0, hash_1.comparePassword)(currentPassword, user.password);
        if (!isValid) {
            (0, response_1.sendError)(res, 'Current password is incorrect', 400);
            return;
        }
        const hashed = await (0, hash_1.hashPassword)(newPassword);
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
        logger_1.logger.info(`Password changed for user: ${user.email}`);
        (0, response_1.sendSuccess)(res, null, 'Password updated successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.changePassword = changePassword;
const getMe = async (req, res, next) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true, email: true, name: true, role: true, avatar: true,
                lastLoginAt: true, createdAt: true, preference: true,
            },
        });
        if (!user) {
            (0, response_1.sendError)(res, 'User not found', 404);
            return;
        }
        // Parse JSON-string fields in preference before returning
        const payload = user.preference ? {
            ...user,
            preference: {
                ...user.preference,
                selectedModules: (() => {
                    const raw = user.preference.selectedModules;
                    const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? []);
                    const DEFAULT = ['leads', 'contacts', 'deals', 'tasks', 'pipeline', 'calendar', 'products', 'quotes', 'email', 'reports', 'support', 'documents'];
                    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT;
                })(),
                dashboardLayout: typeof user.preference.dashboardLayout === 'string'
                    ? JSON.parse(user.preference.dashboardLayout) : (user.preference.dashboardLayout ?? {}),
                notifications: typeof user.preference.notifications === 'string'
                    ? JSON.parse(user.preference.notifications) : (user.preference.notifications ?? {}),
            },
        } : user;
        (0, response_1.sendSuccess)(res, payload, 'User retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
//# sourceMappingURL=auth.controller.js.map