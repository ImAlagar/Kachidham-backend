// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/../.env` });

const { Pool } = pg;

// Simple console logger
const log = {
  info: (msg, data) => console.log(`ℹ️ ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`⚠️ ${msg}`, data || ''),
  error: (msg, data) => console.error(`❌ ${msg}`, data || ''),
  success: (msg, data) => console.log(`✅ ${msg}`, data || '')
};

async function main() {
  log.info('🌱 Starting admin user seed...');

  const adminEmail = process.env.ADMIN_EMAIL || 'alagar17302@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  // Create connection pool and adapter for Prisma 7
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    log.error('DATABASE_URL is not defined in .env file');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  // Initialize Prisma Client with adapter
  const prisma = new PrismaClient({ 
    adapter,
    log: ['error']
  });

  try {
    log.info('Testing database connection...');
    await prisma.$connect();
    log.success('Database connected successfully!');

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      log.info('Admin user already exists');
      log.info(`Email: ${adminEmail}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'ADMIN',
        emailVerified: new Date(),
        isActive: true,
        isApproved: true
      }
    });
    
    log.success('Admin user created successfully!');
    log.info(`User ID: ${adminUser.id}`);
    log.info(`Email: ${adminEmail}`);
    log.info(`Name: ${adminUser.name}`);

    if (adminPassword === 'Admin@123') {
      log.warn('SECURITY: Change default password after login');
    }

  } catch (error) {
    log.error('Failed to create admin user:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    log.success('Admin seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    log.error('Admin seed process failed:', error.message);
    process.exit(1);
  });