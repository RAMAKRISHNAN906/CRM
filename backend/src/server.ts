import './config/env';
import app from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/prisma';

const server = app.listen(config.port, () => {
  logger.info(`🚀 Server running on port ${config.port} in ${config.env} mode`);
  logger.info(`📡 API: http://localhost:${config.port}/api/v1`);
  logger.info(`🏥 Health: http://localhost:${config.port}/health`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed. Database disconnected.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  server.close(() => process.exit(1));
});

export default server;
