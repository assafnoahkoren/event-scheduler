/**
 * JWT utility functions for token generation and validation
 */

import jwt from 'jsonwebtoken'
import type { User } from '@prisma/client'

// Token configuration from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const ACCESS_TOKEN_EXPIRES_IN = '30d' // 30 days (1 month)
const REFRESH_TOKEN_EXPIRES_IN = '90d' // 90 days (3 months)

// Token payload types
export interface AccessTokenPayload {
  userId: string
  email: string
  type: 'access'
}

export interface RefreshTokenPayload {
  userId: string
  tokenId: string // ID of the refresh token in database
  type: 'refresh'
}

// Generic token payload for verification
export type TokenPayload = AccessTokenPayload | RefreshTokenPayload

/**
 * Generate an access token for a user
 */
export function generateAccessToken(user: Pick<User, 'id' | 'email'>): string {
  const payload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    type: 'access',
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: 'event-scheduler',
    audience: 'event-scheduler-api',
  })
}

/**
 * Generate a refresh token for a user
 */
export function generateRefreshToken(userId: string, tokenId: string): string {
  const payload: RefreshTokenPayload = {
    userId,
    tokenId,
    type: 'refresh',
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'event-scheduler',
    audience: 'event-scheduler-api',
  })
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken<T extends TokenPayload = TokenPayload>(token: string): T {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'event-scheduler',
      audience: 'event-scheduler-api',
    }) as T

    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token')
    }
    throw error
  }
}

/**
 * Decode token without verification (useful for expired tokens)
 */
export function decodeToken<T extends TokenPayload = TokenPayload>(token: string): T | null {
  try {
    return jwt.decode(token) as T
  } catch {
    return null
  }
}

/**
 * Check if a token is an access token
 */
export function isAccessToken(payload: TokenPayload): payload is AccessTokenPayload {
  return payload.type === 'access'
}

/**
 * Check if a token is a refresh token
 */
export function isRefreshToken(payload: TokenPayload): payload is RefreshTokenPayload {
  return payload.type === 'refresh'
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

/**
 * Get token expiry times
 */
export function getTokenExpiryTimes() {
  return {
    accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
    refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
    // Convert to milliseconds for cookies
    accessTokenMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    refreshTokenMaxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
  }
}