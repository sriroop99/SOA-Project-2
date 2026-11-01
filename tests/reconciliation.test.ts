import { describe, it, expect } from 'vitest';
import { calculateBudgetVariance, filterExpensesForReconciliation } from '../services/shared/src/reconciliation-engine.js';
import { Expense } from '../services/shared/src/types.js';

describe('Budget Reconciliation Engine Tests', () => {
  it('1. Normal Calculation: Under Budget scenario (Positive Variance)', () => {
    const allocated = 10000;
    const actual = 6500;
    const pending = 1200;
    const threshold = 80;

    const res = calculateBudgetVariance(allocated, actual, pending, threshold);

    expect(res.allocatedBudget).toBe(10000);
    expect(res.actualExpenditure).toBe(6500);
    expect(res.pendingExpenditure).toBe(1200);
    expect(res.variance).toBe(3500); // 10000 - 6500
    expect(res.remainingBudget).toBe(3500);
    expect(res.utilizationPercent).toBe(65.0); // (6500 / 10000) * 100
    expect(res.isOverBudget).toBe(false);
    expect(res.warningTriggered).toBe(false);
  });

  it('2. Exactly On Budget scenario (Zero Variance)', () => {
    const allocated = 5000;
    const actual = 5000;

    const res = calculateBudgetVariance(allocated, actual, 0, 80);

    expect(res.variance).toBe(0.0);
    expect(res.remainingBudget).toBe(0.0);
    expect(res.utilizationPercent).toBe(100.0);
    expect(res.isOverBudget).toBe(false);
    expect(res.warningTriggered).toBe(true); // >= 80%
  });

  it('3. Over-Budget scenario (Negative Variance)', () => {
    const allocated = 20000;
    const actual = 24500;

    const res = calculateBudgetVariance(allocated, actual, 500, 80);

    expect(res.variance).toBe(-4500); // Allocated - Actual = 20000 - 24500
    expect(res.remainingBudget).toBe(-4500);
    expect(res.utilizationPercent).toBe(122.5); // (24500 / 20000) * 100
    expect(res.isOverBudget).toBe(true);
    expect(res.warningTriggered).toBe(true);
  });

  it('4. Zero Budget Rule: allocated = 0, actual = 0', () => {
    const res = calculateBudgetVariance(0, 0, 0, 80);

    expect(res.allocatedBudget).toBe(0);
    expect(res.actualExpenditure).toBe(0);
    expect(res.variance).toBe(0);
    expect(res.utilizationPercent).toBe(0.0);
    expect(res.isOverBudget).toBe(false);
  });

  it('5. Zero Budget Rule: allocated = 0, actual > 0 (Overrun)', () => {
    const res = calculateBudgetVariance(0, 500, 0, 80);

    expect(res.allocatedBudget).toBe(0);
    expect(res.actualExpenditure).toBe(500);
    expect(res.variance).toBe(-500);
    expect(res.utilizationPercent).toBe(100.0); // Treated as 100% overrun
    expect(res.isOverBudget).toBe(true);
    expect(res.warningTriggered).toBe(true);
  });

  it('6. Threshold Warning Trigger: utilization >= 80%', () => {
    const resSafe = calculateBudgetVariance(10000, 7900, 0, 80);
    expect(resSafe.utilizationPercent).toBe(79.0);
    expect(resSafe.warningTriggered).toBe(false);

    const resWarn = calculateBudgetVariance(10000, 8000, 0, 80);
    expect(resWarn.utilizationPercent).toBe(80.0);
    expect(resWarn.warningTriggered).toBe(true);
  });

  it('7. Precision & Rounding to 2 decimal places', () => {
    const res = calculateBudgetVariance(10000.333, 3333.666, 12.345, 80);

    expect(res.allocatedBudget).toBe(10000.33);
    expect(res.actualExpenditure).toBe(3333.67);
    expect(res.pendingExpenditure).toBe(12.35);
    expect(res.variance).toBe(6666.66);
    expect(res.utilizationPercent).toBe(33.34);
  });

  it('8. Date boundary & category filtering for approved vs pending expenses', () => {
    const dummyExpenses: Expense[] = [
      {
        id: '1',
        employeeId: 'u1',
        employeeName: 'A',
        employeeEmail: 'a@c.com',
        categoryId: 'cat-soft',
        categoryName: 'Software',
        departmentId: 'dept-eng',
        departmentName: 'Eng',
        amount: 100,
        currency: 'USD',
        description: 'Approved software',
        vendor: 'V1',
        expenseDate: '2026-03-15',
        status: 'APPROVED',
        createdAt: '2026-03-15T00:00:00Z',
        updatedAt: '2026-03-15T00:00:00Z',
      },
      {
        id: '2',
        employeeId: 'u1',
        employeeName: 'A',
        employeeEmail: 'a@c.com',
        categoryId: 'cat-soft',
        categoryName: 'Software',
        departmentId: 'dept-eng',
        departmentName: 'Eng',
        amount: 50,
        currency: 'USD',
        description: 'Pending software',
        vendor: 'V2',
        expenseDate: '2026-03-20',
        status: 'SUBMITTED',
        createdAt: '2026-03-20T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      },
      {
        id: '3',
        employeeId: 'u1',
        employeeName: 'A',
        employeeEmail: 'a@c.com',
        categoryId: 'cat-soft',
        categoryName: 'Software',
        departmentId: 'dept-eng',
        departmentName: 'Eng',
        amount: 200,
        currency: 'USD',
        description: 'Different year',
        vendor: 'V3',
        expenseDate: '2025-03-20',
        status: 'APPROVED',
        createdAt: '2025-03-20T00:00:00Z',
        updatedAt: '2025-03-20T00:00:00Z',
      },
      {
        id: '4',
        employeeId: 'u1',
        employeeName: 'A',
        employeeEmail: 'a@c.com',
        categoryId: 'cat-trav',
        categoryName: 'Travel',
        departmentId: 'dept-eng',
        departmentName: 'Eng',
        amount: 300,
        currency: 'USD',
        description: 'Different category',
        vendor: 'V4',
        expenseDate: '2026-03-22',
        status: 'APPROVED',
        createdAt: '2026-03-22T00:00:00Z',
        updatedAt: '2026-03-22T00:00:00Z',
      },
    ];

    const result = filterExpensesForReconciliation(dummyExpenses, {
      departmentId: 'dept-eng',
      categoryId: 'cat-soft',
      currency: 'USD',
      fiscalYear: 2026,
      fiscalMonth: 3,
    });

    expect(result.approved.length).toBe(1);
    expect(result.approved[0].id).toBe('1');
    expect(result.pending.length).toBe(1);
    expect(result.pending[0].id).toBe('2');
  });
});
