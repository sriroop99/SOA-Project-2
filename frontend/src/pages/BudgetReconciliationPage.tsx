import React, { useEffect, useState } from 'react';
import {
  Scale,
  Play,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  History,
  TrendingUp,
  FileSpreadsheet,
  Building,
} from 'lucide-react';
import { api } from '../services/api';
import { BudgetPeriod, Department, ExpenseCategory, ReconciliationRecord } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export const BudgetReconciliationPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [history, setHistory] = useState<ReconciliationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // Form parameters
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('ANNUAL');
  const [fiscalYear, setFiscalYear] = useState(2026);
  const [fiscalMonth, setFiscalMonth] = useState(1);
  const [notes, setNotes] = useState('');

  // Latest Result
  const [activeResult, setActiveResult] = useState<ReconciliationRecord | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dList, cList, hList] = await Promise.all([
        api.listDepartments(),
        api.getExpenseCategories(),
        api.listReconciliations(),
      ]);
      setDepartments(dList);
      setCategories(cList);
      setHistory(hList);
      if (dList.length > 0 && !departmentId) setDepartmentId(dList[0].id);
      if (hList.length > 0) setActiveResult(hList[0]);
    } catch (err: any) {
      notifyError(err.message || 'Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) {
      notifyError('Please select a department');
      return;
    }

    setCalculating(true);
    try {
      const res = await api.runReconciliation({
        departmentId,
        categoryId: categoryId || undefined,
        period,
        fiscalYear,
        fiscalMonth: period === 'MONTHLY' ? fiscalMonth : undefined,
        notes: notes.trim() || undefined,
      });

      setActiveResult(res);
      success('Financial reconciliation completed and snapshot saved');
      // Refresh history table
      const updatedHistory = await api.listReconciliations();
      setHistory(updatedHistory);
    } catch (err: any) {
      notifyError(err.message || 'Failed to run reconciliation');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Budget Reconciliation</h1>
          <p className="text-sm text-slate-500">
            Compare authorized budget allocations with actual ledger expenditures and compute financial variances
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm self-start"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Run Reconciliation */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <Scale className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
              Reconciliation Parameters
            </h3>
          </div>

          <form onSubmit={handleRunReconciliation} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Department *</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category (Optional)</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs truncate"
              >
                <option value="">All Categories (General Ledger)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Period</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
                >
                  <option value="ANNUAL">Annual</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fiscal Year</label>
                <input
                  type="number"
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono"
                />
              </div>
            </div>

            {period === 'MONTHLY' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fiscal Month (1-12)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={fiscalMonth}
                  onChange={(e) => setFiscalMonth(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Audit Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. End of Quarter reconciliation check against general ledger..."
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={calculating}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md shadow-teal-500/20 disabled:opacity-50"
            >
              {calculating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Engine Calculations...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Live Reconciliation
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right 2 Columns: Live Calculation Card */}
        <div className="lg:col-span-2 space-y-4">
          {activeResult ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
                    Reconciliation Snapshot
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    {activeResult.departmentName}
                  </h2>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Scope: {activeResult.categoryName || 'General Pool'} • {activeResult.period} {activeResult.fiscalYear} {activeResult.fiscalMonth ? `M${activeResult.fiscalMonth}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeResult.isOverBudget ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      OVER BUDGET
                    </span>
                  ) : activeResult.variance === 0 ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                      EXACTLY ON BUDGET
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      UNDER BUDGET
                    </span>
                  )}
                </div>
              </div>

              {/* Financial Variance Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Allocated Budget</span>
                  <div className="text-lg font-bold font-mono text-slate-900">
                    ${activeResult.allocatedBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Actual Expenditure</span>
                  <div className="text-lg font-bold font-mono text-slate-900">
                    ${activeResult.actualExpenditure.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">Approved claims</div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border space-y-1 ${
                    activeResult.variance >= 0
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/70 border-rose-200 text-rose-900'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold">Budget Variance</span>
                  <div className="text-lg font-bold font-mono">
                    ${activeResult.variance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-semibold">
                    {activeResult.variance >= 0 ? 'Surplus balance' : 'Deficit / Overrun'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Utilization %</span>
                  <div className="text-lg font-bold font-mono text-slate-900">
                    {activeResult.utilizationPercent}%
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">
                    {activeResult.warningTriggered ? 'Triggered alert' : 'Within threshold'}
                  </div>
                </div>
              </div>

              {/* Pending Pipeline Notice */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                <span>
                  Pending Unapproved Claims in Pipeline:{' '}
                  <span className="font-bold font-mono">${activeResult.pendingExpenditure.toFixed(2)}</span>
                </span>
                <span className="text-[11px] text-amber-700">
                  (Excluded from ledger actuals until approved)
                </span>
              </div>

              {activeResult.notes && (
                <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700">
                  <span className="font-bold text-slate-900">Auditor Notes:</span> {activeResult.notes}
                </div>
              )}

              <div className="text-[11px] text-slate-400 flex items-center justify-between border-t pt-2 font-mono">
                <span>Reconciled By: {activeResult.reconciledByName}</span>
                <span>Timestamp: {new Date(activeResult.reconciledAt).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <Scale className="w-10 h-10 mx-auto text-slate-300" />
              <h4 className="text-sm font-semibold text-slate-700">No Active Reconciliation Computed</h4>
              <p className="text-xs text-slate-400">
                Configure parameters on the left and run live reconciliation to view variance metrics.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Historical Reconciliations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-2 p-5">
        <div className="flex items-center gap-2 border-b pb-3">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Historical Reconciliation Audit Records</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Scope</th>
                <th className="py-2.5 px-3 text-right">Allocated</th>
                <th className="py-2.5 px-3 text-right">Actual</th>
                <th className="py-2.5 px-3 text-right">Variance</th>
                <th className="py-2.5 px-3 text-center">Utilization</th>
                <th className="py-2.5 px-3">Auditor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((rec) => (
                <tr
                  key={rec.id}
                  onClick={() => setActiveResult(rec)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                    {new Date(rec.reconciledAt).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{rec.departmentName}</td>
                  <td className="py-2.5 px-3 text-slate-600">{rec.categoryName || 'General'}</td>
                  <td className="py-2.5 px-3 font-mono text-right text-slate-700">${rec.allocatedBudget.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-mono text-right font-medium text-slate-900">${rec.actualExpenditure.toLocaleString()}</td>
                  <td
                    className={`py-2.5 px-3 font-mono font-bold text-right ${
                      rec.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    ${rec.variance.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        rec.isOverBudget
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}
                    >
                      {rec.utilizationPercent}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{rec.reconciledByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
