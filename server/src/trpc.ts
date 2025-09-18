import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { verifyToken, extractTokenFromHeader, isAccessToken } from './lib/jwt';
import { authService } from './services/auth.service';
import type { User } from '@prisma/client';

export interface Context {
  user?: Omit<User, 'passwordHash'>;
  req: CreateExpressContextOptions['req'];
  res: CreateExpressContextOptions['res'];
}

export const createContext = async ({ req, res }: CreateExpressContextOptions): Promise<Context> => {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    return { req, res };
  }

  try {
    const payload = verifyToken(token);

    if (!isAccessToken(payload)) {
      return { req, res };
    }

    const user = await authService.getUserById(payload.userId);

    if (!user || !user.isActive) {
      return { req, res };
    }

    return { req, res, user };
  } catch (error) {
    // Token verification failed, continue without user
    return { req, res };
  }
};

const t = initTRPC.context<Context>().create({
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof z.ZodError ? error.cause.flatten() : null,
    },
  }),
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // user is now guaranteed to be defined
    },
  });
});