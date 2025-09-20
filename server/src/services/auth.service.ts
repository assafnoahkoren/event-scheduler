/**
 * Authentication service for handling user authentication
 */

import type { User } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  isRefreshToken,
  type TokenPayload
} from '../lib/jwt'
import { prisma } from '../db'

export interface LoginResult {
  user: Omit<User, 'passwordHash'>
  accessToken: string
  refreshToken: string
  refreshTokenId: string
}

export interface RegisterInput {
  email: string
  username: string
  password: string
  firstName?: string
  lastName?: string
}

export interface LoginInput {
  emailOrUsername: string
  password: string
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<LoginResult> {
    const { email, username, password, firstName, lastName } = input

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    })

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new Error('Email already registered')
      }
      throw new Error('Username already taken')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        isActive: true,
        isEmailVerified: true, // TODO: Change to false and add email verification
      }
    })

    // Create refresh token in database
    const refreshTokenRecord = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    })

    // Generate tokens
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user.id, refreshTokenRecord.id)

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
      refreshTokenId: refreshTokenRecord.id,
    }
  }

  /**
   * Login a user
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const { emailOrUsername, password } = input

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername.toLowerCase() }
        ]
      }
    })

    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is disabled')
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      throw new Error('Invalid credentials')
    }

    // Update login stats
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: user.loginCount + 1,
      }
    })

    // Clean up old refresh tokens (keep only last 5)
    const existingTokens = await prisma.refreshToken.findMany({
      where: {
        userId: user.id,
        isRevoked: false,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existingTokens.length >= 5) {
      const tokensToRevoke = existingTokens.slice(4)
      await prisma.refreshToken.updateMany({
        where: {
          id: { in: tokensToRevoke.map(t => t.id) }
        },
        data: { isRevoked: true }
      })
    }

    // Create new refresh token
    const refreshTokenRecord = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    })

    // Generate tokens
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user.id, refreshTokenRecord.id)

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
      refreshTokenId: refreshTokenRecord.id,
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
    // Verify refresh token
    let payload: TokenPayload
    try {
      payload = verifyToken(refreshToken)
    } catch (error) {
      throw new Error('Invalid refresh token')
    }

    if (!isRefreshToken(payload)) {
      throw new Error('Invalid token type')
    }

    // Check if refresh token exists and is valid
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { id: payload.tokenId },
      include: { user: true }
    })

    if (!tokenRecord || tokenRecord.isRevoked) {
      throw new Error('Refresh token has been revoked')
    }

    if (tokenRecord.userId !== payload.userId) {
      throw new Error('Token user mismatch')
    }

    if (tokenRecord.expiresAt < new Date()) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true }
      })
      throw new Error('Refresh token has expired')
    }

    // Check if user is still active
    if (!tokenRecord.user.isActive) {
      throw new Error('Account is disabled')
    }

    // Generate new access token
    const accessToken = generateAccessToken(tokenRecord.user)

    // Optionally rotate refresh token (for better security)
    // Uncomment if you want to rotate refresh tokens on each use
    /*
    const newRefreshTokenRecord = await prisma.refreshToken.create({
      data: {
        userId: tokenRecord.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    })

    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true }
    })

    const newRefreshToken = generateRefreshToken(tokenRecord.user.id, newRefreshTokenRecord.id)

    return { accessToken, refreshToken: newRefreshToken }
    */

    return { accessToken }
  }

  /**
   * Logout a user (revoke refresh token)
   */
  async logout(refreshTokenId: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { id: refreshTokenId },
      data: { isRevoked: true }
    })
  }

  /**
   * Logout all sessions for a user
   */
  async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false
      },
      data: { isRevoked: true }
    })
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      }
    })
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) {
      throw new Error('Current password is incorrect')
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      }
    })

    // Revoke all refresh tokens (force re-login)
    await this.logoutAll(userId)
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      // Don't reveal if user exists
      return 'If the email exists, a reset link has been sent'
    }

    // Invalidate any existing reset tokens
    await prisma.passwordReset.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      }
    })

    // Create new reset token
    const resetToken = await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      }
    })

    // In production, send email with reset link
    // For now, return the token (in dev only)
    return resetToken.token
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!resetToken || resetToken.usedAt) {
      throw new Error('Invalid or expired reset token')
    }

    if (resetToken.expiresAt < new Date()) {
      throw new Error('Reset token has expired')
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
        }
      }),
      prisma.passwordReset.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      })
    ])

    // Revoke all refresh tokens
    await this.logoutAll(resetToken.userId)
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return null
    }

    const { passwordHash, ...userWithoutPassword } = user
    return userWithoutPassword
  }
}

export const authService = new AuthService()