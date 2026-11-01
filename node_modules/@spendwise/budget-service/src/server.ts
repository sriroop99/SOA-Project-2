import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { budgetRouter } from './routes/budget.routes.js';
import { makeErrorResponse, makeSuccessResponse } from '@spendwise/shared';

export const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json(
    makeSuccessResponse({
      service: 'budget-service',
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  );
});

// Mount Routes
app.use('/api/budgets', budgetRouter);

// Centralized error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[BudgetService Error]', err);
  res.status(500).json(makeErrorResponse('INTERNAL_SERVER_ERROR', err.message || 'An unexpected error occurred'));
});

const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('budget-service/src/server.ts') ||
  process.argv[1].endsWith('budget-service\\src\\server.ts') ||
  process.argv[1].endsWith('budget-service/dist/server.js') ||
  process.argv[1].endsWith('budget-service\\dist\\server.js')
);

if (isMainModule) {
  const server = app.listen(config.port, () => {
    console.log(`[BudgetService] Listening on port ${config.port}`);
  });

  process.on('SIGTERM', () => {
    server.close(() => console.log('[BudgetService] Shut down cleanly.'));
  });
}
