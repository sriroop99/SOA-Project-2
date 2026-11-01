export type UserRole = 'ADMIN' | 'FINANCE_MANAGER' | 'EMPLOYEE';

export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type BudgetPeriod = 'MONTHLY' | 'ANNUAL';

export type Currency = 'USD' | 'EUR' | 'INR' | 'GBP';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
  firstName: string;
  lastName: string;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  categoryId: string;
  categoryName: string;
  departmentId: string;
  departmentName: string;
  amount: number;
  currency: Currency;
  description: string;
  vendor: string;
  expenseDate: string;
  receiptUrl?: string;
  status: ExpenseStatus;
  submissionDate?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewDate?: string;
  rejectionReason?: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseStatusHistory {
  id: string;
  expenseId: string;
  fromStatus: ExpenseStatus | null;
  toStatus: ExpenseStatus;
  changedBy: string;
  changedByName: string;
  reason?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  departmentId: string;
  departmentName: string;
  categoryId?: string;
  categoryName?: string;
  period: BudgetPeriod;
  fiscalYear: number;
  fiscalMonth?: number; // 1-12 for monthly
  allocatedAmount: number;
  currency: Currency;
  thresholdWarningPercent: number; // e.g. 80
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationRecord {
  id: string;
  departmentId: string;
  departmentName: string;
  categoryId?: string;
  categoryName?: string;
  period: BudgetPeriod;
  fiscalYear: number;
  fiscalMonth?: number;
  currency: Currency;
  allocatedBudget: number;
  actualExpenditure: number;
  pendingExpenditure: number;
  variance: number; // allocated - actual
  remainingBudget: number; // allocated - actual
  utilizationPercent: number; // (actual / allocated) * 100
  isOverBudget: boolean;
  warningTriggered: boolean;
  notes?: string;
  reconciledBy: string;
  reconciledByName: string;
  reconciledAt: string;
}

export interface AnalyticsSummary {
  totalApprovedExpenditure: number;
  totalAllocatedBudget: number;
  totalRemainingBudget: number;
  utilizationPercentage: number;
  totalBudgetVariance: number;
  pendingApprovalsCount: number;
  pendingApprovalsAmount: number;
  totalExpensesCount: number;
  overBudgetCount: number;
  currency: Currency;
}

export interface MonthlySpending {
  month: string; // "2026-01"
  allocated: number;
  actual: number;
  pending: number;
}

export interface DepartmentSpending {
  departmentId: string;
  departmentName: string;
  allocated: number;
  actual: number;
  variance: number;
  utilizationPercent: number;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    instanceId?: string;
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  timestamp: string;
}
