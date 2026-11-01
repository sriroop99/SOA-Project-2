import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { createServiceProxy } from './proxy/gateway-proxy.js';
import { makeErrorResponse, makeSuccessResponse } from '@spendwise/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../../frontend/dist');

export const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));

// Gateway Health
app.get('/health', (req, res) => {
  res.status(200).json(
    makeSuccessResponse({
      gateway: 'SpendWise API Gateway',
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  );
});

// Deep Microservices Health Check Aggregator
app.get('/health/services', async (req, res) => {
  const checkService = async (name: string, url: string) => {
    try {
      const resp = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
      const data = await resp.json();
      return { service: name, status: resp.ok ? 'HEALTHY' : 'DEGRADED', data };
    } catch (err: any) {
      return { service: name, status: 'DOWN', error: err.message };
    }
  };

  const results = await Promise.all([
    checkService('auth-service', config.authServiceUrl),
    checkService('expense-service-cluster', config.expenseServiceUrl),
    checkService('budget-service', config.budgetServiceUrl),
    checkService('analytics-service', config.analyticsServiceUrl),
  ]);

  const allHealthy = results.every((r) => r.status === 'HEALTHY');
  res.status(allHealthy ? 200 : 207).json(
    makeSuccessResponse({
      clusterStatus: allHealthy ? 'HEALTHY' : 'PARTIAL_OUTAGE',
      services: results,
      timestamp: new Date().toISOString(),
    })
  );
});

// Proxy routes
app.use('/api/auth', createServiceProxy(config.authServiceUrl));
app.use('/api/expenses', createServiceProxy(config.expenseServiceUrl));
app.use('/api/budgets', createServiceProxy(config.budgetServiceUrl));
app.use('/api/analytics', createServiceProxy(config.analyticsServiceUrl));

// Convenience aliases mapped to upstream services
app.use('/api/departments', (req, res, next) => {
  req.url = req.originalUrl.replace('/api/departments', '/api/budgets/departments');
  createServiceProxy(config.budgetServiceUrl)(req, res);
});

app.use('/api/reconciliations', (req, res, next) => {
  req.url = req.originalUrl.replace('/api/reconciliations', '/api/budgets/reconciliations');
  createServiceProxy(config.budgetServiceUrl)(req, res);
});

app.use('/api/users', (req, res, next) => {
  req.url = req.originalUrl.replace('/api/users', '/api/auth/users');
  createServiceProxy(config.authServiceUrl)(req, res);
});

// Serve static frontend build if present
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Centralized error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Gateway Error]', err);
  res.status(500).json(makeErrorResponse('INTERNAL_SERVER_ERROR', err.message || 'An unexpected error occurred in Gateway'));
});

const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('api-gateway/src/server.ts') ||
  process.argv[1].endsWith('api-gateway\\src\\server.ts') ||
  process.argv[1].endsWith('api-gateway/dist/server.js') ||
  process.argv[1].endsWith('api-gateway\\dist\\server.js')
);

if (isMainModule) {
  const server = app.listen(config.port, () => {
    console.log(`[API Gateway] Listening on port ${config.port}`);
  });

  process.on('SIGTERM', () => {
    server.close(() => console.log('[API Gateway] Shut down cleanly.'));
  });
}
