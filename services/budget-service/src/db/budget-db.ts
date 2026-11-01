import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Budget,
  BudgetPeriod,
  Currency,
  Department,
  ReconciliationRecord,
} from '@spendwise/shared';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'budget_store.json');

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
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
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
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing budget database file:', err);
    }
  }

  // --- Department Operations ---

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

  // --- Budget Operations ---

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

  // --- Reconciliation Records ---

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

export const budgetRepo = new BudgetRepository();
