"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteContact = exports.updateContact = exports.createContact = exports.getContact = exports.getContacts = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const getContacts = async (req, res, next) => {
    try {
        const { page = '1', limit = '20', search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const where = { deletedAt: null };
        if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user.role)) {
            where.ownerId = req.user.userId;
        }
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [contacts, total] = await Promise.all([
            prisma_1.prisma.contact.findMany({
                where, skip, take: limitNum, orderBy: { [sortBy]: sortOrder },
                include: {
                    account: { select: { id: true, name: true } },
                    owner: { select: { id: true, name: true, avatar: true } },
                },
            }),
            prisma_1.prisma.contact.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, contacts, total, pageNum, limitNum, 'Contacts retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getContacts = getContacts;
const getContact = async (req, res, next) => {
    try {
        const contact = await prisma_1.prisma.contact.findFirst({
            where: { id: req.params.id, deletedAt: null },
            include: {
                deals: { where: { deletedAt: null }, select: { id: true, title: true, value: true, stage: true } },
                account: true,
                owner: { select: { id: true, name: true, avatar: true } },
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: { user: { select: { id: true, name: true, avatar: true } } },
                },
                tickets: { where: { deletedAt: null }, select: { id: true, subject: true, status: true, priority: true } },
            },
        });
        if (!contact) {
            (0, response_1.sendError)(res, 'Contact not found', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, contact, 'Contact retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getContact = getContact;
const createContact = async (req, res, next) => {
    try {
        const data = req.body;
        const contact = await prisma_1.prisma.contact.create({
            data: {
                ...data,
                tags: data.tags ? JSON.stringify(data.tags) : '[]',
                ownerId: req.user.userId,
            },
        });
        await prisma_1.prisma.activityLog.create({
            data: {
                action: 'CONTACT_CREATED', entity: 'Contact', entityId: contact.id,
                userId: req.user.userId, details: { name: `${data.firstName} ${data.lastName}` },
            },
        });
        (0, response_1.sendSuccess)(res, contact, 'Contact created', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createContact = createContact;
const updateContact = async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.contact.findFirst({ where: { id: req.params.id, deletedAt: null } });
        if (!existing) {
            (0, response_1.sendError)(res, 'Contact not found', 404);
            return;
        }
        const data = req.body;
        const contact = await prisma_1.prisma.contact.update({
            where: { id: req.params.id },
            data: { ...data, tags: data.tags ? JSON.stringify(data.tags) : undefined },
        });
        (0, response_1.sendSuccess)(res, contact, 'Contact updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateContact = updateContact;
const deleteContact = async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.contact.findFirst({ where: { id: req.params.id, deletedAt: null } });
        if (!existing) {
            (0, response_1.sendError)(res, 'Contact not found', 404);
            return;
        }
        // Soft delete
        await prisma_1.prisma.contact.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
        (0, response_1.sendSuccess)(res, null, 'Contact deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteContact = deleteContact;
//# sourceMappingURL=contacts.controller.js.map