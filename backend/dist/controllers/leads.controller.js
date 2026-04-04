"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkAssign = exports.convertLead = exports.convertToOpportunity = exports.deleteLead = exports.updateLead = exports.createLead = exports.getLead = exports.getLeads = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const automation_service_1 = require("../services/automation.service");
const leadScoring_service_1 = require("../services/leadScoring.service");
const getLeads = async (req, res, next) => {
    try {
        const { page = '1', limit = '20', search, sortBy = 'createdAt', sortOrder = 'desc', status, source, assigneeId, minScore, maxScore, } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const where = { deletedAt: null };
        // Non-admins see only their own or assigned leads
        if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user.role)) {
            where.OR = [{ ownerId: req.user.userId }, { assigneeId: req.user.userId }];
        }
        if (search) {
            where.AND = [{
                    OR: [
                        { firstName: { contains: search, mode: 'insensitive' } },
                        { lastName: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                        { company: { contains: search, mode: 'insensitive' } },
                    ],
                }];
        }
        if (status)
            where.status = status;
        if (source)
            where.source = source;
        if (assigneeId)
            where.assigneeId = assigneeId;
        if (minScore)
            where.score = { ...where.score, gte: parseInt(minScore) };
        if (maxScore)
            where.score = { ...where.score, lte: parseInt(maxScore) };
        const [leads, total] = await Promise.all([
            prisma_1.prisma.lead.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    owner: { select: { id: true, name: true, avatar: true } },
                    assignee: { select: { id: true, name: true, avatar: true } },
                    account: { select: { id: true, name: true } },
                },
            }),
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
        const lead = await prisma_1.prisma.lead.findFirst({
            where: { id: req.params.id, deletedAt: null },
            include: {
                owner: { select: { id: true, name: true, avatar: true } },
                assignee: { select: { id: true, name: true, avatar: true } },
                account: true,
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: { user: { select: { id: true, name: true, avatar: true } } },
                },
                tasks: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
                scoreHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
            },
        });
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
        // Duplicate detection: same email within same tenant
        if (data.email) {
            const existing = await prisma_1.prisma.lead.findFirst({
                where: { email: data.email, deletedAt: null },
            });
            if (existing) {
                (0, response_1.sendError)(res, `Duplicate: A lead with email ${data.email} already exists (ID: ${existing.id})`, 409);
                return;
            }
        }
        const lead = await prisma_1.prisma.lead.create({
            data: {
                ...data,
                tags: data.tags ? JSON.stringify(data.tags) : '[]',
                ownerId: req.user.userId,
            },
            include: {
                owner: { select: { id: true, name: true, avatar: true } },
                assignee: { select: { id: true, name: true, avatar: true } },
            },
        });
        // Async: score + automation (don't block response)
        Promise.all([
            (0, leadScoring_service_1.updateLeadScore)(lead.id),
            (0, automation_service_1.runAutomation)({
                trigger: 'LEAD_CREATED',
                entityId: lead.id,
                entityType: 'Lead',
                data: { ...lead, status: lead.status, source: lead.source },
                userId: req.user.userId,
            }),
            prisma_1.prisma.activityLog.create({
                data: {
                    action: 'LEAD_CREATED', entity: 'Lead', entityId: lead.id,
                    userId: req.user.userId, details: { name: `${data.firstName} ${data.lastName}` },
                },
            }),
        ]).catch(() => { });
        (0, response_1.sendSuccess)(res, lead, 'Lead created', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createLead = createLead;
const updateLead = async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.lead.findFirst({
            where: { id: req.params.id, deletedAt: null },
        });
        if (!existing) {
            (0, response_1.sendError)(res, 'Lead not found', 404);
            return;
        }
        const data = req.body;
        const lead = await prisma_1.prisma.lead.update({
            where: { id: req.params.id },
            data: { ...data, tags: data.tags ? JSON.stringify(data.tags) : undefined },
            include: {
                owner: { select: { id: true, name: true, avatar: true } },
                assignee: { select: { id: true, name: true, avatar: true } },
            },
        });
        // Trigger automations on status change
        const promises = [
            prisma_1.prisma.activityLog.create({
                data: {
                    action: 'LEAD_UPDATED', entity: 'Lead', entityId: lead.id,
                    userId: req.user.userId,
                    changes: data.status !== existing.status
                        ? { status: { from: existing.status, to: data.status } }
                        : {},
                    details: {},
                },
            }),
            (0, leadScoring_service_1.updateLeadScore)(lead.id),
        ];
        if (data.status && data.status !== existing.status) {
            promises.push((0, automation_service_1.runAutomation)({
                trigger: 'LEAD_STATUS_CHANGED',
                entityId: lead.id,
                entityType: 'Lead',
                data: { ...lead, previousStatus: existing.status },
                userId: req.user.userId,
            }));
        }
        Promise.all(promises).catch(() => { });
        (0, response_1.sendSuccess)(res, lead, 'Lead updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateLead = updateLead;
const deleteLead = async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.lead.findFirst({
            where: { id: req.params.id, deletedAt: null },
        });
        if (!existing) {
            (0, response_1.sendError)(res, 'Lead not found', 404);
            return;
        }
        // Soft delete
        await prisma_1.prisma.lead.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
        await prisma_1.prisma.activityLog.create({
            data: {
                action: 'LEAD_DELETED', entity: 'Lead', entityId: req.params.id,
                userId: req.user.userId, details: {},
            },
        });
        (0, response_1.sendSuccess)(res, null, 'Lead deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteLead = deleteLead;
// ── Convert Lead → Opportunity ────────────────────────────────────────────────
const convertToOpportunity = async (req, res, next) => {
    try {
        const lead = await prisma_1.prisma.lead.findFirst({
            where: { id: req.params.id, deletedAt: null },
        });
        if (!lead) {
            (0, response_1.sendError)(res, 'Lead not found', 404);
            return;
        }
        if (lead.convertedToOpportunityId) {
            (0, response_1.sendError)(res, 'Lead already converted to opportunity', 409);
            return;
        }
        const { title, value, closeDate, probability, notes } = req.body;
        const now = new Date();
        const opp = await prisma_1.prisma.opportunity.create({
            data: {
                title: title || `${lead.firstName} ${lead.lastName} — ${lead.company || 'Opportunity'}`,
                description: lead.notes || undefined,
                stage: 'OPPORTUNITY',
                type: 'NEW_BUSINESS',
                priority: 'MEDIUM',
                value: value ?? lead.value ?? 0,
                currency: lead.currency ?? 'INR',
                probability: probability ?? 20,
                closeDate: closeDate ? new Date(closeDate) : undefined,
                source: lead.source,
                notes: notes || undefined,
                tags: [],
                country: lead.country || undefined,
                decisionMakerName: lead.decisionMakerName || undefined,
                decisionMakerDesignation: lead.decisionMakerDesignation || undefined,
                convertedFromLeadId: lead.id,
                stageEnteredAt: { OPPORTUNITY: now.toISOString() },
                ownerId: req.user.userId,
            },
            include: {
                owner: { select: { id: true, name: true, avatar: true } },
                contact: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        // Mark lead as converted
        await prisma_1.prisma.lead.update({
            where: { id: lead.id },
            data: {
                status: 'WON',
                convertedAt: now,
                convertedToOpportunityId: opp.id,
            },
        });
        await prisma_1.prisma.activityLog.create({
            data: {
                action: 'LEAD_CONVERTED_OPPORTUNITY', entity: 'Lead', entityId: lead.id,
                userId: req.user.userId, details: { opportunityId: opp.id, title: opp.title },
            },
        });
        (0, response_1.sendSuccess)(res, { opportunity: opp, leadId: lead.id }, 'Lead converted to opportunity', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.convertToOpportunity = convertToOpportunity;
// ── Convert Lead → Contact (existing) ────────────────────────────────────────
const convertLead = async (req, res, next) => {
    try {
        const lead = await prisma_1.prisma.lead.findFirst({
            where: { id: req.params.id, deletedAt: null },
        });
        if (!lead) {
            (0, response_1.sendError)(res, 'Lead not found', 404);
            return;
        }
        // Create contact from lead
        const contact = await prisma_1.prisma.contact.create({
            data: {
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email || undefined,
                phone: lead.phone || undefined,
                company: lead.company || undefined,
                jobTitle: lead.jobTitle || undefined,
                notes: lead.notes || undefined,
                tags: lead.tags,
                customFields: lead.customFields,
                ownerId: req.user.userId,
            },
        });
        // Mark lead as converted
        await prisma_1.prisma.lead.update({
            where: { id: lead.id },
            data: {
                status: 'WON',
                convertedAt: new Date(),
                convertedToContactId: contact.id,
            },
        });
        await prisma_1.prisma.activityLog.create({
            data: {
                action: 'LEAD_CONVERTED', entity: 'Lead', entityId: lead.id,
                userId: req.user.userId, details: { contactId: contact.id },
            },
        });
        (0, response_1.sendSuccess)(res, { lead: { id: lead.id }, contact }, 'Lead converted to contact', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.convertLead = convertLead;
const bulkAssign = async (req, res, next) => {
    try {
        const { ids, assigneeId } = req.body;
        if (!ids || !ids.length) {
            (0, response_1.sendError)(res, 'No lead IDs provided', 400);
            return;
        }
        await prisma_1.prisma.lead.updateMany({
            where: { id: { in: ids }, deletedAt: null },
            data: { assigneeId },
        });
        (0, response_1.sendSuccess)(res, { updated: ids.length }, `${ids.length} leads assigned`);
    }
    catch (error) {
        next(error);
    }
};
exports.bulkAssign = bulkAssign;
//# sourceMappingURL=leads.controller.js.map