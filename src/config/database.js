import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

// Initialize Prisma Client with better error handling
let prisma;

try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty'
  });
  
  // Test connection on startup
  prisma.$connect()
    .then(() => {
      logger.info('✅ Database connected successfully');  
    })
    .catch((error) => {
      logger.error('❌ Database connection failed:', {
        message: error.message,
        code: error.code,
        meta: error.meta
      });
      
      logger.error('💡 Troubleshooting steps:');
      logger.error('   1. Check if database server is running');
      logger.error('   2. Verify DATABASE_URL in environment variables');
      logger.error('   3. Ensure database exists and is accessible');
      logger.error('   4. Run: npx prisma generate');
      
      process.exit(1);
    });
} catch (error) {
  logger.error('❌ Prisma Client initialization failed:', {
    message: error.message,
    stack: error.stack
  });
  
  logger.error('💡 Please run: npx prisma generate');
  process.exit(1);
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  try {
    await prisma.$disconnect();
    logger.info('🔌 Database connection closed (beforeExit)');
  } catch (error) {
    logger.error('❌ Error closing database connection (beforeExit):', error);
  }
});

process.on('SIGINT', async () => {
  try {
    await prisma.$disconnect();
    logger.info('🔌 Database connection closed (SIGINT)');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error closing database connection (SIGINT):', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  try {
    await prisma.$disconnect();
    logger.info('🔌 Database connection closed (SIGTERM)');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error closing database connection (SIGTERM):', error);
    process.exit(1);
  }
});

// Add database health check function
export const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.debug('💚 Database health check passed');
    return true;
  } catch (error) {
    logger.error('💔 Database health check failed:', error);
    return false;
  }
};

export default prisma;