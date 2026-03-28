"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const preferences_controller_1 = require("../controllers/preferences.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', preferences_controller_1.getPreferences);
router.put('/', (0, validate_middleware_1.validate)(validation_1.preferenceSchema), preferences_controller_1.updatePreferences);
exports.default = router;
//# sourceMappingURL=preferences.routes.js.map