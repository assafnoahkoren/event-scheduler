import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { authRouter } from './auth.router';
import { organizationRouter } from './organization.router';
import { siteRouter } from './site.router';
import { eventRouter } from './event.router';
import { clientRouter } from './client.router';
import { productsRouter } from './products.router';
import { eventProductsRouter } from './eventProducts.router';
import { waitingListRouter } from './waiting-list.router';
import { serviceProviderRouter } from './service-provider.router';
import { eventProviderRouter } from './event-provider.router';
import { filesRouter } from './files.router';
// import { aiRouter } from './ai.router'; // Disabled - requires valid OPENAI_API_KEY
import { userActivityRouter } from './user-activity.router';
import { taskRouter } from './task.router';
import { paymentRouter } from './payment.router';
import { userRouter } from './user.router';
import { floorPlanRouter } from './floor-plans';

export const appRouter = router({
  // Auth routes
  auth: authRouter,

  // Organization management routes
  organizations: organizationRouter,

  // Site management routes
  sites: siteRouter,

  // Event management routes
  events: eventRouter,

  // Client management routes
  clients: clientRouter,

  // Product management routes
  products: productsRouter,

  // Event products routes
  eventProducts: eventProductsRouter,

  // Waiting list routes
  waitingList: waitingListRouter,

  // Service Provider routes
  serviceProviders: serviceProviderRouter,

  // Event-Provider relation routes
  eventProviders: eventProviderRouter,

  // File upload and management routes
  files: filesRouter,

  // AI assistant routes (disabled - requires valid OPENAI_API_KEY)
  // ai: aiRouter,

  // User activity tracking routes
  userActivity: userActivityRouter,

  // Task management routes
  tasks: taskRouter,

  // Payment routes
  payments: paymentRouter,

  // User routes
  users: userRouter,

  // Floor plan feature (componentTypes, siteFloorPlans, templates, eventLayouts)
  floorPlans: floorPlanRouter,

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