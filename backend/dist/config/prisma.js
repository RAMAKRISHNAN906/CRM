"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = globalThis.__prisma ||
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
exports.prisma = prisma;
if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma;
}
prisma.$connect().then(() => {
    logger_1.logger.info('✅ Database connected');
}).catch((err) => {
    logger_1.logger.error('❌ Database connection failed:', err);
    process.exit(1);
});
//# sourceMappingURL=prisma.js.map