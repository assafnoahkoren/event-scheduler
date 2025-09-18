import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { authRouter } from './auth.router';
import { siteRouter } from './site.router';
import { eventRouter } from './event.router';

export const appRouter = router({
  // Auth routes
  auth: authRouter,

  // Site management routes
  sites: siteRouter,

  // Event management routes
  events: eventRouter,

  // Public routes
  ping: publicProcedure
    .query(() => {
      return {
        message: 'pong',
        timestamp: new Date().toISOString()
      };
    }),

  hello: publicProcedure
    .input(z.object({
      name: z.string()
    }))
    .query(({ input }) => {
      return {
        message: `Hello, ${input.name}!`
      };
    }),

  // Protected route example
  protected: protectedProcedure
    .query(({ ctx }) => {
      return {
        message: `Hello ${ctx.user.username}, you are authenticated!`,
        user: ctx.user
      };
    })
});

export type AppRouter = typeof appRouter;