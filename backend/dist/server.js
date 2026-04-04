"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/env");
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const prisma_1 = require("./config/prisma");
const reminderEngine_service_1 = require("./services/reminderEngine.service");
const festivalScheduler_service_1 = require("./services/festivalScheduler.service");
const server = app_1.default.listen(env_1.config.port, () => {
    logger_1.logger.info(`🚀 Server running on port ${env_1.config.port} in ${env_1.config.env} mode`);
    logger_1.logger.info(`📡 API: http://localhost:${env_1.config.port}/api/v1`);
    logger_1.logger.info(`🏥 Health: http://localhost:${env_1.config.port}/health`);
    // Start reminder engine — checks every 60 min for tasks due in 1 or 3 days
    (0, reminderEngine_service_1.startReminderEngine)(60);
    (0, festivalScheduler_service_1.startFestivalScheduler)(24);
});
// Graceful shutdown
const shutdown = async (signal) => {
    logger_1.logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
        await prisma_1.prisma.$disconnect();
        logger_1.logger.info('Server closed. Database disconnected.');
        process.exit(0);
    });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled Rejection:', reason);
    server.close(() => process.exit(1));
});
exports.default = server;
//# sourceMappingURL=server.js.map