import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../server/src/routers/appRouter';

export const trpc = createTRPCReact<AppRouter>();