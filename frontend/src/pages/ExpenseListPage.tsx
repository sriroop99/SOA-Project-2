import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  Send,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { Expense, ExpenseCategory, ExpenseStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export const ExpenseListPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeInstance, setActiveInstance] = useState<string>('');

  // Filter & Pagination state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.listExpenses({
        page,
        limit,
        search: search || undefined,
        status: (status as ExpenseStatus) || undefined,
        categoryId: categoryId || undefined,
      });
      setExpenses(res.items);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
      if (res.meta.instanceId) setActiveInstance(res.meta.instanceId);
    } catch (err: any) {
      notifyError(err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getExpenseCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [page, status, categoryId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchExpenses();
  };

  const handleSubmitDraft = async (id: string) => {
    try {
      await api.updateExpense(id, { submitNow: true });
      success('Expense submitted for financial approval');
      fetchExpenses();
    } catch (err: any) {
      notifyError(err.message || 'Failed to submit expense');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteExpense(id);
      success('Draft expense deleted');
      setDeletingId(null);
      fetchExpenses();
    } catch (err: any) {
      notifyError(err.message || 'Cannot delete expense');
    }
  };

  const getStatusBadge = (st: ExpenseStatus) => {
    switch (st) {
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">APPROVED</span>;
      case 'SUBMITTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">SUBMITTED</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">REJECTED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">DRAFT</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Corporate Expenses</h1>
          <p className="text-sm text-slate-500">
            {user?.role === 'EMPLOYEE'
              ? 'Track and manage your submitted corporate expense claims'
              : 'Enterprise-wide corporate expenditure transactions'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeInstance && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              LB Node: {activeInstance}
            </span>
          )}
          <button
            onClick={fetchExpenses}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
          <Link
            to="/expenses/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Expense
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor, description, or employee..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-[180px] truncate"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Vendor & Details</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Fetching expense records...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No expense records found matching current criteria.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {exp.expenseDate}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 leading-tight">{exp.employeeName}</div>
                      <div className="text-[11px] text-slate-400">{exp.departmentName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {exp.categoryName}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{exp.vendor}</div>
                      <div className="text-[11px] text-slate-500 truncate">{exp.description}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right whitespace-nowrap text-sm">
                      ${exp.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(exp.status)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/expenses/${exp.id}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {/* Edit permitted only on DRAFT or REJECTED */}
                        {(exp.status === 'DRAFT' || exp.status === 'REJECTED') && (
                          <Link
                            to={`/expenses/${exp.id}/edit`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            title="Edit Expense"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                        )}

                        {/* Submit draft action */}
                        {exp.status === 'DRAFT' && (
                          <button
                            onClick={() => handleSubmitDraft(exp.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50"
                            title="Submit for Approval"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete only permitted on DRAFT */}
                        {exp.status === 'DRAFT' && (
                          <button
                            onClick={() => setDeletingId(exp.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="py-3 px-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold">{expenses.length}</span> of{' '}
            <span className="font-semibold">{total}</span> total entries
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1 rounded border bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1 rounded border bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Draft Expense?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently remove this draft claim? This action cannot be reversed.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Delete Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
