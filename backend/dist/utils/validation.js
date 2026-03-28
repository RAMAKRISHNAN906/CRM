"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.preferenceSchema = exports.taskSchema = exports.dealSchema = exports.contactSchema = exports.leadSchema = exports.refreshSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: zod_1.z.string().email('Invalid email address').toLowerCase(),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address').toLowerCase(),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.leadSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, 'First name is required').max(100),
    lastName: zod_1.z.string().min(1, 'Last name is required').max(100),
    email: zod_1.z.string().email('Invalid email').optional().or(zod_1.z.literal('')),
    phone: zod_1.z.string().max(20).optional(),
    company: zod_1.z.string().max(200).optional(),
    jobTitle: zod_1.z.string().max(200).optional(),
    status: zod_1.z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
    source: zod_1.z.enum(['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL_CAMPAIGN', 'COLD_CALL', 'TRADE_SHOW', 'OTHER']).optional(),
    value: zod_1.z.number().min(0).optional(),
    currency: zod_1.z.string().length(3).optional(),
    notes: zod_1.z.string().max(5000).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.contactSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, 'First name is required').max(100),
    lastName: zod_1.z.string().min(1, 'Last name is required').max(100),
    email: zod_1.z.string().email('Invalid email').optional().or(zod_1.z.literal('')),
    phone: zod_1.z.string().max(20).optional(),
    company: zod_1.z.string().max(200).optional(),
    jobTitle: zod_1.z.string().max(200).optional(),
    address: zod_1.z.string().max(500).optional(),
    city: zod_1.z.string().max(100).optional(),
    country: zod_1.z.string().max(100).optional(),
    website: zod_1.z.string().url('Invalid URL').optional().or(zod_1.z.literal('')),
    linkedin: zod_1.z.string().optional(),
    twitter: zod_1.z.string().optional(),
    notes: zod_1.z.string().max(5000).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.dealSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(200),
    value: zod_1.z.number().min(0).optional(),
    currency: zod_1.z.string().length(3).optional(),
    stage: zod_1.z.enum(['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).optional(),
    probability: zod_1.z.number().min(0).max(100).optional(),
    expectedClose: zod_1.z.string().datetime().optional().or(zod_1.z.literal('')),
    notes: zod_1.z.string().max(5000).optional(),
    contactId: zod_1.z.string().uuid().optional().or(zod_1.z.literal('')),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.taskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(200),
    description: zod_1.z.string().max(5000).optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    dueDate: zod_1.z.string().datetime().optional().or(zod_1.z.literal('')),
    relatedType: zod_1.z.string().optional(),
    relatedId: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.preferenceSchema = zod_1.z.object({
    theme: zod_1.z.enum(['dark', 'light', 'system']).optional(),
    accentColor: zod_1.z.enum(['violet', 'blue', 'cyan', 'green', 'orange', 'red', 'pink']).optional(),
    sidebarCollapsed: zod_1.z.boolean().optional(),
    selectedModules: zod_1.z.array(zod_1.z.string()).optional(),
    dashboardLayout: zod_1.z.record(zod_1.z.any()).optional(),
    notifications: zod_1.z.object({
        email: zod_1.z.boolean().optional(),
        push: zod_1.z.boolean().optional(),
        desktop: zod_1.z.boolean().optional(),
    }).optional(),
});
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1)).optional().default('1'),
    limit: zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(1).max(100)).optional().default('20'),
    search: zod_1.z.string().optional(),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
});
//# sourceMappingURL=validation.js.map