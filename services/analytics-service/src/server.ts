import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { makeErrorResponse, makeSuccessResponse } from '@spendwise/shared';

export const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json(
    makeSuccessResponse({
      service: 'analytics-service',
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  );
});

// Mount Routes
app.use('/api/analytics', analyticsRouter);

// Error Handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[AnalyticsService Error]', err);
  res.status(500).json(makeErrorResponse('INTERNAL_SERVER_ERROR', err.message || 'An unexpected error occurred'));
});

const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('analytics-service/src/server.ts') ||
  process.argv[1].endsWith('analytics-service\\src\\server.ts') ||
  process.argv[1].endsWith('analytics-service/dist/server.js') ||
  process.argv[1].endsWith('analytics-service\\dist\\server.js')
);

if (isMainModule) {
  const server = app.listen(config.port, () => {
    console.log(`[AnalyticsService] Listening on port ${config.port}`);
  });

  process.on('SIGTERM', () => {
    server.close(() => console.log('[AnalyticsService] Shut down cleanly.'));
  });
}
