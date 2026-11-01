import {
  AnalyticsSummary,
  Budget,
  BudgetPeriod,
  CategorySpending,
  Department,
  DepartmentSpending,
  Expense,
  ExpenseCategory,
  ExpenseStatusHistory,
  MonthlySpending,
  ReconciliationRecord,
  User,
} from '../types';

const API_BASE = '/api';

class ApiClient {
  private accessToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('spendwise_access_token');
  }

  public setToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem('spendwise_access_token', token);
    } else {
      localStorage.removeItem('spendwise_access_token');
    }
  }

  public getToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Attempt token refresh if available
      const refreshToken = localStorage.getItem('spendwise_refresh_token');
      if (refreshToken && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            this.setToken(refreshData.data.accessToken);
            localStorage.setItem('spendwise_refresh_token', refreshData.data.refreshToken);

            // Retry original request
            headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
            const retryRes = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
            const retryData = await retryRes.json();
            if (!retryRes.ok) throw new Error(retryData.error?.message || 'Request failed');
            return retryData.data;
          }
        } catch {
          // Refresh failed
        }
      }
    }

    let data: any;
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Cannot reach Backend API (HTTP ${response.status}). Please make sure "npm.cmd run dev" is running in your VS Code terminal.`);
    }

    if (!response.ok) {
      throw new Error(data.error?.message || data.message || `Server error (${response.status})`);
    }

    return data.data;
  }

  // --- Auth ---
  public async login(credentials: { email: string; password: string }) {
    const res: any = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    this.setToken(res.accessToken);
    localStorage.setItem('spendwise_refresh_token', res.refreshToken);
    return res;
  }

  public async register(payload: any) {
    const res: any = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.accessToken);
    localStorage.setItem('spendwise_refresh_token', res.refreshToken);
    return res;
  }

  public async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  public async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  public logout() {
    const refreshToken = localStorage.getItem('spendwise_refresh_token');
    if (refreshToken) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    this.setToken(null);
    localStorage.removeItem('spendwise_refresh_token');
    localStorage.removeItem('spendwise_user');
  }

  // --- Expenses ---
  public async listExpenses(params: Record<string, any> = {}): Promise<{
    items: Expense[];
    meta: { page: number; limit: number; total: number; totalPages: number; instanceId?: string };
  }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });

    const res = await fetch(`${API_BASE}/expenses?${query.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
      },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Failed to list expenses');
    return {
      items: json.data || [],
      meta: json.meta || { page: 1, limit: 10, total: json.data?.length || 0, totalPages: 1 },
    };
  }

  public async getExpenseById(id: string): Promise<Expense> {
    return this.request<Expense>(`/expenses/${id}`);
  }

  public async createExpense(payload: any): Promise<Expense> {
    return this.request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateExpense(id: string, updates: any): Promise<Expense> {
    return this.request<Expense>(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async deleteExpense(id: string): Promise<{ deleted: boolean; id: string }> {
    return this.request(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  public async reviewExpense(id: string, decision: { status: 'APPROVED' | 'REJECTED'; comments?: string; rejectionReason?: string }): Promise<Expense> {
    return this.request<Expense>(`/expenses/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(decision),
    });
  }

  public async getExpenseHistory(id: string): Promise<ExpenseStatusHistory[]> {
    return this.request<ExpenseStatusHistory[]>(`/expenses/${id}/history`);
  }

  public async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return this.request<ExpenseCategory[]>('/expenses/categories');
  }

  public async getExpenseDiagnostic(): Promise<{
    instanceId: string;
    port: number;
    uptime: number;
    databaseStatus: string;
    totalExpensesCount: number;
    timestamp: string;
  }> {
    return this.request('/expenses/diagnostic');
  }

  // --- Budgets ---
  public async listBudgets(params: Record<string, any> = {}): Promise<Budget[]> {
    const query = new URLSearchParams(params).toString();
    return this.request<Budget[]>(`/budgets${query ? `?${query}` : ''}`);
  }

  public async createBudget(payload: any): Promise<Budget> {
    return this.request<Budget>('/budgets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateBudget(id: string, payload: any): Promise<Budget> {
    return this.request<Budget>(`/budgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async deleteBudget(id: string): Promise<boolean> {
    return this.request(`/budgets/${id}`, {
      method: 'DELETE',
    });
  }

  public async runReconciliation(payload: {
    departmentId: string;
    categoryId?: string;
    period: BudgetPeriod;
    fiscalYear: number;
    fiscalMonth?: number;
    notes?: string;
  }): Promise<ReconciliationRecord> {
    return this.request<ReconciliationRecord>('/budgets/reconcile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async listReconciliations(params: Record<string, any> = {}): Promise<ReconciliationRecord[]> {
    const query = new URLSearchParams(params).toString();
    return this.request<ReconciliationRecord[]>(`/budgets/reconciliations${query ? `?${query}` : ''}`);
  }

  // --- Departments ---
  public async listDepartments(): Promise<Department[]> {
    return this.request<Department[]>('/departments');
  }

  public async createDepartment(payload: { code: string; name: string; description?: string }): Promise<Department> {
    return this.request<Department>('/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Analytics ---
  public async getDashboardData(year: number = 2026): Promise<{
    summary: AnalyticsSummary;
    monthlyTrends: MonthlySpending[];
    departmentSpending: DepartmentSpending[];
    categoryDistribution: CategorySpending[];
    recentExpenses: Expense[];
  }> {
    return this.request(`/analytics/dashboard?year=${year}`);
  }

  public getExportCSVUrl(filters: Record<string, string> = {}): string {
    const query = new URLSearchParams(filters).toString();
    return `${API_BASE}/analytics/export/csv${query ? `?${query}` : ''}`;
  }
}

export const api = new ApiClient();
