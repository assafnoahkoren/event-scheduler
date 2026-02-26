/**
 * Interactive script to reset a user's password by email
 *
 * Usage: npx tsx src/scripts/reset-password.ts
 */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { input, password } from '@inquirer/prompts'

const prisma = new PrismaClient()

async function resetPassword(email: string, newPassword: string): Promise<void> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  })

  if (!user) {
    throw new Error(`User with email "${email}" not found`)
  }

  // Hash the new password
  const passwordHash = await bcrypt.hash(newPassword, 10)

  // Update password and revoke all refresh tokens
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      }
    }),
    prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        isRevoked: false
      },
      data: { isRevoked: true }
    })
  ])

  console.log(`\nPassword successfully reset for user: ${email}`)
  console.log(`All active sessions have been revoked.`)
}

async function main() {
  console.log('=== Password Reset Tool ===\n')

  const email = await input({
    message: 'Enter user email:',
    validate: (value) => {
      if (!value.trim()) {
        return 'Email is required'
      }
      if (!value.includes('@')) {
        return 'Please enter a valid email address'
      }
      return true
    }
  })

  const newPassword = await password({
    message: 'Enter new password:',
    mask: '*',
    validate: (value) => {
      if (value.length < 6) {
        return 'Password must be at least 6 characters long'
      }
      return true
    }
  })

  await password({
    message: 'Confirm new password:',
    mask: '*',
    validate: (value) => {
      if (value !== newPassword) {
        return 'Passwords do not match'
      }
      return true
    }
  })

  try {
    await resetPassword(email, newPassword)
  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
