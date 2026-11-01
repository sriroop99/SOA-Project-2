import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.routes.js';
import { makeErrorResponse, makeSuccessResponse } from '@spendwise/shared';

export const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json(
    makeSuccessResponse({
      service: 'auth-service',
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  );
});

// API Routes
app.use('/api/auth', authRouter);

// Centralized error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[AuthService Error]', err);
  res.status(500).json(makeErrorResponse('INTERNAL_SERVER_ERROR', err.message || 'An unexpected error occurred'));
});

const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('auth-service/src/server.ts') ||
  process.argv[1].endsWith('auth-service\\src\\server.ts') ||
  process.argv[1].endsWith('auth-service/dist/server.js') ||
  process.argv[1].endsWith('auth-service\\dist\\server.js')
);

// Start server if executed directly
if (isMainModule) {
  const server = app.listen(config.port, () => {
    console.log(`[AuthService] Listening on port ${config.port}`);
  });

  process.on('SIGTERM', () => {
    server.close(() => console.log('[AuthService] Shut down cleanly.'));
  });
}
