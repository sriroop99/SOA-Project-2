import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Currency,
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  ExpenseStatusHistory,
} from '@spendwise/shared';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'expense_store.json');

export interface ExpenseDatabaseState {
  categories: ExpenseCategory[];
  expenses: Expense[];
  statusHistory: ExpenseStatusHistory[];
}

export class ExpenseRepository {
  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private readState(): ExpenseDatabaseState {
    this.ensureDir();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Error reading expense database file:', err);
      }
    }
    return { categories: [], expenses: [], statusHistory: [] };
  }

  private writeState(state: ExpenseDatabaseState) {
    this.ensureDir();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing expense database file:', err);
    }
  }

  public async getCategories(): Promise<ExpenseCategory[]> {
    const state = this.readState();
    return state.categories.filter((c) => c.isActive);
  }

  public async findCategoryById(id: string): Promise<ExpenseCategory | null> {
    const state = this.readState();
    return state.categories.find((c) => c.id === id) || null;
  }

  public async createCategory(category: Omit<ExpenseCategory, 'createdAt'>): Promise<ExpenseCategory> {
    const state = this.readState();
    const existing = state.categories.find((c) => c.id === category.id || c.code === category.code);
    if (existing) return existing;

    const newCat: ExpenseCategory = {
      ...category,
      createdAt: new Date().toISOString(),
    };
    state.categories.push(newCat);
    this.writeState(state);
    return newCat;
  }

  public async createExpense(data: {
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    categoryId: string;
    categoryName: string;
    departmentId: string;
    departmentName: string;
    amount: number;
    currency?: Currency;
    description: string;
    vendor: string;
    expenseDate: string;
    receiptUrl?: string;
    submitNow?: boolean;
  }): Promise<Expense> {
    const state = this.readState();
    const id = uuidv4();
    const now = new Date().toISOString();
    const status: ExpenseStatus = data.submitNow ? 'SUBMITTED' : 'DRAFT';

    const newExpense: Expense = {
      id,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      employeeEmail: data.employeeEmail,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      departmentId: data.departmentId,
      departmentName: data.departmentName,
      amount: Number(data.amount.toFixed(2)),
      currency: data.currency || 'USD',
      description: data.description.trim(),
      vendor: data.vendor.trim(),
      expenseDate: data.expenseDate,
      receiptUrl: data.receiptUrl || undefined,
      status,
      submissionDate: data.submitNow ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    state.expenses.unshift(newExpense);

    // Record initial status history
    const historyRecord: ExpenseStatusHistory = {
      id: uuidv4(),
      expenseId: id,
      fromStatus: null,
      toStatus: status,
      changedBy: data.employeeId,
      changedByName: data.employeeName,
      reason: data.submitNow ? 'Submitted upon creation' : 'Created as draft',
      createdAt: now,
    };
    state.statusHistory.unshift(historyRecord);

    this.writeState(state);
    return newExpense;
  }

  public async findExpenseById(id: string): Promise<Expense | null> {
    const state = this.readState();
    return state.expenses.find((e) => e.id === id) || null;
  }

  public async listExpenses(params: {
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
  }): Promise<{ items: Expense[]; total: number; page: number; limit: number; totalPages: number }> {
    const state = this.readState();
    let filtered = [...state.expenses];

    if (params.status) {
      filtered = filtered.filter((e) => e.status === params.status);
    }
    if (params.categoryId) {
      filtered = filtered.filter((e) => e.categoryId === params.categoryId);
    }
    if (params.departmentId) {
      filtered = filtered.filter((e) => e.departmentId === params.departmentId);
    }
    if (params.employeeId) {
      filtered = filtered.filter((e) => e.employeeId === params.employeeId);
    }
    if (params.startDate) {
      filtered = filtered.filter((e) => e.expenseDate >= params.startDate!);
    }
    if (params.endDate) {
      filtered = filtered.filter((e) => e.expenseDate <= params.endDate!);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.vendor.toLowerCase().includes(q) ||
          e.employeeName.toLowerCase().includes(q)
      );
    }

    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';

    filtered.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];
      if (sortBy === 'amount') {
        valA = Number(valA);
        valB = Number(valB);
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 10));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return { items, total, page, limit, totalPages };
  }

  public async updateExpense(
    id: string,
    updates: Partial<Omit<Expense, 'id' | 'employeeId' | 'status' | 'createdAt'>>,
    submitNow?: boolean,
    userContext?: { userId: string; userName: string }
  ): Promise<Expense | null> {
    const state = this.readState();
    const index = state.expenses.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const current = state.expenses[index];
    const now = new Date().toISOString();
    let nextStatus = current.status;

    if (submitNow && (current.status === 'DRAFT' || current.status === 'REJECTED')) {
      nextStatus = 'SUBMITTED';
      current.submissionDate = now;

      // Status transition record
      if (userContext) {
        state.statusHistory.unshift({
          id: uuidv4(),
          expenseId: id,
          fromStatus: current.status,
          toStatus: 'SUBMITTED',
          changedBy: userContext.userId,
          changedByName: userContext.userName,
          reason: current.status === 'REJECTED' ? 'Resubmitted after edits' : 'Submitted for approval',
          createdAt: now,
        });
      }
    }

    state.expenses[index] = {
      ...current,
      ...updates,
      status: nextStatus,
      updatedAt: now,
    };

    this.writeState(state);
    return state.expenses[index];
  }

  public async reviewExpense(
    id: string,
    reviewer: { id: string; name: string },
    decision: { status: 'APPROVED' | 'REJECTED'; comments?: string; rejectionReason?: string }
  ): Promise<Expense | null> {
    const state = this.readState();
    const index = state.expenses.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const current = state.expenses[index];
    const now = new Date().toISOString();

    state.expenses[index] = {
      ...current,
      status: decision.status,
      reviewedBy: reviewer.id,
      reviewedByName: reviewer.name,
      reviewDate: now,
      comments: decision.comments || current.comments,
      rejectionReason: decision.status === 'REJECTED' ? decision.rejectionReason : undefined,
      updatedAt: now,
    };

    state.statusHistory.unshift({
      id: uuidv4(),
      expenseId: id,
      fromStatus: current.status,
      toStatus: decision.status,
      changedBy: reviewer.id,
      changedByName: reviewer.name,
      reason: decision.status === 'REJECTED' ? decision.rejectionReason : (decision.comments || 'Approved by finance reviewer'),
      createdAt: now,
    });

    this.writeState(state);
    return state.expenses[index];
  }

  public async deleteExpense(id: string): Promise<boolean> {
    const state = this.readState();
    const initialLen = state.expenses.length;
    state.expenses = state.expenses.filter((e) => e.id !== id);
    if (state.expenses.length === initialLen) return false;

    // Remove status history for cleanly deleted draft
    state.statusHistory = state.statusHistory.filter((h) => h.expenseId !== id);
    this.writeState(state);
    return true;
  }

  public async getExpenseHistory(expenseId: string): Promise<ExpenseStatusHistory[]> {
    const state = this.readState();
    return state.statusHistory.filter((h) => h.expenseId === expenseId);
  }

  public async getAllExpenses(): Promise<Expense[]> {
    const state = this.readState();
    return [...state.expenses];
  }
}

export const expenseRepo = new ExpenseRepository();
