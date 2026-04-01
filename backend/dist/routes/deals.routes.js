"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deals_controller_1 = require("../controllers/deals.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/pipeline', deals_controller_1.getPipeline);
router.get('/forecast', deals_controller_1.getForecasting);
router.get('/', deals_controller_1.getDeals);
router.get('/:id', deals_controller_1.getDeal);
router.post('/', (0, validate_middleware_1.validate)(validation_1.dealSchema), deals_controller_1.createDeal);
router.put('/:id', (0, validate_middleware_1.validate)(validation_1.dealSchema.partial()), deals_controller_1.updateDeal);
router.delete('/:id', deals_controller_1.deleteDeal);
exports.default = router;
//# sourceMappingURL=deals.routes.js.map