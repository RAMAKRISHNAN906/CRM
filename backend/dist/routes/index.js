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
const accounts_routes_1 = __importDefault(require("./accounts.routes"));
const teams_routes_1 = __importDefault(require("./teams.routes"));
const communications_routes_1 = __importDefault(require("./communications.routes"));
const tickets_routes_1 = __importDefault(require("./tickets.routes"));
const automation_routes_1 = __importDefault(require("./automation.routes"));
const notifications_routes_1 = __importDefault(require("./notifications.routes"));
const invoices_routes_1 = __importDefault(require("./invoices.routes"));
const webhooks_routes_1 = __importDefault(require("./webhooks.routes"));
const reports_routes_1 = __importDefault(require("./reports.routes"));
// ── Enterprise v2 routes ──────────────────────────────────────
const pipeline_routes_1 = __importDefault(require("./pipeline.routes"));
const quotes_routes_1 = __importDefault(require("./quotes.routes"));
const purchaseOrders_routes_1 = __importDefault(require("./purchaseOrders.routes"));
const competitors_routes_1 = __importDefault(require("./competitors.routes"));
const festivals_routes_1 = __importDefault(require("./festivals.routes"));
const settings_routes_1 = __importDefault(require("./settings.routes"));
const subtasks_routes_1 = __importDefault(require("./subtasks.routes"));
const export_routes_1 = __importDefault(require("./export.routes"));
const activities_routes_1 = __importDefault(require("./activities.routes"));
const projects_routes_1 = __importDefault(require("./projects.routes"));
const countryTargets_routes_1 = __importDefault(require("./countryTargets.routes"));
const opportunities_routes_1 = __importDefault(require("./opportunities.routes"));
const router = (0, express_1.Router)();
// Core auth
router.use('/auth', auth_routes_1.default);
// CRM modules
router.use('/leads', leads_routes_1.default);
router.use('/contacts', contacts_routes_1.default);
router.use('/deals', deals_routes_1.default);
router.use('/tasks', tasks_routes_1.default);
router.use('/tasks', subtasks_routes_1.default); // subtasks nested under tasks
router.use('/accounts', accounts_routes_1.default);
router.use('/communications', communications_routes_1.default);
router.use('/activities', activities_routes_1.default);
router.use('/projects', projects_routes_1.default);
router.use('/country-targets', countryTargets_routes_1.default);
router.use('/opportunities', opportunities_routes_1.default);
router.use('/tickets', tickets_routes_1.default);
// Finance
router.use('/invoices', invoices_routes_1.default);
router.use('/quotes', quotes_routes_1.default);
router.use('/purchase-orders', purchaseOrders_routes_1.default);
// Pipeline (dynamic stages + demo details)
router.use('/pipeline', pipeline_routes_1.default);
// Sales intelligence
router.use('/competitors', competitors_routes_1.default);
// Engagement & automation
router.use('/festivals', festivals_routes_1.default);
// Automation & integrations
router.use('/automation', automation_routes_1.default);
router.use('/webhooks', webhooks_routes_1.default);
// Analytics & exports
router.use('/reports', reports_routes_1.default);
router.use('/dashboard', dashboard_routes_1.default);
router.use('/export', export_routes_1.default);
// User & settings
router.use('/preferences', preferences_routes_1.default);
router.use('/notifications', notifications_routes_1.default);
router.use('/teams', teams_routes_1.default);
router.use('/settings', settings_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map