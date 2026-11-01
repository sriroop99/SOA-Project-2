import React, { useEffect, useState } from 'react';
import {
  Download,
  Filter,
  BarChart3,
  Calendar,
  Building,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../services/api';
import { Department, ExpenseCategory } from '../types';
import { useNotification } from '../contexts/NotificationContext';

export const AnalyticsReportsPage: React.FC = () => {
  const { error: notifyError } = useNotification();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for CSV Export
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  useEffect(() => {
    Promise.all([api.listDepartments(), api.getExpenseCategories()])
      .then(([dList, cList]) => {
        setDepartments(dList);
        setCategories(cList);
        setLoading(false);
      })
      .catch((err) => {
        notifyError(err.message || 'Failed to load report filters');
        setLoading(false);
      });
  }, []);

  const handleDownloadCSV = () => {
    const filters: Record<string, string> = {};
    if (departmentId) filters.departmentId = departmentId;
    if (categoryId) filters.categoryId = categoryId;
    if (status) filters.status = status;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const url = api.getExportCSVUrl(filters);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Reports & Exports</h1>
          <p className="text-sm text-slate-500">
            Export granular corporate financial expenditure reports and audit ledgers in CSV format
          </p>
        </div>

        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-md shadow-teal-500/20 transition-colors self-start"
        >
          <Download className="w-4 h-4" />
          Export Report (CSV)
        </button>
      </div>

      {/* Filter Control Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Filter className="w-4 h-4 text-teal-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Report Export Parameters & Filters
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:bg-white"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Expense Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Claim Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:bg-white"
            >
              <option value="">All Statuses (Draft, Submitted, Approved, Rejected)</option>
              <option value="APPROVED">Approved Only (General Ledger)</option>
              <option value="SUBMITTED">Submitted Only</option>
              <option value="REJECTED">Rejected Only</option>
              <option value="DRAFT">Drafts Only</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Report Types Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Department Variance Report</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Authorized vs actual spending analysis per department with remaining balances and alert indicators.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Category Expenditure Summary</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Consolidated breakdown across software subscriptions, travel, equipment, meals, and conferences.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Annual Reconciliation Ledger</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Comprehensive audit snapshot for fiscal year compliance, tax preparation, and general ledger audit.
          </p>
        </div>
      </div>
    </div>
  );
};
