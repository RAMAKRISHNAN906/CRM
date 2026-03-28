"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.createTask = exports.getTask = exports.getTasks = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const getTasks = async (req, res, next) => {
    try {
        const { page = '1', limit = '20', search, sortBy = 'createdAt', sortOrder = 'desc', status, priority } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const where = { userId: req.user.userId };
        if (search)
            where.title = { contains: search, mode: 'insensitive' };
        if (status)
            where.status = status;
        if (priority)
            where.priority = priority;
        const [tasks, total] = await Promise.all([
            prisma_1.prisma.task.findMany({ where, skip, take: limitNum, orderBy: { [sortBy]: sortOrder } }),
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
        const task = await prisma_1.prisma.task.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
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
        const { dueDate, tags, ...rest } = req.body;
        const task = await prisma_1.prisma.task.create({
            data: {
                ...rest,
                tags: tags ? JSON.stringify(tags) : '[]',
                userId: req.user.userId,
                ...(dueDate && { dueDate: new Date(dueDate) }),
            },
        });
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
        const existing = await prisma_1.prisma.task.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
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
        const existing = await prisma_1.prisma.task.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
        if (!existing) {
            (0, response_1.sendError)(res, 'Task not found', 404);
            return;
        }
        await prisma_1.prisma.task.delete({ where: { id: req.params.id } });
        (0, response_1.sendSuccess)(res, null, 'Task deleted');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTask = deleteTask;
//# sourceMappingURL=tasks.controller.js.map