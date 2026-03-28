"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tasks_controller_1 = require("../controllers/tasks.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', tasks_controller_1.getTasks);
router.get('/:id', tasks_controller_1.getTask);
router.post('/', (0, validate_middleware_1.validate)(validation_1.taskSchema), tasks_controller_1.createTask);
router.put('/:id', (0, validate_middleware_1.validate)(validation_1.taskSchema.partial()), tasks_controller_1.updateTask);
router.delete('/:id', tasks_controller_1.deleteTask);
exports.default = router;
//# sourceMappingURL=tasks.routes.js.map