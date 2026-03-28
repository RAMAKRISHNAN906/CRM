"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contacts_controller_1 = require("../controllers/contacts.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', contacts_controller_1.getContacts);
router.get('/:id', contacts_controller_1.getContact);
router.post('/', (0, validate_middleware_1.validate)(validation_1.contactSchema), contacts_controller_1.createContact);
router.put('/:id', (0, validate_middleware_1.validate)(validation_1.contactSchema.partial()), contacts_controller_1.updateContact);
router.delete('/:id', contacts_controller_1.deleteContact);
exports.default = router;
//# sourceMappingURL=contacts.routes.js.map