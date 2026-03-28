"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const response_1 = require("../utils/response");
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            const errors = result.error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            }));
            (0, response_1.sendError)(res, 'Validation failed', 422, errors);
            return;
        }
        req[source] = result.data;
        next();
    };
};
exports.validate = validate;
//# sourceMappingURL=validate.middleware.js.map