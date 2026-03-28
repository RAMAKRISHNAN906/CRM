"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireManagerOrAdmin = exports.requireAdmin = exports.requireRole = void 0;
const response_1 = require("../utils/response");
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            (0, response_1.sendError)(res, 'Unauthorized', 401);
            return;
        }
        if (!roles.includes(req.user.role)) {
            (0, response_1.sendError)(res, 'Insufficient permissions', 403);
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)('ADMIN');
exports.requireManagerOrAdmin = (0, exports.requireRole)('ADMIN', 'MANAGER');
//# sourceMappingURL=rbac.middleware.js.map