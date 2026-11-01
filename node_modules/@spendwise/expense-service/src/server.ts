import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { expenseRouter } from './routes/expense.routes.js';
import { makeErrorResponse, makeSuccessResponse } from '@spendwise/shared';

export function createExpenseApp(instanceId: string = config.instanceId) {
  const app = express();

  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json());

  // Attach diagnostic header identifying the serving instance
  app.use((req, res, next) => {
    res.setHeader('X-Service-Instance', instanceId);
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json(
      makeSuccessResponse({
        service: 'expense-service',
        instanceId,
        status: 'HEALTHY',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      })
    );
  });

  // Routes
  app.use('/api/expenses', expenseRouter);

  // Centralized error handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[ExpenseService ${instanceId} Error]`, err);
    res.status(500).json(makeErrorResponse('INTERNAL_SERVER_ERROR', err.message || 'An unexpected error occurred'));
  });

  return app;
}

export const app = createExpenseApp(config.instanceId);

const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('expense-service/src/server.ts') ||
  process.argv[1].endsWith('expense-service\\src\\server.ts') ||
  process.argv[1].endsWith('expense-service/dist/server.js') ||
  process.argv[1].endsWith('expense-service\\dist\\server.js')
);

if (isMainModule) {
  const server = app.listen(config.port, () => {
    console.log(`[ExpenseService] Instance '${config.instanceId}' listening on port ${config.port}`);
  });

  process.on('SIGTERM', () => {
    server.close(() => console.log(`[ExpenseService ${config.instanceId}] Shut down cleanly.`));
  });
}
