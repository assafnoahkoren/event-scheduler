/**
 * Database seed script for development
 * Creates default admin user and permissions
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function main() {
  console.log('🌱 Starting database seed...')

  // Clean existing data (optional - comment out if you want to preserve data)
  console.log('🧹 Cleaning existing data...')
  await prisma.userAssetPermission.deleteMany()
  await prisma.passwordReset.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  console.log('✨ Creating development admin user...')

  // Create a simple dev user with easy credentials
  const hashedPassword = await bcrypt.hash('a', 10) // Password: 'a'

  const adminUser = await prisma.user.create({
    data: {
      email: 'a',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      loginCount: 0,
    },
  })

  console.log(`✅ Created admin user:`)
  console.log(`   Email: ${adminUser.email}`)
  console.log(`   Password: a`)

  // Create system-wide admin permission
  console.log('🔐 Creating system admin permission...')

  const adminPermission = await prisma.userAssetPermission.create({
    data: {
      userId: adminUser.id,
      level: 'ADMIN',
      assetType: 'SYSTEM',
      assetId: '*', // Global wildcard for all system resources
      config: {
        description: 'Global system administrator',
        grantedBy: 'seed',
        grantedAt: new Date().toISOString(),
        scope: 'global',
      },
    },
  })

  console.log(`✅ Created system admin permission for user ${adminUser.email}`)
  console.log(`   Level: ${adminPermission.level}`)
  console.log(`   Asset Type: ${adminPermission.assetType}`)
  console.log(`   Asset ID: ${adminPermission.assetId} (global)`)

  // Create some additional test users (optional)
  console.log('\n📝 Creating test users...')

  const testUser1 = await prisma.user.create({
    data: {
      email: 'user@test.com',
      passwordHash: await bcrypt.hash('password123', 10),
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      isEmailVerified: false,
    },
  })

  const testUser2 = await prisma.user.create({
    data: {
      email: 'john@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  })

  console.log(`✅ Created test user: ${testUser1.email}`)
  console.log(`✅ Created test user: ${testUser2.email}`)

  // Create some sample permissions for test users
  await prisma.userAssetPermission.create({
    data: {
      userId: testUser1.id,
      level: 'READ',
      assetType: 'USER',
      assetId: testUser1.id, // Can read own profile
      config: {
        description: 'Self profile read access',
      },
    },
  })

  await prisma.userAssetPermission.create({
    data: {
      userId: testUser2.id,
      level: 'WRITE',
      assetType: 'USER',
      assetId: testUser2.id, // Can edit own profile
      config: {
        description: 'Self profile write access',
      },
    },
  })

  console.log('✅ Created sample permissions for test users')

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📋 Summary:')
  console.log('━'.repeat(40))
  console.log('Admin Account (for development):')
  console.log(`  Email: a@a`)
  console.log(`  Password: a`)
  console.log(`  Permissions: SYSTEM ADMIN (global)`)
  console.log('')
  console.log('Test Accounts:')
  console.log(`  user@test.com / password123`)
  console.log(`  john@example.com / password123`)
  console.log('━'.repeat(40))
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })