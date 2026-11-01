import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createExpenseApp } from '../services/expense-service/src/server.js';
import { RoundRobinLoadBalancer } from '../services/expense-service/src/load-balancer.js';
import { signAccessToken } from '../services/shared/src/auth-utils.js';
import { runAllSeeds } from '../scripts/seed-all.js';

describe('Load Balancing & Shared Persistence Tests', () => {
  let instance1Server: http.Server;
  let instance2Server: http.Server;
  let lbServer: http.Server;
  let lb: RoundRobinLoadBalancer;
  let testUserToken: string;

  const PORT_INST_1 = 5021;
  const PORT_INST_2 = 5022;
  const PORT_LB = 8091;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await runAllSeeds();

    testUserToken = signAccessToken({
      userId: 'load-balance-tester',
      email: 'lb@spendwise.corp',
      role: 'ADMIN',
      firstName: 'Load',
      lastName: 'Tester',
      departmentId: 'dept-eng-001',
    });

    // 1. Start Instance 1
    const app1 = createExpenseApp('expense-service-1');
    await new Promise<void>((resolve) => {
      instance1Server = app1.listen(PORT_INST_1, () => resolve());
    });

    // 2. Start Instance 2
    const app2 = createExpenseApp('expense-service-2');
    await new Promise<void>((resolve) => {
      instance2Server = app2.listen(PORT_INST_2, () => resolve());
    });

    // 3. Start Round-Robin Load Balancer
    lb = new RoundRobinLoadBalancer([
      `http://127.0.0.1:${PORT_INST_1}`,
      `http://127.0.0.1:${PORT_INST_2}`,
    ]);
    lbServer = await lb.start(PORT_LB);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => instance1Server?.close(() => resolve()));
    await new Promise<void>((resolve) => instance2Server?.close(() => resolve()));
    await lb?.stop();
  });

  it('1. should distribute sequential requests across both instances in round-robin order', async () => {
    const responses: string[] = [];

    for (let i = 0; i < 6; i++) {
      const res = await fetch(`http://127.0.0.1:${PORT_LB}/api/expenses/diagnostic`);
      expect(res.status).toBe(200);
      const json: any = await res.json();
      const instance = json.data.instanceId;
      responses.push(instance);
    }

    // Must alternate between instance-1 and instance-2
    expect(responses[0]).toBe('expense-service-1');
    expect(responses[1]).toBe('expense-service-2');
    expect(responses[2]).toBe('expense-service-1');
    expect(responses[3]).toBe('expense-service-2');
    expect(responses[4]).toBe('expense-service-1');
    expect(responses[5]).toBe('expense-service-2');

    const countInst1 = responses.filter((r) => r === 'expense-service-1').length;
    const countInst2 = responses.filter((r) => r === 'expense-service-2').length;

    expect(countInst1).toBe(3);
    expect(countInst2).toBe(3);
  });

  it('2. should read an expense on Instance 2 that was created on Instance 1 (Shared Persistence)', async () => {
    // A. Create directly on Instance 1
    const createRes = await fetch(`http://127.0.0.1:${PORT_INST_1}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserToken}`,
      },
      body: JSON.stringify({
        categoryId: 'cat-soft-001',
        amount: 888.5,
        currency: 'USD',
        description: 'Multi-instance persistence test expense',
        vendor: 'Cloudflare, Inc.',
        expenseDate: '2026-03-28',
      }),
    });

    expect(createRes.status).toBe(201);
    const createdJson: any = await createRes.json();
    const expenseId = createdJson.data.id;
    expect(createRes.headers.get('x-service-instance')).toBe('expense-service-1');

    // B. Read immediately from Instance 2
    const readRes = await fetch(`http://127.0.0.1:${PORT_INST_2}/api/expenses/${expenseId}`, {
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });

    expect(readRes.status).toBe(200);
    const readJson: any = await readRes.json();
    expect(readRes.headers.get('x-service-instance')).toBe('expense-service-2');
    expect(readJson.data.id).toBe(expenseId);
    expect(readJson.data.vendor).toBe('Cloudflare, Inc.');
    expect(readJson.data.amount).toBe(888.5);

    // C. Update on Instance 2
    const updateRes = await fetch(`http://127.0.0.1:${PORT_INST_2}/api/expenses/${expenseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserToken}`,
      },
      body: JSON.stringify({
        amount: 999.0,
        description: 'Updated by Instance 2',
      }),
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.headers.get('x-service-instance')).toBe('expense-service-2');

    // D. Verify updated record on Instance 1
    const verifyRes = await fetch(`http://127.0.0.1:${PORT_INST_1}/api/expenses/${expenseId}`, {
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });

    expect(verifyRes.status).toBe(200);
    const verifyJson: any = await verifyRes.json();
    expect(verifyRes.headers.get('x-service-instance')).toBe('expense-service-1');
    expect(verifyJson.data.amount).toBe(999.0);
    expect(verifyJson.data.description).toBe('Updated by Instance 2');
  });
});
