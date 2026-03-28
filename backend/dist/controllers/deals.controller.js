"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPipeline = exports.deleteDeal = exports.updateDeal = exports.createDeal = exports.getDeal = exports.getDeals = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const getDeals = async (req, res, next) => {
    try {
        const { page = '1', limit = '20', search, sortBy = 'createdAt', sortOrder = 'desc', stage } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const where = { userId: req.user.userId };
        if (search)
            where.title = { contains: search, mode: 'insensitive' };
        if (stage)
            where.stage = stage;
        const [deals, total] = await Promise.all([
            prisma_1.prisma.deal.findMany({
                where, skip, take: limitNum, orderBy: { [sortBy]: sortOrder },
                include: { contact: { select: { id: true, firstName: true, lastName: true, company: true } } },
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
            where: { id: req.params.id, userId: req.user.userId },
            include: { contact: true },
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
        const { expectedClose, contactId, tags, ...rest } = req.body;
        const deal = await prisma_1.prisma.deal.create({
            data: {
                ...rest,
                tags: tags ? JSON.stringify(tags) : '[]',
                userId: req.user.userId,
                ...(expectedClose && { expectedClose: new Date(expectedClose) }),
                ...(contactId && { contactId }),
            },
            include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        });
        await prisma_1.prisma.activityLog.create({
            data: { action: 'DEAL_CREATED', entity: 'Deal', entityId: deal.id, userId: req.user.userId, details: { title: rest.title, value: rest.value } },
        });
        (0, response_1.sendSuccess)(res, deal, 'Deal created', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createDeal = createDeal;
const updateDeal = async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.deal.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
        if (!existing) {
            (0, response_1.sendError)(res, 'Deal not found', 404);
            return;
        }
        const { expectedClose, contactId, tags, ...rest } = req.body;
        const deal = await prisma_1.prisma.deal.update({
            where: { id: req.params.id },
            data: {
                ...rest,
                ...(tags && { tags: JSON.stringify(tags) }),
                ...(expectedClose && { expectedClose: new Date(expectedClose) }),
                ...(contactId !== undefined && { contactId: contactId || null }),
            },
            include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        });
        (0, response_1.sendSuccess)(res, deal, 'Deal updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateDeal = updateDeal;
const deleteDeal = async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.deal.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
        if (!existing) {
            (0, response_1.sendError)(res, 'Deal not found', 404);
            return;
        }
        await prisma_1.prisma.deal.delete({ where: { id: req.params.id } });
        (0, response_1.sendSuccess)(res, null, 'Deal deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteDeal = deleteDeal;
const getPipeline = async (req, res, next) => {
    try {
        const stages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
        const pipeline = await Promise.all(stages.map(async (stage) => {
            const deals = await prisma_1.prisma.deal.findMany({
                where: { userId: req.user.userId, stage: stage },
                include: { contact: { select: { firstName: true, lastName: true, company: true } } },
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
//# sourceMappingURL=deals.controller.js.map