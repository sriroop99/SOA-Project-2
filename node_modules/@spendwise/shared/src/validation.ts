import { z } from 'zod';

export const UserRoleSchema = z.enum(['ADMIN', 'FINANCE_MANAGER', 'EMPLOYEE']);
export const ExpenseStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']);
export const BudgetPeriodSchema = z.enum(['MONTHLY', 'ANNUAL']);
export const CurrencySchema = z.enum(['USD', 'EUR', 'INR', 'GBP']);

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  role: UserRoleSchema.default('EMPLOYEE'),
  departmentId: z.string().uuid().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const CreateExpenseSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  departmentId: z.string().optional(),
  amount: z.coerce.number().positive('Expense amount must be greater than zero'),
  currency: CurrencySchema.default('USD'),
  description: z.string().min(3, 'Description must be at least 3 characters').max(500),
  vendor: z.string().min(1, 'Vendor name is required').max(100),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be formatted as YYYY-MM-DD'),
  receiptUrl: z.string().url('Invalid receipt URL').optional().or(z.literal('')),
  submitNow: z.boolean().optional().default(false),
});

export const UpdateExpenseSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.coerce.number().positive().optional(),
  currency: CurrencySchema.optional(),
  description: z.string().min(3).max(500).optional(),
  vendor: z.string().min(1).max(100).optional(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  receiptUrl: z.string().url().optional().or(z.literal('')),
  submitNow: z.boolean().optional(),
});

export const ReviewExpenseSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  comments: z.string().max(500).optional(),
  rejectionReason: z.string().max(500).optional(),
}).refine(
  (data) => {
    if (data.status === 'REJECTED') {
      return !!data.rejectionReason && data.rejectionReason.trim().length > 0;
    }
    return true;
  },
  {
    message: 'Rejection reason is required when rejecting an expense',
    path: ['rejectionReason'],
  }
);

export const CreateBudgetSchema = z.object({
  departmentId: z.string().min(1, 'Department is required'),
  categoryId: z.string().optional().or(z.literal('')),
  period: BudgetPeriodSchema.default('ANNUAL'),
  fiscalYear: z.coerce.number().int().min(2020).max(2050),
  fiscalMonth: z.coerce.number().int().min(1).max(12).optional(),
  allocatedAmount: z.coerce.number().nonnegative('Budget amount must be zero or positive'),
  currency: CurrencySchema.default('USD'),
  thresholdWarningPercent: z.coerce.number().min(1).max(100).default(80),
}).refine(
  (data) => {
    if (data.period === 'MONTHLY') {
      return data.fiscalMonth !== undefined && data.fiscalMonth >= 1 && data.fiscalMonth <= 12;
    }
    return true;
  },
  {
    message: 'Fiscal month (1-12) is required for monthly budgets',
    path: ['fiscalMonth'],
  }
);

export const UpdateBudgetSchema = z.object({
  allocatedAmount: z.coerce.number().nonnegative().optional(),
  thresholdWarningPercent: z.coerce.number().min(1).max(100).optional(),
});

export const ReconcileRequestSchema = z.object({
  departmentId: z.string().min(1, 'Department is required'),
  categoryId: z.string().optional(),
  period: BudgetPeriodSchema.default('ANNUAL'),
  fiscalYear: z.coerce.number().int().min(2020).max(2050),
  fiscalMonth: z.coerce.number().int().min(1).max(12).optional(),
  currency: CurrencySchema.default('USD'),
  notes: z.string().max(500).optional(),
});

export const CreateDepartmentSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(2).max(100),
  description: z.string().max(255).optional(),
  managerId: z.string().optional(),
});

export const ExpenseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: ExpenseStatusSchema.optional(),
  categoryId: z.string().optional(),
  departmentId: z.string().optional(),
  employeeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['expenseDate', 'amount', 'createdAt', 'vendor']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
