import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../services/expense-service/src/server.js';
import { signAccessToken } from '../services/shared/src/auth-utils.js';
import { runAllSeeds } from '../scripts/seed-all.js';

describe('Expense Service CRUD & Workflow Tests', () => {
  let employeeToken: string;
  let financeToken: string;
  let adminToken: string;
  let createdExpenseId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await runAllSeeds();

    employeeToken = signAccessToken({
      userId: 'emp-uuid-1',
      email: 'alex@spendwise.corp',
      role: 'EMPLOYEE',
      firstName: 'Alex',
      lastName: 'Reyes',
      departmentId: 'dept-eng-001',
      departmentName: 'Software Engineering',
    });

    financeToken = signAccessToken({
      userId: 'fin-uuid-2',
      email: 'marcus@spendwise.corp',
      role: 'FINANCE_MANAGER',
      firstName: 'Marcus',
      lastName: 'Vance',
      departmentId: 'dept-fin-002',
      departmentName: 'Finance & Accounting',
    });

    adminToken = signAccessToken({
      userId: 'adm-uuid-3',
      email: 'sarah@spendwise.corp',
      role: 'ADMIN',
      firstName: 'Sarah',
      lastName: 'Chen',
      departmentId: 'dept-eng-001',
      departmentName: 'Software Engineering',
    });
  });

  it('1. CREATE: should successfully create a draft expense with valid fields', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        categoryId: 'cat-soft-001',
        amount: 250.75,
        currency: 'USD',
        description: 'Monthly JetBrains All Products Pack License',
        vendor: 'JetBrains s.r.o.',
        expenseDate: '2026-03-25',
        submitNow: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.amount).toBe(250.75);
    expect(res.body.data.vendor).toBe('JetBrains s.r.o.');
    expect(res.headers['x-service-instance']).toBeDefined();

    createdExpenseId = res.body.data.id;
  });

  it('2. READ: should retrieve single expense by ID', async () => {
    const res = await request(app)
      .get(`/api/expenses/${createdExpenseId}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdExpenseId);
    expect(res.body.data.description).toBe('Monthly JetBrains All Products Pack License');
  });

  it('3. UPDATE: should update permitted fields on draft expense', async () => {
    const res = await request(app)
      .patch(`/api/expenses/${createdExpenseId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        amount: 299.0,
        description: 'Updated: Annual JetBrains License Pack',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(299.0);
    expect(res.body.data.description).toBe('Updated: Annual JetBrains License Pack');
  });

  it('4. SUBMIT: should submit draft expense for approval', async () => {
    const res = await request(app)
      .patch(`/api/expenses/${createdExpenseId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        submitNow: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SUBMITTED');
    expect(res.body.data.submissionDate).toBeDefined();
  });

  it('5. SEGREGATION OF DUTIES: employee cannot approve their own expense', async () => {
    const res = await request(app)
      .post(`/api/expenses/${createdExpenseId}/review`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        status: 'APPROVED',
        comments: 'Self approval attempt',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('6. REVIEW: Finance Manager should approve submitted expense', async () => {
    const res = await request(app)
      .post(`/api/expenses/${createdExpenseId}/review`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        status: 'APPROVED',
        comments: 'Verified against engineering tooling budget. Approved.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.reviewedBy).toBe('fin-uuid-2');
    expect(res.body.data.reviewedByName).toBe('Marcus Vance');
  });

  it('7. FINANCIAL INTEGRITY: should prevent deleting approved expense', async () => {
    const res = await request(app)
      .delete(`/api/expenses/${createdExpenseId}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CANNOT_DELETE');
  });

  it('8. READ PAGINATION & FILTERS: should filter expenses by status and search', async () => {
    const res = await request(app)
      .get('/api/expenses?status=APPROVED&search=JetBrains')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.total).toBeDefined();
  });
});
