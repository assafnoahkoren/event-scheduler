/**
 * Authentication router for tRPC
 */

import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { authService } from '../services/auth.service';
import { getTokenExpiryTimes } from '../lib/jwt';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must not exceed 100 characters'),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(6, 'New password must be at least 6 characters')
    .max(100, 'New password must not exceed 100 characters'),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  token: z.string().uuid('Invalid reset token'),
  newPassword: z.string()
    .min(6, 'New password must be at least 6 characters')
    .max(100, 'New password must not exceed 100 characters'),
});

export const authRouter = router({
  /**
   * Register a new user
   */
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await authService.register(input);
        const tokenExpiry = getTokenExpiryTimes();

        // Set refresh token as httpOnly cookie
        ctx.res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: tokenExpiry.refreshTokenMaxAge,
          path: '/',
        });

        // Store refresh token ID in a separate cookie (accessible to client)
        ctx.res.cookie('refreshTokenId', result.refreshTokenId, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: tokenExpiry.refreshTokenMaxAge,
          path: '/',
        });

        return {
          user: result.user,
          accessToken: result.accessToken,
          expiresIn: tokenExpiry.accessTokenExpiresIn,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Registration failed',
        });
      }
    }),

  /**
   * Login a user
   */
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await authService.login(input);
        const tokenExpiry = getTokenExpiryTimes();

        // Set refresh token as httpOnly cookie
        ctx.res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: tokenExpiry.refreshTokenMaxAge,
          path: '/',
        });

        // Store refresh token ID in a separate cookie
        ctx.res.cookie('refreshTokenId', result.refreshTokenId, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: tokenExpiry.refreshTokenMaxAge,
          path: '/',
        });

        return {
          user: result.user,
          accessToken: result.accessToken,
          expiresIn: tokenExpiry.accessTokenExpiresIn,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: error.message || 'Login failed',
        });
      }
    }),

  /**
   * Refresh access token
   */
  refresh: publicProcedure
    .input(refreshTokenSchema.optional())
    .mutation(async ({ input, ctx }) => {
      // Try to get refresh token from cookie if not provided
      const refreshToken = input?.refreshToken || ctx.req.cookies?.refreshToken;

      if (!refreshToken) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Refresh token is required',
        });
      }

      try {
        const result = await authService.refreshAccessToken(refreshToken);
        const tokenExpiry = getTokenExpiryTimes();

        // If a new refresh token was generated, update the cookie
        if (result.refreshToken) {
          ctx.res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: tokenExpiry.refreshTokenMaxAge,
            path: '/',
          });
        }

        return {
          accessToken: result.accessToken,
          expiresIn: tokenExpiry.accessTokenExpiresIn,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: error.message || 'Token refresh failed',
        });
      }
    }),

  /**
   * Logout current session
   */
  logout: publicProcedure
    .mutation(async ({ ctx }) => {
      const refreshTokenId = ctx.req.cookies?.refreshTokenId;

      if (refreshTokenId) {
        try {
          await authService.logout(refreshTokenId);
        } catch (error) {
          // Ignore errors during logout
        }
      }

      // Clear cookies
      ctx.res.clearCookie('refreshToken');
      ctx.res.clearCookie('refreshTokenId');

      return {
        success: true,
        message: 'Logged out successfully',
      };
    }),

  /**
   * Logout all sessions for the current user
   */
  logoutAll: protectedProcedure
    .mutation(async ({ ctx }) => {
      await authService.logoutAll(ctx.user.id);

      // Clear cookies
      ctx.res.clearCookie('refreshToken');
      ctx.res.clearCookie('refreshTokenId');

      return {
        success: true,
        message: 'All sessions logged out successfully',
      };
    }),

  /**
   * Get current user profile
   */
  me: protectedProcedure
    .query(({ ctx }) => {
      return {
        user: ctx.user,
      };
    }),

  /**
   * Verify email address
   */
  verifyEmail: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.isEmailVerified) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Email already verified',
        });
      }

      await authService.verifyEmail(ctx.user.id);

      return {
        success: true,
        message: 'Email verified successfully',
      };
    }),

  /**
   * Change password
   */
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        await authService.changePassword(
          ctx.user.id,
          input.currentPassword,
          input.newPassword
        );

        // Clear cookies (user will need to login again)
        ctx.res.clearCookie('refreshToken');
        ctx.res.clearCookie('refreshTokenId');

        return {
          success: true,
          message: 'Password changed successfully. Please login again.',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Password change failed',
        });
      }
    }),

  /**
   * Request password reset
   */
  requestPasswordReset: publicProcedure
    .input(requestPasswordResetSchema)
    .mutation(async ({ input }) => {
      const message = await authService.requestPasswordReset(input.email);

      // In production, don't return the token
      // Just send a generic message to prevent email enumeration
      if (process.env.NODE_ENV === 'production') {
        return {
          success: true,
          message: 'If the email exists, a reset link has been sent',
        };
      }

      // In development, return the token for testing
      return {
        success: true,
        message: 'Password reset token generated',
        token: message, // Only in dev
      };
    }),

  /**
   * Reset password with token
   */
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ input }) => {
      try {
        await authService.resetPassword(input.token, input.newPassword);

        return {
          success: true,
          message: 'Password reset successfully. You can now login with your new password.',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Password reset failed',
        });
      }
    }),

  /**
   * Check if user is authenticated
   */
  isAuthenticated: publicProcedure
    .query(({ ctx }) => {
      return {
        authenticated: !!ctx.user,
        user: ctx.user || null,
      };
    }),
});

export type AuthRouter = typeof authRouter;