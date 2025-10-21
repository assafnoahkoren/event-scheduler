import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/appRouter';
import { createContext } from './trpc';

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors({
  origin: (_origin, callback) => {
    // Allow all origins
    callback(null, true)
  },
  credentials: true
}));

app.use(cookieParser());
// Increase body size limit for voice assistant audio uploads (max 25MB)
app.use(express.json({ limit: '25mb' }));

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