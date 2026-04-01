"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.createTask = exports.getTask = exports.getTasks = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const getTasks = async (req, res, next) => {
    try {
        const { page = '1', limit = '20', search, sortBy = 'createdAt', sortOrder = 'desc', status, priority, assigneeId, } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const where = { deletedAt: null };
        if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user.role)) {
            where.OR = [{ ownerId: req.user.userId }, { assigneeId: req.user.userId }];
        }
        if (search)
            where.title = { contains: search, mode: 'insensitive' };
        if (status)
            where.status = status;
        if (priority)
            where.priority = priority;
        if (assigneeId)
            where.assigneeId = assigneeId;
        const [tasks, total] = await Promise.all([
            prisma_1.prisma.task.findMany({
                where, skip, take: limitNum, orderBy: { [sortBy]: sortOrder },
                include: {
                    owner: { select: { id: true, name: true, avatar: true } },
                    assignee: { select: { id: true, name: true, avatar: true } },
                },
            }),
            prisma_1.prisma.task.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, tasks, total, pageNum, limitNum, 'Tasks retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getTasks = getTasks;
const getTask = async (req, res, next) => {
    try {
        const task = await prisma_1.prisma.task.findFirst({
            where: { id: req.params.id, deletedAt: null },
            include: {
                owner: { select: { id: true, name: true, avatar: true } },
                assignee: { select: { id: true, name: true, avatar: true } },
            },
        });
        if (!task) {
            (0, response_1.sendError)(res, 'Task not found', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, task, 'Task retrieved');
    }
    catch (error) {
        next(error);
    }
};
exports.getTask = getTask;
const createTask = async (req, res, next) => {
    try {
        const { dueDate, tags, assigneeId, leadId, contactId, dealId, ...rest } = req.body;
        const task = await prisma_1.prisma.task.create({
            data: {
                ...rest,
                tags: tags ? JSON.stringify(tags) : '[]',
                ownerId: req.user.userId,
                assigneeId,
                leadId, contactId, dealId,
                ...(dueDate && { dueDate: new Date(dueDate) }),
            },
            include: {
                owner: { select: { id: true, name: true, avatar: true } },
                assignee: { select: { id: true, name: true, avatar: true } },
            },
        });
        // Notify assignee
        if (assigneeId && assigneeId !== req.user.userId) {
            await prisma_1.prisma.notification.create({
                data: {
                    type: 'TASK_DUE',
                    title: 'Task assigned to you',
                    body: task.title,
                    link: `/tasks`,
                    userId: assigneeId,
                },
            });
        }
        await prisma_1.prisma.activityLog.create({
            data: { action: 'TASK_CREATED', entity: 'Task', entityId: task.id, userId: req.user.userId, details: { title: rest.title } },
        });
        (0, response_1.sendSuccess)(res, task, 'Task created', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createTask = createTask;
const updateTask = async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.task.findFirst({ where: { id: req.params.id, deletedAt: null } });
        if (!existing) {
            (0, response_1.sendError)(res, 'Task not found', 404);
            return;
        }
        const { dueDate, tags, ...rest } = req.body;
        const completedAt = rest.status === 'COMPLETED' && existing.status !== 'COMPLETED' ? new Date() : undefined;
        const task = await prisma_1.prisma.task.update({
            where: { id: req.params.id },
            data: {
                ...rest,
                ...(tags && { tags: JSON.stringify(tags) }),
                ...(dueDate && { dueDate: new Date(dueDate) }),
                ...(completedAt && { completedAt }),
            },
            include: {
                owner: { select: { id: true, name: true, avatar: true } },
                assignee: { select: { id: true, name: true, avatar: true } },
            },
        });
        (0, response_1.sendSuccess)(res, task, 'Task updated');
    }
    catch (error) {
        next(error);
    }
};
exports.updateTask = updateTask;
const deleteTask = async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.task.findFirst({ where: { id: req.params.id, deletedAt: null } });
        if (!existing) {
            (0, response_1.sendError)(res, 'Task not found', 404);
            return;
        }
        await prisma_1.prisma.task.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
        (0, response_1.sendSuccess)(res, null, 'Task deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTask = deleteTask;
//# sourceMappingURL=tasks.controller.js.map