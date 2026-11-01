import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  User,
  Building,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { api } from '../services/api';
import { Expense } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export const ApprovalQueuePage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [queue, setQueue] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [action, setAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [comment, setComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.listExpenses({ status: 'SUBMITTED', limit: 50 });
      setQueue(res.items);
    } catch (err: any) {
      notifyError(err.message || 'Failed to load approval queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const openReviewModal = (exp: Expense, decision: 'APPROVED' | 'REJECTED') => {
    if (exp.employeeId === user?.id) {
      notifyError('Segregation of duties: You cannot approve or review your own financial claim');
      return;
    }
    setSelectedExpense(exp);
    setAction(decision);
    setComment('');
    setRejectionReason('');
  };

  const handleConfirmReview = async () => {
    if (!selectedExpense) return;
    if (action === 'REJECTED' && !rejectionReason.trim()) {
      notifyError('Please specify the rejection reason');
      return;
    }

    setSubmitting(true);
    try {
      await api.reviewExpense(selectedExpense.id, {
        status: action,
        comments: comment.trim() || undefined,
        rejectionReason: action === 'REJECTED' ? rejectionReason.trim() : undefined,
      });

      success(`Expense successfully ${action.toLowerCase()}`);
      setSelectedExpense(null);
      fetchQueue();
    } catch (err: any) {
      notifyError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPendingAmount = queue.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Approval Queue</h1>
          <p className="text-sm text-slate-500">
            Pending claims requiring authorization by Finance Managers and Administrators
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
            {queue.length} Pending (${totalPendingAmount.toFixed(2)})
          </div>
          <button
            onClick={fetchQueue}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Claimant</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Category & Vendor</th>
                <th className="py-3 px-4">Submission Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Duty Check</th>
                <th className="py-3 px-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && queue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Loading approval queue...
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckSquare className="w-8 h-8 mx-auto mb-2 text-teal-500" />
                    All caught up! No expense claims currently awaiting review.
                  </td>
                </tr>
              ) : (
                queue.map((exp) => {
                  const isOwnClaim = exp.employeeId === user?.id;
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{exp.employeeName}</div>
                        <div className="text-[11px] text-slate-400">{exp.employeeEmail}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {exp.departmentName}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{exp.vendor}</div>
                        <div className="text-[11px] text-slate-500 truncate">{exp.categoryName} • {exp.description}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {exp.submissionDate ? new Date(exp.submissionDate).toLocaleDateString() : exp.expenseDate}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right text-sm whitespace-nowrap">
                        ${exp.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isOwnClaim ? (
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Self (Restricted)
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            Eligible
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/expenses/${exp.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <button
                            disabled={isOwnClaim}
                            onClick={() => openReviewModal(exp, 'APPROVED')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm disabled:opacity-40"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>

                          <button
                            disabled={isOwnClaim}
                            onClick={() => openReviewModal(exp, 'REJECTED')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold disabled:opacity-40"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {action === 'APPROVED' ? 'Confirm Expense Approval' : 'Reject Expense Claim'}
            </h3>
            <p className="text-xs text-slate-600">
              Claim for <span className="font-semibold text-slate-900">${selectedExpense.amount.toFixed(2)}</span> submitted by{' '}
              <span className="font-semibold text-slate-900">{selectedExpense.employeeName}</span> ({selectedExpense.vendor}).
            </p>

            {action === 'APPROVED' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approval Notes / Accounting Code (Optional)
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Budget allocation verified and approved for reimbursement..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Receipt unreadable; personal expense not covered by corporate policy..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setSelectedExpense(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmReview}
                className={`flex-1 py-2 text-xs font-semibold text-white rounded-lg shadow-sm ${
                  action === 'APPROVED' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'Processing...' : action === 'APPROVED' ? 'Approve Claim' : 'Reject Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
