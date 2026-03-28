"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = exports.globalRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../config/env");
exports.globalRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: env_1.config.rateLimit.windowMs,
    max: env_1.config.rateLimit.max,
    message: { success: false, message: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { success: false, message: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});
//# sourceMappingURL=rateLimiter.js.map