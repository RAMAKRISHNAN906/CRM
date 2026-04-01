"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSupportOrAbove = exports.requireManagerOrAdmin = exports.requireAdmin = exports.requireMinRole = exports.requireRole = void 0;
const response_1 = require("../utils/response");
const ROLE_HIERARCHY = {
    SUPER_ADMIN: 100,
    ADMIN: 80,
    MANAGER: 60,
    SALES_REP: 40,
    SUPPORT: 40,
    USER: 20,
};
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
const requireMinRole = (minRole) => {
    return (req, res, next) => {
        if (!req.user) {
            (0, response_1.sendError)(res, 'Unauthorized', 401);
            return;
        }
        const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
        const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
        if (userLevel < requiredLevel) {
            (0, response_1.sendError)(res, 'Insufficient permissions', 403);
            return;
        }
        next();
    };
};
exports.requireMinRole = requireMinRole;
exports.requireAdmin = (0, exports.requireRole)('ADMIN', 'SUPER_ADMIN');
exports.requireManagerOrAdmin = (0, exports.requireRole)('ADMIN', 'SUPER_ADMIN', 'MANAGER');
exports.requireSupportOrAbove = (0, exports.requireMinRole)('SUPPORT');
//# sourceMappingURL=rbac.middleware.js.map