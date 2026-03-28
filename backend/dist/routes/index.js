"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const leads_routes_1 = __importDefault(require("./leads.routes"));
const contacts_routes_1 = __importDefault(require("./contacts.routes"));
const deals_routes_1 = __importDefault(require("./deals.routes"));
const tasks_routes_1 = __importDefault(require("./tasks.routes"));
const preferences_routes_1 = __importDefault(require("./preferences.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/leads', leads_routes_1.default);
router.use('/contacts', contacts_routes_1.default);
router.use('/deals', deals_routes_1.default);
router.use('/tasks', tasks_routes_1.default);
router.use('/preferences', preferences_routes_1.default);
router.use('/dashboard', dashboard_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map