import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

export const appRouter = router({
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
    })
});

export type AppRouter = typeof appRouter;