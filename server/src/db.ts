import { PrismaClient } from '@prisma/client'
import { softDeleteExtension } from './lib/soft-delete-extension'

declare global {
  var prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: ['error', 'warn'],
  })

  // Apply soft delete extension with no userId (system operations)
  return client.$extends(softDeleteExtension())
}

type ExtendedPrismaClient = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = global as unknown as {
  prisma: ExtendedPrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})