"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.errorHandler = exports.AppError = void 0;
const logger_1 = require("../utils/logger");
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    logger_1.logger.error({
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
    });
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
        return;
    }
    // Prisma errors
    if (err.code === 'P2002') {
        res.status(409).json({
            success: false,
            message: 'A record with this value already exists',
        });
        return;
    }
    if (err.code === 'P2025') {
        res.status(404).json({
            success: false,
            message: 'Record not found',
        });
        return;
    }
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
};
exports.errorHandler = errorHandler;
const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`,
    });
};
exports.notFound = notFound;
//# sourceMappingURL=errorHandler.js.map