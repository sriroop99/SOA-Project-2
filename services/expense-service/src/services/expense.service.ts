import {
  Currency,
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  JWTPayload,
} from '@spendwise/shared';
import { expenseRepo } from '../db/expense-db.js';

export class ExpenseService {
  public async getCategories(): Promise<ExpenseCategory[]> {
    return expenseRepo.getCategories();
  }

  public async createExpense(
    user: JWTPayload,
    data: {
      categoryId: string;
      departmentId?: string;
      amount: number;
      currency?: Currency;
      description: string;
      vendor: string;
      expenseDate: string;
      receiptUrl?: string;
      submitNow?: boolean;
    }
  ): Promise<Expense> {
    const category = await expenseRepo.findCategoryById(data.categoryId);
    const categoryName = category ? category.name : 'General Expense';
    const departmentId = data.departmentId || user.departmentId || 'dept-eng-001';
    const departmentName = user.departmentName || 'General Corporate';

    return expenseRepo.createExpense({
      employeeId: user.userId,
      employeeName: `${user.firstName} ${user.lastName}`,
      employeeEmail: user.email,
      categoryId: data.categoryId,
      categoryName,
      departmentId,
      departmentName,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      vendor: data.vendor,
      expenseDate: data.expenseDate,
      receiptUrl: data.receiptUrl,
      submitNow: data.submitNow,
    });
  }

  public async listExpenses(
    user: JWTPayload,
    query: {
      page?: number;
      limit?: number;
      status?: ExpenseStatus;
      categoryId?: string;
      departmentId?: string;
      employeeId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      sortBy?: 'expenseDate' | 'amount' | 'createdAt' | 'vendor';
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    // Role-based scoping: regular employees can ONLY view their own expenses
    const filterEmployeeId =
      user.role === 'EMPLOYEE' ? user.userId : query.employeeId;

    return expenseRepo.listExpenses({
      ...query,
      employeeId: filterEmployeeId,
    });
  }

  public async getExpenseById(user: JWTPayload, id: string): Promise<Expense> {
    const expense = await expenseRepo.findExpenseById(id);
    if (!expense) {
      throw { status: 404, code: 'EXPENSE_NOT_FOUND', message: 'Expense record not found' };
    }

    // Role check: employees can only view their own expense
    if (user.role === 'EMPLOYEE' && expense.employeeId !== user.userId) {
      throw {
        status: 403,
        code: 'FORBIDDEN',
        message: 'You are not authorized to view another employee\'s expense record',
      };
    }

    return expense;
  }

  public async updateExpense(
    user: JWTPayload,
    id: string,
    updates: {
      categoryId?: string;
      amount?: number;
      currency?: Currency;
      description?: string;
      vendor?: string;
      expenseDate?: string;
      receiptUrl?: string;
      submitNow?: boolean;
    }
  ): Promise<Expense> {
    const expense = await expenseRepo.findExpenseById(id);
    if (!expense) {
      throw { status: 404, code: 'EXPENSE_NOT_FOUND', message: 'Expense record not found' };
    }

    // Only owner or admin can edit
    if (user.role === 'EMPLOYEE' && expense.employeeId !== user.userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'You can only edit your own expenses' };
    }

    // Workflow rule: Only DRAFT or REJECTED expenses can be edited
    if (expense.status === 'APPROVED') {
      throw {
        status: 400,
        code: 'INVALID_STATE',
        message: 'Approved expenses cannot be modified to preserve financial integrity',
      };
    }
    if (expense.status === 'SUBMITTED' && !updates.submitNow) {
      throw {
        status: 400,
        code: 'INVALID_STATE',
        message: 'Expenses currently submitted for approval cannot be edited until reviewed',
      };
    }

    let categoryName = expense.categoryName;
    if (updates.categoryId && updates.categoryId !== expense.categoryId) {
      const cat = await expenseRepo.findCategoryById(updates.categoryId);
      if (cat) categoryName = cat.name;
    }

    const updated = await expenseRepo.updateExpense(
      id,
      {
        ...updates,
        categoryName,
      },
      updates.submitNow,
      { userId: user.userId, userName: `${user.firstName} ${user.lastName}` }
    );

    if (!updated) {
      throw { status: 500, code: 'UPDATE_FAILED', message: 'Failed to update expense' };
    }

    return updated;
  }

  public async deleteExpense(user: JWTPayload, id: string): Promise<boolean> {
    const expense = await expenseRepo.findExpenseById(id);
    if (!expense) {
      throw { status: 404, code: 'EXPENSE_NOT_FOUND', message: 'Expense record not found' };
    }

    // Only owner can delete
    if (user.role === 'EMPLOYEE' && expense.employeeId !== user.userId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'You can only delete your own draft expenses' };
    }

    // Preserving financial history: only DRAFT expenses may be deleted
    if (expense.status !== 'DRAFT') {
      throw {
        status: 400,
        code: 'CANNOT_DELETE',
        message: `Cannot delete expense in status '${expense.status}'. Financial history must be preserved.`,
      };
    }

    return expenseRepo.deleteExpense(id);
  }

  public async reviewExpense(
    user: JWTPayload,
    id: string,
    decision: { status: 'APPROVED' | 'REJECTED'; comments?: string; rejectionReason?: string }
  ): Promise<Expense> {
    // Only FINANCE_MANAGER or ADMIN can review
    if (user.role !== 'FINANCE_MANAGER' && user.role !== 'ADMIN') {
      throw {
        status: 403,
        code: 'FORBIDDEN',
        message: 'Only Finance Managers and Administrators can review expenses',
      };
    }

    const expense = await expenseRepo.findExpenseById(id);
    if (!expense) {
      throw { status: 404, code: 'EXPENSE_NOT_FOUND', message: 'Expense record not found' };
    }

    // Separation of duties rule: Employees cannot approve their own expenses
    if (expense.employeeId === user.userId) {
      throw {
        status: 403,
        code: 'SEGREGATION_OF_DUTIES',
        message: 'Employees are prohibited from approving their own financial expense claims',
      };
    }

    if (expense.status !== 'SUBMITTED') {
      throw {
        status: 400,
        code: 'INVALID_TRANSITION',
        message: `Only expenses in 'SUBMITTED' status can be reviewed. Current status: ${expense.status}`,
      };
    }

    const reviewed = await expenseRepo.reviewExpense(
      id,
      { id: user.userId, name: `${user.firstName} ${user.lastName}` },
      decision
    );

    if (!reviewed) {
      throw { status: 500, code: 'REVIEW_FAILED', message: 'Failed to process expense review' };
    }

    return reviewed;
  }

  public async getExpenseHistory(user: JWTPayload, id: string) {
    // Check expense existence and permission
    await this.getExpenseById(user, id);
    return expenseRepo.getExpenseHistory(id);
  }

  public async getAllExpensesRaw(): Promise<Expense[]> {
    return expenseRepo.getAllExpenses();
  }
}

export const expenseService = new ExpenseService();
