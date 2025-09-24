import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/appRouter';
import { createContext } from './trpc';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration following Vercel guide
app.use(cors());

app.use(cookieParser());
app.use(express.json());

app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext
}));

app.get('/', (_, res) => {
  res.json({
    message: 'Event Scheduler API is running!',
    status: 'online',
    endpoints: {
      api: '/trpc',
      health: '/health'
    }
  });
});

app.get('/health', (_, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`);
});