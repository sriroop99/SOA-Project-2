import {
  AnalyticsSummary,
  budgetRepo,
  calculateBudgetVariance,
  CategorySpending,
  DepartmentSpending,
  Expense,
  expenseRepo,
  MonthlySpending,
} from '@spendwise/shared';

export class AnalyticsService {
  public async getDashboardSummary(fiscalYear: number = 2026): Promise<{
    summary: AnalyticsSummary;
    monthlyTrends: MonthlySpending[];
    departmentSpending: DepartmentSpending[];
    categoryDistribution: CategorySpending[];
    recentExpenses: Expense[];
  }> {
    const expenses = await expenseRepo.getAllExpenses();
    const budgets = await budgetRepo.listBudgets({ fiscalYear });
    const departments = await budgetRepo.listDepartments();
    const categories = await expenseRepo.getCategories();

    // 1. Core KPIs
    const approvedExpenses = expenses.filter((e) => e.status === 'APPROVED');
    const pendingExpenses = expenses.filter((e) => e.status === 'SUBMITTED');

    const totalApproved = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalAllocated = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
    const pendingCount = pendingExpenses.length;
    const pendingAmount = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

    const calc = calculateBudgetVariance(totalAllocated, totalApproved, pendingAmount, 80);

    // 2. Department Breakdown
    let overBudgetCount = 0;
    const departmentSpending: DepartmentSpending[] = departments.map((dept) => {
      const deptBudgets = budgets.filter((b) => b.departmentId === dept.id);
      const allocated = deptBudgets.reduce((sum, b) => sum + b.allocatedAmount, 0);

      const deptExpenses = approvedExpenses.filter((e) => e.departmentId === dept.id);
      const actual = deptExpenses.reduce((sum, e) => sum + e.amount, 0);

      const deptCalc = calculateBudgetVariance(allocated, actual);
      if (deptCalc.isOverBudget) overBudgetCount++;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        allocated: deptCalc.allocatedBudget,
        actual: deptCalc.actualExpenditure,
        variance: deptCalc.variance,
        utilizationPercent: deptCalc.utilizationPercent,
      };
    });

    // 3. Category Breakdown
    const totalExpAmount = approvedExpenses.reduce((sum, e) => sum + e.amount, 0) || 1;
    const categoryDistribution: CategorySpending[] = categories.map((cat) => {
      const catExpenses = approvedExpenses.filter((e) => e.categoryId === cat.id);
      const amount = catExpenses.reduce((sum, e) => sum + e.amount, 0);
      const percentage = Number(((amount / totalExpAmount) * 100).toFixed(1));
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        amount: Number(amount.toFixed(2)),
        percentage,
      };
    }).filter((c) => c.amount > 0);

    // 4. Monthly Trend (last 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrends: MonthlySpending[] = [];

    for (let m = 0; m < 6; m++) {
      const monthNum = m + 1;
      const monthLabel = `${monthNames[m]} 2026`;
      const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
      const prefix = `2026-${monthStr}`;

      const mApproved = approvedExpenses
        .filter((e) => e.expenseDate.startsWith(prefix))
        .reduce((sum, e) => sum + e.amount, 0);

      const mPending = pendingExpenses
        .filter((e) => e.expenseDate.startsWith(prefix))
        .reduce((sum, e) => sum + e.amount, 0);

      const mAllocated = totalAllocated / 12; // Pro-rated monthly allocation

      monthlyTrends.push({
        month: monthLabel,
        allocated: Number(mAllocated.toFixed(2)),
        actual: Number(mApproved.toFixed(2)),
        pending: Number(mPending.toFixed(2)),
      });
    }

    const summary: AnalyticsSummary = {
      totalApprovedExpenditure: calc.actualExpenditure,
      totalAllocatedBudget: calc.allocatedBudget,
      totalRemainingBudget: calc.remainingBudget,
      utilizationPercentage: calc.utilizationPercent,
      totalBudgetVariance: calc.variance,
      pendingApprovalsCount: pendingCount,
      pendingApprovalsAmount: Number(pendingAmount.toFixed(2)),
      totalExpensesCount: expenses.length,
      overBudgetCount,
      currency: 'USD',
    };

    const recentExpenses = [...expenses].slice(0, 8);

    return {
      summary,
      monthlyTrends,
      departmentSpending,
      categoryDistribution,
      recentExpenses,
    };
  }

  public async exportExpensesToCSV(filters?: {
    departmentId?: string;
    categoryId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<string> {
    const expenses = await expenseRepo.getAllExpenses();
    let filtered = [...expenses];

    if (filters?.departmentId) {
      filtered = filtered.filter((e) => e.departmentId === filters.departmentId);
    }
    if (filters?.categoryId) {
      filtered = filtered.filter((e) => e.categoryId === filters.categoryId);
    }
    if (filters?.status) {
      filtered = filtered.filter((e) => e.status === filters.status);
    }
    if (filters?.startDate) {
      filtered = filtered.filter((e) => e.expenseDate >= filters.startDate!);
    }
    if (filters?.endDate) {
      filtered = filtered.filter((e) => e.expenseDate <= filters.endDate!);
    }

    const headers = [
      'Expense ID',
      'Date',
      'Employee Name',
      'Employee Email',
      'Department',
      'Category',
      'Amount',
      'Currency',
      'Vendor',
      'Description',
      'Status',
      'Reviewed By',
      'Review Date',
    ];

    const escapeCSV = (str?: string | number | null) => {
      if (str === undefined || str === null) return '""';
      const val = String(str).replace(/"/g, '""');
      return `"${val}"`;
    };

    const rows = filtered.map((e) => [
      escapeCSV(e.id),
      escapeCSV(e.expenseDate),
      escapeCSV(e.employeeName),
      escapeCSV(e.employeeEmail),
      escapeCSV(e.departmentName),
      escapeCSV(e.categoryName),
      escapeCSV(e.amount.toFixed(2)),
      escapeCSV(e.currency),
      escapeCSV(e.vendor),
      escapeCSV(e.description),
      escapeCSV(e.status),
      escapeCSV(e.reviewedByName || 'N/A'),
      escapeCSV(e.reviewDate || 'N/A'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    return csvContent;
  }
}

export const analyticsService = new AnalyticsService();
