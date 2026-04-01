"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getForecasting = exports.getPipeline = exports.deleteDeal = exports.updateDeal = exports.createDeal = exports.getDeal = exports.getDeals = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const automation_service_1 = require("../services/automation.service");
const getDeals = async (req, res, next) => {
    try {
        const { page = '1', limit = '20', search, sortBy = 'createdAt', sortOrder = 'desc', stage, assigneeId, contactId, accountId, } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const where = { deletedAt: null };
        if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user.role)) {
            where.OR = [{ ownerId: req.user.userId }, { assigneeId: req.user.userId }];
        }
        if (search)
            where.title = { contains: search, mode: 'insensitive' };
        if (stage)
            where.stage = stage;
        if (assigneeId)
            where.assigneeId = assigneeId;
        if (contactId)
            where.contactId = contactId;
        if (accountId)
            where.accountId = accountId;
        const [deals, total] = await Promise.all([
            prisma_1.prisma.deal.findMany({
                where, skip, take: limitNum, orderBy: { [sortBy]: sortOrder },
                include: {
                    contact: { select: { id: true, firstName: true, lastName: true, company: true } },
                    owner: { select: { id: true, name: true, avatar: true } },
                    assignee: { select: { id: true, name: true, avatar: true } },
                    account: { select: { id: true, name: true } },
                },
            }),
            prisma_1.prisma.deal.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, deals, total, pageNum, limitNum, 'Deals retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getDeals = getDeals;
const getDeal = async (req, res, next) => {
    try {
        const deal = await prisma_1.prisma.deal.findFirst({
            where: { id: req.params.id, deletedAt: null },
            include: {
                contact: true,
                owner: { select: { id: true, name: true, avatar: true } },
                assignee: { select: { id: true, name: true, avatar: true } },
                account: true,
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: { user: { select: { id: true, name: true, avatar: true } } },
                },
                tasks: { where: { deletedAt: null }, orderBy: { dueDate: 'asc' } },
                documents: { where: { deletedAt: null } },
                stageHistory: { orderBy: { changedAt: 'asc' } },
            },
        });
        if (!deal) {
            (0, response_1.sendError)(res, 'Deal not found', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, deal, 'Deal retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getDeal = getDeal;
const createDeal = async (req, res, next) => {
    try {
        const { expectedClose, contactId, accountId, assigneeId, tags, ...rest } = req.body;
        const deal = await prisma_1.prisma.deal.create({
            data: {
                ...rest,
                tags: tags ? JSON.stringify(tags) : '[]',
                ownerId: req.user.userId,
                assigneeId,
                accountId,
                ...(expectedClose && { expectedClose: new Date(expectedClose) }),
                ...(contactId && { contactId }),
                stageHistory: { create: { toStage: rest.stage || 'PROSPECTING', changedById: req.user.userId } },
            },
            include: {
                contact: { select: { id: true, firstName: true, lastName: true } },
                owner: { select: { id: true, name: true, avatar: true } },
            },
        });
        Promise.all([
            prisma_1.prisma.activityLog.create({
                data: { action: 'DEAL_CREATED', entity: 'Deal', entityId: deal.id, userId: req.user.userId, details: { title: rest.title, value: rest.value } },
            }),
            (0, automation_service_1.runAutomation)({
                trigger: 'DEAL_CREATED',
                entityId: deal.id,
                entityType: 'Deal',
                data: { ...deal },
                userId: req.user.userId,
            }),
        ]).catch(() => { });
        (0, response_1.sendSuccess)(res, deal, 'Deal created', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createDeal = createDeal;
const updateDeal = async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.deal.findFirst({ where: { id: req.params.id, deletedAt: null } });
        if (!existing) {
            (0, response_1.sendError)(res, 'Deal not found', 404);
            return;
        }
        const { expectedClose, contactId, accountId, assigneeId, tags, ...rest } = req.body;
        const deal = await prisma_1.prisma.deal.update({
            where: { id: req.params.id },
            data: {
                ...rest,
                ...(tags && { tags: JSON.stringify(tags) }),
                ...(expectedClose && { expectedClose: new Date(expectedClose) }),
                ...(contactId !== undefined && { contactId: contactId || null }),
                ...(accountId !== undefined && { accountId: accountId || null }),
                ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
                ...(rest.stage && rest.stage !== existing.stage && {
                    actualClose: ['CLOSED_WON', 'CLOSED_LOST'].includes(rest.stage) ? new Date() : undefined,
                    stageHistory: {
                        create: { fromStage: existing.stage, toStage: rest.stage, changedById: req.user.userId },
                    },
                }),
            },
            include: {
                contact: { select: { id: true, firstName: true, lastName: true } },
                owner: { select: { id: true, name: true, avatar: true } },
            },
        });
        if (rest.stage && rest.stage !== existing.stage) {
            (0, automation_service_1.runAutomation)({
                trigger: 'DEAL_STAGE_CHANGED',
                entityId: deal.id,
                entityType: 'Deal',
                data: { ...deal, previousStage: existing.stage, newStage: rest.stage },
                userId: req.user.userId,
            }).catch(() => { });
        }
        (0, response_1.sendSuccess)(res, deal, 'Deal updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateDeal = updateDeal;
const deleteDeal = async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.deal.findFirst({ where: { id: req.params.id, deletedAt: null } });
        if (!existing) {
            (0, response_1.sendError)(res, 'Deal not found', 404);
            return;
        }
        // Soft delete
        await prisma_1.prisma.deal.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
        (0, response_1.sendSuccess)(res, null, 'Deal deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteDeal = deleteDeal;
const getPipeline = async (req, res, next) => {
    try {
        const stages = ['PROSPECTING', 'QUALIFICATION', 'NEEDS_ANALYSIS', 'VALUE_PROPOSITION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
        const where = { deletedAt: null };
        if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user.role)) {
            where.OR = [{ ownerId: req.user.userId }, { assigneeId: req.user.userId }];
        }
        const pipeline = await Promise.all(stages.map(async (stage) => {
            const deals = await prisma_1.prisma.deal.findMany({
                where: { ...where, stage: stage },
                include: {
                    contact: { select: { firstName: true, lastName: true, company: true } },
                    owner: { select: { id: true, name: true, avatar: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
            const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
            return { stage, deals, count: deals.length, totalValue };
        }));
        (0, response_1.sendSuccess)(res, pipeline, 'Pipeline retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getPipeline = getPipeline;
const getForecasting = async (req, res, next) => {
    try {
        const deals = await prisma_1.prisma.deal.findMany({
            where: {
                deletedAt: null,
                stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
            },
            select: { id: true, title: true, value: true, stage: true, probability: true, expectedClose: true, currency: true },
        });
        const totalPipeline = deals.reduce((sum, d) => sum + d.value, 0);
        const weightedForecast = deals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);
        // Group by month
        const byMonth = {};
        for (const deal of deals) {
            if (!deal.expectedClose)
                continue;
            const key = deal.expectedClose.toISOString().slice(0, 7);
            if (!byMonth[key])
                byMonth[key] = { count: 0, value: 0, weighted: 0 };
            byMonth[key].count++;
            byMonth[key].value += deal.value;
            byMonth[key].weighted += deal.value * deal.probability / 100;
        }
        (0, response_1.sendSuccess)(res, { totalPipeline, weightedForecast, byMonth, deals }, 'Forecast retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getForecasting = getForecasting;
//# sourceMappingURL=deals.controller.js.map