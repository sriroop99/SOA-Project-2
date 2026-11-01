import React, { useEffect, useState } from 'react';
import {
  Plus,
  RefreshCw,
  PieChart,
  Edit2,
  Trash2,
  Building,
  AlertCircle,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { api } from '../services/api';
import { Budget, BudgetPeriod, Department, ExpenseCategory } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export const BudgetManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('ANNUAL');
  const [fiscalYear, setFiscalYear] = useState(2026);
  const [fiscalMonth, setFiscalMonth] = useState(1);
  const [allocatedAmount, setAllocatedAmount] = useState('');
  const [thresholdWarning, setThresholdWarning] = useState(80);
  const [saving, setSaving] = useState(false);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const [bList, dList, cList] = await Promise.all([
        api.listBudgets(),
        api.listDepartments(),
        api.getExpenseCategories(),
      ]);
      setBudgets(bList);
      setDepartments(dList);
      setCategories(cList);
      if (dList.length > 0 && !departmentId) setDepartmentId(dList[0].id);
    } catch (err: any) {
      notifyError(err.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const openCreateModal = () => {
    setEditingBudget(null);
    setAllocatedAmount('');
    setThresholdWarning(80);
    setPeriod('ANNUAL');
    setModalOpen(true);
  };

  const openEditModal = (b: Budget) => {
    setEditingBudget(b);
    setAllocatedAmount(String(b.allocatedAmount));
    setThresholdWarning(b.thresholdWarningPercent);
    setModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(allocatedAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      notifyError('Allocated budget must be zero or positive');
      return;
    }

    setSaving(true);
    try {
      if (editingBudget) {
        await api.updateBudget(editingBudget.id, {
          allocatedAmount: amountNum,
          thresholdWarningPercent: thresholdWarning,
        });
        success('Budget updated successfully');
      } else {
        await api.createBudget({
          departmentId,
          categoryId: categoryId || undefined,
          period,
          fiscalYear,
          fiscalMonth: period === 'MONTHLY' ? fiscalMonth : undefined,
          allocatedAmount: amountNum,
          thresholdWarningPercent: thresholdWarning,
        });
        success('New budget allocated successfully');
      }

      setModalOpen(false);
      fetchBudgets();
    } catch (err: any) {
      notifyError(err.message || 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this budget allocation?')) return;
    try {
      await api.deleteBudget(id);
      success('Budget allocation deleted');
      fetchBudgets();
    } catch (err: any) {
      notifyError(err.message || 'Failed to delete budget');
    }
  };

  const isFinanceOrAdmin = user?.role === 'ADMIN' || user?.role === 'FINANCE_MANAGER';
  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Corporate Budget Management</h1>
          <p className="text-sm text-slate-500">
            Define and manage authorized expenditure allocations across business units and cost centers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold">
            Total Allocated: <span className="font-mono font-bold">${totalAllocated.toLocaleString()}</span>
          </div>
          <button
            onClick={fetchBudgets}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
            title="Refresh Budgets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
          {isFinanceOrAdmin && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Allocate Budget
            </button>
          )}
        </div>
      </div>

      {/* Budget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && budgets.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
            Loading budget pool...
          </div>
        ) : budgets.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border p-8">
            <PieChart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No active budget allocations defined.
          </div>
        ) : (
          budgets.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Building className="w-3.5 h-3.5 text-teal-600" />
                    {b.departmentName}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {b.categoryName ? b.categoryName : 'Department-Wide General Pool'}
                  </div>
                </div>

                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {b.period} • {b.fiscalYear} {b.fiscalMonth ? `M${b.fiscalMonth}` : ''}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Authorized Amount</span>
                  <div className="text-xl font-bold font-mono text-slate-900">
                    ${b.allocatedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Warning Limit</span>
                  <div className="text-xs font-bold font-mono text-amber-600">
                    {b.thresholdWarningPercent}%
                  </div>
                </div>
              </div>

              {isFinanceOrAdmin && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(b)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 text-xs font-semibold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => handleDeleteBudget(b.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingBudget ? 'Edit Budget Allocation' : 'Create New Budget Allocation'}
            </h3>

            <form onSubmit={handleSaveBudget} className="space-y-3.5">
              {!editingBudget && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Department *</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Expense Category (Optional - leave blank for all)
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white truncate"
                    >
                      <option value="">All Categories (General Pool)</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Period</label>
                      <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white"
                      >
                        <option value="ANNUAL">Annual</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fiscal Year</label>
                      <input
                        type="number"
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(parseInt(e.target.value, 10))}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white font-mono"
                      />
                    </div>
                  </div>

                  {period === 'MONTHLY' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fiscal Month (1-12)</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={fiscalMonth}
                        onChange={(e) => setFiscalMonth(parseInt(e.target.value, 10))}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white font-mono"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Allocated Amount ($ USD) *</label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  required
                  value={allocatedAmount}
                  onChange={(e) => setAllocatedAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white font-mono text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Threshold Overrun Warning Trigger ({thresholdWarning}%)
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={thresholdWarning}
                  onChange={(e) => setThresholdWarning(parseInt(e.target.value, 10))}
                  className="w-full accent-teal-600"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm"
                >
                  {saving ? 'Saving...' : editingBudget ? 'Update Budget' : 'Allocate Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
