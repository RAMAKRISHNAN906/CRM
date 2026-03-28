"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
router.post('/register', rateLimiter_1.authRateLimiter, (0, validate_middleware_1.validate)(validation_1.registerSchema), auth_controller_1.register);
router.post('/login', rateLimiter_1.authRateLimiter, (0, validate_middleware_1.validate)(validation_1.loginSchema), auth_controller_1.login);
router.post('/refresh', (0, validate_middleware_1.validate)(validation_1.refreshSchema), auth_controller_1.refresh);
router.post('/logout', auth_controller_1.logout);
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.getMe);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map