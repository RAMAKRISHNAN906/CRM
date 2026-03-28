import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

prisma.$connect().then(() => {
  logger.info('✅ Database connected');
}).catch((err) => {
  logger.error('❌ Database connection failed:', err);
  process.exit(1);
});

export { prisma };
