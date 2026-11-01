import { Expense } from './types.js';

export interface VarianceCalculationResult {
  allocatedBudget: number;
  actualExpenditure: number;
  pendingExpenditure: number;
  variance: number;
  remainingBudget: number;
  utilizationPercent: number;
  isOverBudget: boolean;
  warningTriggered: boolean;
}

/**
 * Filter approved and pending expenses for a given period and department/category
 */
export function filterExpensesForReconciliation(
  expenses: Expense[],
  criteria: {
    departmentId: string;
    categoryId?: string;
    currency?: string;
    fiscalYear: number;
    fiscalMonth?: number; // 1-12
  }
): { approved: Expense[]; pending: Expense[] } {
  const filtered = expenses.filter((e) => {
    if (e.departmentId !== criteria.departmentId) return false;
    if (criteria.categoryId && e.categoryId !== criteria.categoryId) return false;
    if (criteria.currency && e.currency !== criteria.currency) return false;

    // Date boundary check
    const expenseDate = new Date(e.expenseDate);
    const expYear = expenseDate.getUTCFullYear();
    const expMonth = expenseDate.getUTCMonth() + 1; // 1-12

    if (expYear !== criteria.fiscalYear) return false;
    if (criteria.fiscalMonth && expMonth !== criteria.fiscalMonth) return false;

    return true;
  });

  return {
    approved: filtered.filter((e) => e.status === 'APPROVED'),
    pending: filtered.filter((e) => e.status === 'SUBMITTED'),
  };
}

/**
 * Core Financial Reconciliation Calculations
 * Complies with SOA Project Review 2 Rubric
 */
export function calculateBudgetVariance(
  allocatedBudget: number,
  actualExpenditure: number,
  pendingExpenditure: number = 0,
  thresholdWarningPercent: number = 80
): VarianceCalculationResult {
  // Normalize precision to 2 decimal places
  const allocated = Number(Number(allocatedBudget).toFixed(2));
  const actual = Number(Number(actualExpenditure).toFixed(2));
  const pending = Number(Number(pendingExpenditure).toFixed(2));

  // Variance = Allocated - Actual
  // Positive = Under budget, 0 = On budget, Negative = Over budget
  const variance = Number((allocated - actual).toFixed(2));
  const remainingBudget = variance;

  // Utilization calculation with zero-budget rule
  let utilizationPercent: number;
  if (allocated === 0) {
    if (actual === 0) {
      utilizationPercent = 0.0;
    } else {
      // Over-budget spending when no budget was allocated
      utilizationPercent = 100.0;
    }
  } else {
    utilizationPercent = Number(((actual / allocated) * 100).toFixed(2));
  }

  const isOverBudget = actual > allocated;
  const warningTriggered = isOverBudget || utilizationPercent >= thresholdWarningPercent;

  return {
    allocatedBudget: allocated,
    actualExpenditure: actual,
    pendingExpenditure: pending,
    variance,
    remainingBudget,
    utilizationPercent,
    isOverBudget,
    warningTriggered,
  };
}
