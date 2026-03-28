"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            (0, response_1.sendError)(res, 'Access token required', 401);
            return;
        }
        const token = authHeader.split(' ')[1];
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.user = payload;
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            (0, response_1.sendError)(res, 'Access token expired', 401);
        }
        else if (error.name === 'JsonWebTokenError') {
            (0, response_1.sendError)(res, 'Invalid access token', 401);
        }
        else {
            (0, response_1.sendError)(res, 'Authentication failed', 401);
        }
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.middleware.js.map