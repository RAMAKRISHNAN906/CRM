"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLead = exports.updateLead = exports.createLead = exports.getLead = exports.getLeads = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const getLeads = async (req, res, next) => {
    try {
        const { page = '1', limit = '20', search, sortBy = 'createdAt', sortOrder = 'desc', status } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const where = { userId: req.user.userId };
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (status)
            where.status = status;
        const [leads, total] = await Promise.all([
            prisma_1.prisma.lead.findMany({ where, skip, take: limitNum, orderBy: { [sortBy]: sortOrder } }),
            prisma_1.prisma.lead.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, leads, total, pageNum, limitNum, 'Leads retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getLeads = getLeads;
const getLead = async (req, res, next) => {
    try {
        const lead = await prisma_1.prisma.lead.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
        if (!lead) {
            (0, response_1.sendError)(res, 'Lead not found', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, lead, 'Lead retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getLead = getLead;
const createLead = async (req, res, next) => {
    try {
        const data = req.body;
        const lead = await prisma_1.prisma.lead.create({
            data: { ...data, tags: data.tags ? JSON.stringify(data.tags) : '[]', userId: req.user.userId },
        });
        await prisma_1.prisma.activityLog.create({
            data: { action: 'LEAD_CREATED', entity: 'Lead', entityId: lead.id, userId: req.user.userId, details: { name: `${data.firstName} ${data.lastName}` } },
        });
        (0, response_1.sendSuccess)(res, lead, 'Lead created', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createLead = createLead;
const updateLead = async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.lead.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
        if (!existing) {
            (0, response_1.sendError)(res, 'Lead not found', 404);
            return;
        }
        const data = req.body;
        const lead = await prisma_1.prisma.lead.update({
            where: { id: req.params.id },
            data: { ...data, tags: data.tags ? JSON.stringify(data.tags) : undefined },
        });
        await prisma_1.prisma.activityLog.create({
            data: { action: 'LEAD_UPDATED', entity: 'Lead', entityId: lead.id, userId: req.user.userId, details: { changes: data } },
        });
        (0, response_1.sendSuccess)(res, lead, 'Lead updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateLead = updateLead;
const deleteLead = async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.lead.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
        if (!existing) {
            (0, response_1.sendError)(res, 'Lead not found', 404);
            return;
        }
        await prisma_1.prisma.lead.delete({ where: { id: req.params.id } });
        await prisma_1.prisma.activityLog.create({
            data: { action: 'LEAD_DELETED', entity: 'Lead', entityId: req.params.id, userId: req.user.userId, details: {} },
        });
        (0, response_1.sendSuccess)(res, null, 'Lead deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteLead = deleteLead;
//# sourceMappingURL=leads.controller.js.map