import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { app as authApp } from '../services/auth-service/src/server.js';
import { app as gatewayApp } from '../services/api-gateway/src/server.js';
import { createExpenseApp } from '../services/expense-service/src/server.js';
import { app as budgetApp } from '../services/budget-service/src/server.js';
import { app as analyticsApp } from '../services/analytics-service/src/server.js';
import { runAllSeeds } from '../scripts/seed-all.js';

describe('API Gateway Integration Tests', () => {
  let authServer: http.Server;
  let expServer: http.Server;
  let budgetServer: http.Server;
  let analyticsServer: http.Server;
  let gatewayServer: http.Server;

  const AUTH_PORT = 5001;
  const EXP_PORT = 8080;
  const BUDGET_PORT = 5004;
  const ANALYTICS_PORT = 5005;
  const GATEWAY_PORT = 5000;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await runAllSeeds();

    const safeListen = (serverApp: any, port: number): Promise<http.Server | null> => {
      return new Promise<http.Server | null>((resolve) => {
        const s = serverApp.listen(port, () => resolve(s));
        s.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            resolve(null);
          } else {
            resolve(null);
          }
        });
      });
    };

    authServer = (await safeListen(authApp, AUTH_PORT))!;
    expServer = (await safeListen(createExpenseApp('expense-gateway-test'), EXP_PORT))!;
    budgetServer = (await safeListen(budgetApp, BUDGET_PORT))!;
    analyticsServer = (await safeListen(analyticsApp, ANALYTICS_PORT))!;
    gatewayServer = (await safeListen(gatewayApp, GATEWAY_PORT))!;
  });

  afterAll(async () => {
    await new Promise<void>((r) => (authServer ? authServer.close(() => r()) : r()));
    await new Promise<void>((r) => (expServer ? expServer.close(() => r()) : r()));
    await new Promise<void>((r) => (budgetServer ? budgetServer.close(() => r()) : r()));
    await new Promise<void>((r) => (analyticsServer ? analyticsServer.close(() => r()) : r()));
    await new Promise<void>((r) => (gatewayServer ? gatewayServer.close(() => r()) : r()));
  });

  it('1. Gateway Health: should return healthy status for API Gateway', async () => {
    const res = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/health`);
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.data.gateway).toBe('SpendWise API Gateway');
    expect(json.data.status).toBe('HEALTHY');
  });

  it('2. Deep Cluster Health: should aggregate health of all upstream microservices', async () => {
    const res = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/health/services`);
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.data.clusterStatus).toBe('HEALTHY');
    expect(json.data.services.length).toBe(4);
  });

  it('3. Routing: should route /api/auth/login through Gateway to Auth Service', async () => {
    const res = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@spendwise.corp', password: 'Admin@12345' }),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.accessToken).toBeDefined();
    expect(json.data.user.role).toBe('ADMIN');
  });

  it('4. Routing: should route /api/expenses through Gateway to Expense Service', async () => {
    // First login through gateway
    const loginRes = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@spendwise.corp', password: 'Admin@12345' }),
    });
    const loginJson: any = await loginRes.json();
    const token = loginJson.data.accessToken;

    const res = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/api/expenses`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });
});
