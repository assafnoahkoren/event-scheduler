import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { authRouter } from './auth.router';
import { siteRouter } from './site.router';
import { eventRouter } from './event.router';
import { clientRouter } from './client.router';
import { productsRouter } from './products.router';

export const appRouter = router({
  // Auth routes
  auth: authRouter,

  // Site management routes
  sites: siteRouter,

  // Event management routes
  events: eventRouter,

  // Client management routes
  clients: clientRouter,

  // Product management routes
  products: productsRouter,

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
        message: `Hello ${ctx.user.email}, you are authenticated!`,
        user: ctx.user
      };
    })
});

export type AppRouter = typeof appRouter;