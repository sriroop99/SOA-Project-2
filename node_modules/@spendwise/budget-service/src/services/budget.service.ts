import {
  Budget,
  BudgetPeriod,
  budgetRepo,
  calculateBudgetVariance,
  Currency,
  Department,
  Expense,
  expenseRepo,
  JWTPayload,
  ReconciliationRecord,
} from '@spendwise/shared';
import { config } from '../config.js';

export class BudgetService {
  // --- Departments ---
  public async listDepartments(): Promise<Department[]> {
    return budgetRepo.listDepartments();
  }

  public async getDepartmentById(id: string): Promise<Department | null> {
    return budgetRepo.findDepartmentById(id);
  }

  public async createDepartment(data: {
    code: string;
    name: string;
    description?: string;
    managerId?: string;
  }): Promise<Department> {
    return budgetRepo.createDepartment(data);
  }

  // --- Budgets ---
  public async listBudgets(params?: {
    departmentId?: string;
    fiscalYear?: number;
    period?: BudgetPeriod;
  }): Promise<Budget[]> {
    return budgetRepo.listBudgets(params);
  }

  public async getBudgetById(id: string): Promise<Budget | null> {
    return budgetRepo.findBudgetById(id);
  }

  public async createBudget(data: {
    departmentId: string;
    categoryId?: string;
    period: BudgetPeriod;
    fiscalYear: number;
    fiscalMonth?: number;
    allocatedAmount: number;
    currency?: Currency;
    thresholdWarningPercent?: number;
  }): Promise<Budget> {
    const dept = await budgetRepo.findDepartmentById(data.departmentId);
    const departmentName = dept ? dept.name : 'Corporate Department';

    // Look up category name if categoryId is provided
    let categoryName: string | undefined;
    if (data.categoryId) {
      const cat = await expenseRepo.findCategoryById(data.categoryId);
      if (cat) categoryName = cat.name;
    }

    return budgetRepo.createBudget({
      ...data,
      departmentName,
      categoryName,
    });
  }

  public async updateBudget(
    id: string,
    updates: Partial<Pick<Budget, 'allocatedAmount' | 'thresholdWarningPercent'>>
  ): Promise<Budget> {
    const updated = await budgetRepo.updateBudget(id, updates);
    if (!updated) {
      throw { status: 404, code: 'BUDGET_NOT_FOUND', message: 'Budget not found' };
    }
    return updated;
  }

  public async deleteBudget(id: string): Promise<boolean> {
    const deleted = await budgetRepo.deleteBudget(id);
    if (!deleted) {
      throw { status: 404, code: 'BUDGET_NOT_FOUND', message: 'Budget not found' };
    }
    return true;
  }

  // --- Reconciliation Engine ---
  private async fetchExpensesForReconciliation(): Promise<Expense[]> {
    // Attempt inter-service HTTP request to Expense Service
    try {
      const res = await fetch(`${config.expenseServiceUrl}/api/expenses/internal/all`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json: any = await res.json();
        if (json.data && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      // Fallback to shared database repository
    }
    return expenseRepo.getAllExpenses();
  }

  public async runReconciliation(
    user: JWTPayload,
    params: {
      departmentId: string;
      categoryId?: string;
      period: BudgetPeriod;
      fiscalYear: number;
      fiscalMonth?: number;
      currency?: Currency;
      notes?: string;
    }
  ): Promise<ReconciliationRecord> {
    const dept = await budgetRepo.findDepartmentById(params.departmentId);
    const departmentName = dept ? dept.name : 'Unknown Department';

    // 1. Find matching allocated budget
    const allBudgets = await budgetRepo.listBudgets({
      departmentId: params.departmentId,
      fiscalYear: params.fiscalYear,
      period: params.period,
    });

    let targetBudget = allBudgets.find((b) => {
      if (params.categoryId && b.categoryId !== params.categoryId) return false;
      if (params.period === 'MONTHLY' && b.fiscalMonth !== params.fiscalMonth) return false;
      return true;
    });

    const allocatedAmount = targetBudget ? targetBudget.allocatedAmount : 0;
    const thresholdWarning = targetBudget ? targetBudget.thresholdWarningPercent : 80;

    // 2. Fetch expenses and aggregate
    const allExpenses = await this.fetchExpensesForReconciliation();

    const filtered = allExpenses.filter((e) => {
      if (e.departmentId !== params.departmentId) return false;
      if (params.categoryId && e.categoryId !== params.categoryId) return false;

      const date = new Date(e.expenseDate);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;

      if (year !== params.fiscalYear) return false;
      if (params.period === 'MONTHLY' && params.fiscalMonth && month !== params.fiscalMonth) return false;

      return true;
    });

    const approvedExpenses = filtered.filter((e) => e.status === 'APPROVED');
    const pendingExpenses = filtered.filter((e) => e.status === 'SUBMITTED');

    const actualExpenditure = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const pendingExpenditure = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 3. Compute variance, utilization, flags
    const calc = calculateBudgetVariance(
      allocatedAmount,
      actualExpenditure,
      pendingExpenditure,
      thresholdWarning
    );

    let categoryName: string | undefined;
    if (params.categoryId) {
      const cat = await expenseRepo.findCategoryById(params.categoryId);
      if (cat) categoryName = cat.name;
    }

    // 4. Save reconciliation snapshot
    const record = await budgetRepo.saveReconciliation({
      departmentId: params.departmentId,
      departmentName,
      categoryId: params.categoryId,
      categoryName,
      period: params.period,
      fiscalYear: params.fiscalYear,
      fiscalMonth: params.fiscalMonth,
      currency: params.currency || 'USD',
      allocatedBudget: calc.allocatedBudget,
      actualExpenditure: calc.actualExpenditure,
      pendingExpenditure: calc.pendingExpenditure,
      variance: calc.variance,
      remainingBudget: calc.remainingBudget,
      utilizationPercent: calc.utilizationPercent,
      isOverBudget: calc.isOverBudget,
      warningTriggered: calc.warningTriggered,
      notes: params.notes,
      reconciledBy: user.userId,
      reconciledByName: `${user.firstName} ${user.lastName}`,
    });

    return record;
  }

  public async listReconciliations(params?: {
    departmentId?: string;
    fiscalYear?: number;
  }): Promise<ReconciliationRecord[]> {
    return budgetRepo.listReconciliations(params);
  }
}

export const budgetService = new BudgetService();
