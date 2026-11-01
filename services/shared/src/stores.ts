import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Budget,
  BudgetPeriod,
  Currency,
  Department,
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  ExpenseStatusHistory,
  ReconciliationRecord,
  RefreshTokenRecord,
  User,
  UserRole,
} from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');

// --- Auth Repository ---
const AUTH_DB_FILE = path.join(DATA_DIR, 'auth_store.json');
export interface AuthDatabaseState {
  users: User[];
  refreshTokens: RefreshTokenRecord[];
}

export class AuthRepository {
  private state: AuthDatabaseState = { users: [], refreshTokens: [] };
  private initialized = false;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (this.initialized) return;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(AUTH_DB_FILE)) {
      try {
        const raw = fs.readFileSync(AUTH_DB_FILE, 'utf-8');
        this.state = JSON.parse(raw);
      } catch (err) {
        console.error('Error loading auth database file:', err);
      }
    }
    this.initialized = true;
  }

  private persist() {
    this.ensureInitialized();
    try {
      fs.writeFileSync(AUTH_DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing auth database file:', err);
    }
  }

  public async findUserByEmail(email: string): Promise<User | null> {
    this.ensureInitialized();
    const normalized = email.trim().toLowerCase();
    return this.state.users.find((u) => u.email.toLowerCase() === normalized) || null;
  }

  public async findUserById(id: string): Promise<User | null> {
    this.ensureInitialized();
    return this.state.users.find((u) => u.id === id) || null;
  }

  public async listUsers(): Promise<User[]> {
    this.ensureInitialized();
    return [...this.state.users];
  }

  public async createUser(userData: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    departmentId?: string;
    departmentName?: string;
  }): Promise<User> {
    this.ensureInitialized();
    const existing = await this.findUserByEmail(userData.email);
    if (existing) {
      throw new Error(`User with email ${userData.email} already exists`);
    }

    const newUser: User = {
      id: uuidv4(),
      email: userData.email.trim().toLowerCase(),
      passwordHash: userData.passwordHash,
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      role: userData.role,
      departmentId: userData.departmentId,
      departmentName: userData.departmentName,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.users.push(newUser);
    this.persist();
    return newUser;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    this.ensureInitialized();
    const index = this.state.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    this.state.users[index] = {
      ...this.state.users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.state.users[index];
  }

  public async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshTokenRecord> {
    this.ensureInitialized();
    const record: RefreshTokenRecord = {
      id: uuidv4(),
      userId,
      token,
      expiresAt: expiresAt.toISOString(),
      revoked: false,
      createdAt: new Date().toISOString(),
    };

    this.state.refreshTokens.push(record);
    this.persist();
    return record;
  }

  public async findRefreshToken(token: string): Promise<RefreshTokenRecord | null> {
    this.ensureInitialized();
    return this.state.refreshTokens.find((r) => r.token === token && !r.revoked) || null;
  }

  public async revokeRefreshToken(token: string): Promise<boolean> {
    this.ensureInitialized();
    const record = this.state.refreshTokens.find((r) => r.token === token);
    if (!record) return false;
    record.revoked = true;
    this.persist();
    return true;
  }

  public async revokeAllUserTokens(userId: string): Promise<number> {
    this.ensureInitialized();
    let count = 0;
    for (const record of this.state.refreshTokens) {
      if (record.userId === userId && !record.revoked) {
        record.revoked = true;
        count++;
      }
    }
    if (count > 0) this.persist();
    return count;
  }
}

// --- Expense Repository ---
const EXPENSE_DB_FILE = path.join(DATA_DIR, 'expense_store.json');
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
    if (fs.existsSync(EXPENSE_DB_FILE)) {
      try {
        const raw = fs.readFileSync(EXPENSE_DB_FILE, 'utf-8');
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
      fs.writeFileSync(EXPENSE_DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
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

// --- Budget Repository ---
const BUDGET_DB_FILE = path.join(DATA_DIR, 'budget_store.json');
export interface BudgetDatabaseState {
  departments: Department[];
  budgets: Budget[];
  reconciliations: ReconciliationRecord[];
}

export class BudgetRepository {
  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private readState(): BudgetDatabaseState {
    this.ensureDir();
    if (fs.existsSync(BUDGET_DB_FILE)) {
      try {
        const raw = fs.readFileSync(BUDGET_DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Error reading budget database file:', err);
      }
    }
    return { departments: [], budgets: [], reconciliations: [] };
  }

  private writeState(state: BudgetDatabaseState) {
    this.ensureDir();
    try {
      fs.writeFileSync(BUDGET_DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing budget database file:', err);
    }
  }

  public async listDepartments(): Promise<Department[]> {
    const state = this.readState();
    return [...state.departments];
  }

  public async findDepartmentById(id: string): Promise<Department | null> {
    const state = this.readState();
    return state.departments.find((d) => d.id === id) || null;
  }

  public async createDepartment(data: {
    id?: string;
    code: string;
    name: string;
    description?: string;
    managerId?: string;
  }): Promise<Department> {
    const state = this.readState();
    const existing = state.departments.find(
      (d) => d.code.toLowerCase() === data.code.toLowerCase() || d.name.toLowerCase() === data.name.toLowerCase()
    );
    if (existing) return existing;

    const newDept: Department = {
      id: data.id || uuidv4(),
      code: data.code.toUpperCase(),
      name: data.name.trim(),
      description: data.description,
      managerId: data.managerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.departments.push(newDept);
    this.writeState(state);
    return newDept;
  }

  public async listBudgets(params?: {
    departmentId?: string;
    fiscalYear?: number;
    period?: BudgetPeriod;
  }): Promise<Budget[]> {
    const state = this.readState();
    let filtered = [...state.budgets];
    if (params?.departmentId) {
      filtered = filtered.filter((b) => b.departmentId === params.departmentId);
    }
    if (params?.fiscalYear) {
      filtered = filtered.filter((b) => b.fiscalYear === params.fiscalYear);
    }
    if (params?.period) {
      filtered = filtered.filter((b) => b.period === params.period);
    }
    return filtered;
  }

  public async findBudgetById(id: string): Promise<Budget | null> {
    const state = this.readState();
    return state.budgets.find((b) => b.id === id) || null;
  }

  public async createBudget(data: {
    departmentId: string;
    departmentName: string;
    categoryId?: string;
    categoryName?: string;
    period: BudgetPeriod;
    fiscalYear: number;
    fiscalMonth?: number;
    allocatedAmount: number;
    currency?: Currency;
    thresholdWarningPercent?: number;
  }): Promise<Budget> {
    const state = this.readState();
    const id = uuidv4();
    const now = new Date().toISOString();

    const newBudget: Budget = {
      id,
      departmentId: data.departmentId,
      departmentName: data.departmentName,
      categoryId: data.categoryId || undefined,
      categoryName: data.categoryName || undefined,
      period: data.period,
      fiscalYear: data.fiscalYear,
      fiscalMonth: data.fiscalMonth,
      allocatedAmount: Number(data.allocatedAmount.toFixed(2)),
      currency: data.currency || 'USD',
      thresholdWarningPercent: data.thresholdWarningPercent ?? 80,
      createdAt: now,
      updatedAt: now,
    };

    state.budgets.push(newBudget);
    this.writeState(state);
    return newBudget;
  }

  public async updateBudget(
    id: string,
    updates: Partial<Pick<Budget, 'allocatedAmount' | 'thresholdWarningPercent'>>
  ): Promise<Budget | null> {
    const state = this.readState();
    const index = state.budgets.findIndex((b) => b.id === id);
    if (index === -1) return null;

    state.budgets[index] = {
      ...state.budgets[index],
      ...updates,
      allocatedAmount:
        updates.allocatedAmount !== undefined
          ? Number(updates.allocatedAmount.toFixed(2))
          : state.budgets[index].allocatedAmount,
      updatedAt: new Date().toISOString(),
    };

    this.writeState(state);
    return state.budgets[index];
  }

  public async deleteBudget(id: string): Promise<boolean> {
    const state = this.readState();
    const initialLen = state.budgets.length;
    state.budgets = state.budgets.filter((b) => b.id !== id);
    if (state.budgets.length === initialLen) return false;
    this.writeState(state);
    return true;
  }

  public async saveReconciliation(record: Omit<ReconciliationRecord, 'id' | 'reconciledAt'>): Promise<ReconciliationRecord> {
    const state = this.readState();
    const newRecord: ReconciliationRecord = {
      ...record,
      id: uuidv4(),
      reconciledAt: new Date().toISOString(),
    };

    state.reconciliations.unshift(newRecord);
    this.writeState(state);
    return newRecord;
  }

  public async listReconciliations(params?: {
    departmentId?: string;
    fiscalYear?: number;
  }): Promise<ReconciliationRecord[]> {
    const state = this.readState();
    let filtered = [...state.reconciliations];
    if (params?.departmentId) {
      filtered = filtered.filter((r) => r.departmentId === params.departmentId);
    }
    if (params?.fiscalYear) {
      filtered = filtered.filter((r) => r.fiscalYear === params.fiscalYear);
    }
    return filtered;
  }
}

export const authRepo = new AuthRepository();
export const expenseRepo = new ExpenseRepository();
export const budgetRepo = new BudgetRepository();
