"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leads_controller_1 = require("../controllers/leads.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', leads_controller_1.getLeads);
router.get('/:id', leads_controller_1.getLead);
router.post('/', (0, validate_middleware_1.validate)(validation_1.leadSchema), leads_controller_1.createLead);
router.put('/:id', (0, validate_middleware_1.validate)(validation_1.leadSchema.partial()), leads_controller_1.updateLead);
router.delete('/:id', leads_controller_1.deleteLead);
router.post('/:id/convert', leads_controller_1.convertLead);
router.post('/:id/convert-to-opportunity', leads_controller_1.convertToOpportunity);
router.post('/bulk-assign', leads_controller_1.bulkAssign);
exports.default = router;
//# sourceMappingURL=leads.routes.js.map