import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Building,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { AnalyticsSummary, CategorySpending, DepartmentSpending, Expense, MonthlySpending } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    summary: AnalyticsSummary;
    monthlyTrends: MonthlySpending[];
    departmentSpending: DepartmentSpending[];
    categoryDistribution: CategorySpending[];
    recentExpenses: Expense[];
  } | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardData();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const COLORS = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981'];

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Financial Analytics...</p>
        </div>
      </div>
    );
  }

  const { summary, monthlyTrends, departmentSpending, categoryDistribution, recentExpenses } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Financial Dashboard</h1>
          <p className="text-sm text-slate-500">
            Welcome back, <span className="font-semibold text-slate-800">{user?.firstName} {user?.lastName}</span>. Here is the corporate spending & budget status for FY 2026.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboard}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/expenses/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Expense Claim
          </Link>
        </div>
      </div>

      {/* Over-budget warning alert if applicable */}
      {summary.overBudgetCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Budget Variance Alert</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              {summary.overBudgetCount} department(s) have exceeded allocated expenditure thresholds. Review departmental allocations in Reconciliation.
            </p>
          </div>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Spending */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Approved Spending</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ${summary.totalApprovedExpenditure.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-teal-600">{summary.utilizationPercentage}%</span> of total budget utilized
          </div>
        </div>

        {/* Total Allocated */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Allocated Budget</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <PieChartIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ${summary.totalAllocatedBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500">FY 2026 total authorized pool</div>
        </div>

        {/* Budget Variance */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Remaining / Variance</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                summary.totalBudgetVariance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {summary.totalBudgetVariance >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl font-bold font-mono ${
              summary.totalBudgetVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            ${summary.totalRemainingBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500">
            {summary.totalBudgetVariance >= 0 ? 'Under budget' : 'Over budget'}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ${summary.pendingApprovalsAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-amber-600">{summary.pendingApprovalsCount}</span> claim(s) awaiting review
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Area Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Expenditure Trends</h3>
              <p className="text-xs text-slate-500">Actual vs authorized pro-rated monthly budget</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono">
              USD ($)
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  name="Approved Spending"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#actualGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="allocated"
                  name="Budget Baseline"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Pie Chart */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Category Distribution</h3>
            <p className="text-xs text-slate-500">Spending breakdown by expense type</p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  dataKey="amount"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {categoryDistribution.map((cat, i) => (
              <div key={cat.categoryId} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600 truncate">{cat.categoryName}</span>
                </div>
                <span className="font-semibold text-slate-900 shrink-0 font-mono">${cat.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Breakdown & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Spending Table */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Department Allocations & Utilization</h3>
              <p className="text-xs text-slate-500">Live reconciliation balances</p>
            </div>
            <Link to="/budgets" className="text-xs text-teal-600 hover:text-teal-700 font-semibold">
              Manage Budgets →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2 px-3">Department</th>
                  <th className="py-2 px-3">Allocated</th>
                  <th className="py-2 px-3">Actual</th>
                  <th className="py-2 px-3">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departmentSpending.map((dept) => (
                  <tr key={dept.departmentId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-medium text-slate-900 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {dept.departmentName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">${dept.allocated.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900">${dept.actual.toLocaleString()}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              dept.utilizationPercent >= 100
                                ? 'bg-rose-500'
                                : dept.utilizationPercent >= 80
                                ? 'bg-amber-500'
                                : 'bg-teal-500'
                            }`}
                            style={{ width: `${Math.min(100, dept.utilizationPercent)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-600 font-semibold">
                          {dept.utilizationPercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Expenses List */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Financial Transactions</h3>
              <p className="text-xs text-slate-500">Latest expense claims submitted</p>
            </div>
            <Link to="/expenses" className="text-xs text-teal-600 hover:text-teal-700 font-semibold">
              View All ({summary.totalExpensesCount}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2 px-3">Vendor & Description</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900 truncate max-w-[160px]">{exp.vendor}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[160px]">{exp.description}</div>
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{exp.expenseDate}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">${exp.amount.toFixed(2)}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          exp.status === 'APPROVED'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : exp.status === 'SUBMITTED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : exp.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
