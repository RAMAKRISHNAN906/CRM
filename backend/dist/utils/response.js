"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPaginated = exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, message = 'Success', statusCode = 200, meta) => {
    res.status(statusCode).json({
        success: true,
        message,
        data,
        ...(meta && { meta }),
    });
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message, statusCode = 400, errors) => {
    res.status(statusCode).json({
        success: false,
        message,
        ...(errors && { errors }),
    });
};
exports.sendError = sendError;
const sendPaginated = (res, data, total, page, limit, message = 'Success') => {
    res.status(200).json({
        success: true,
        message,
        data,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
};
exports.sendPaginated = sendPaginated;
//# sourceMappingURL=response.js.map