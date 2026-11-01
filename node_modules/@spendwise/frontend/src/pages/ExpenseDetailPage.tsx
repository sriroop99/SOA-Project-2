import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Building,
  Calendar,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Edit2,
} from 'lucide-react';
import { api } from '../services/api';
import { Expense, ExpenseStatusHistory } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export const ExpenseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [history, setHistory] = useState<ExpenseStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const exp = await api.getExpenseById(id);
      setExpense(exp);
      const hist = await api.getExpenseHistory(id);
      setHistory(hist);
    } catch (err: any) {
      notifyError(err.message || 'Failed to fetch expense details');
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleReviewSubmit = async () => {
    if (!expense) return;
    if (reviewDecision === 'REJECTED' && !rejectionReason.trim()) {
      notifyError('Please specify the reason for rejecting this claim');
      return;
    }

    setReviewing(true);
    try {
      await api.reviewExpense(expense.id, {
        status: reviewDecision,
        comments: comments.trim() || undefined,
        rejectionReason: reviewDecision === 'REJECTED' ? rejectionReason.trim() : undefined,
      });

      success(`Expense successfully ${reviewDecision.toLowerCase()}`);
      setReviewModalOpen(false);
      fetchDetails();
    } catch (err: any) {
      notifyError(err.message || 'Failed to submit review');
    } finally {
      setReviewing(false);
    }
  };

  if (loading || !expense) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  const canReview =
    (user?.role === 'FINANCE_MANAGER' || user?.role === 'ADMIN') &&
    expense.status === 'SUBMITTED' &&
    expense.employeeId !== user?.id; // Segregation of duties rule!

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/expenses"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{expense.vendor}</h1>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  expense.status === 'APPROVED'
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : expense.status === 'SUBMITTED'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : expense.status === 'REJECTED'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {expense.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Claim ID: {expense.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canReview && (
            <button
              onClick={() => {
                setReviewDecision('APPROVED');
                setReviewModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Review Expense Claim
            </button>
          )}

          {(expense.status === 'DRAFT' || expense.status === 'REJECTED') && (
            <Link
              to={`/expenses/${expense.id}/edit`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm"
            >
              <Edit2 className="w-4 h-4 text-slate-500" />
              Edit Claim
            </Link>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Financial Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs border-b pb-2">
              Financial & Payee Information
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Amount</span>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
                  ${expense.amount.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">{expense.currency}</div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Expense Date</span>
                <div className="text-sm font-semibold text-slate-800 font-mono mt-1">
                  {expense.expenseDate}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Category</span>
                <div className="text-sm font-semibold text-slate-800 mt-1">
                  {expense.categoryName}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Commercial Purpose</span>
              <p className="text-sm text-slate-700 mt-1 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {expense.description}
              </p>
            </div>

            {expense.receiptUrl && (
              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-teal-50/50 border border-teal-100">
                <span className="text-xs font-semibold text-teal-900">Digital Invoice / Proof of Payment Attached</span>
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-teal-600 hover:underline font-bold"
                >
                  View Attachment <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Card: Reviewer Decision (if reviewed) */}
          {expense.reviewedBy && (
            <div
              className={`rounded-2xl p-5 border shadow-sm space-y-2 ${
                expense.status === 'APPROVED'
                  ? 'bg-teal-50/70 border-teal-200'
                  : 'bg-rose-50/70 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className={`w-5 h-5 ${
                    expense.status === 'APPROVED' ? 'text-teal-600' : 'text-rose-600'
                  }`}
                />
                <h4 className="text-sm font-bold text-slate-900">
                  {expense.status === 'APPROVED' ? 'Finance Verification & Approval' : 'Claim Rejection'}
                </h4>
              </div>
              <div className="text-xs text-slate-600">
                Reviewed by <span className="font-semibold text-slate-800">{expense.reviewedByName}</span> on{' '}
                <span className="font-mono">{expense.reviewDate ? new Date(expense.reviewDate).toLocaleString() : 'N/A'}</span>
              </div>
              {expense.comments && (
                <p className="text-xs text-slate-700 bg-white/70 p-2.5 rounded-lg border mt-1">
                  {expense.comments}
                </p>
              )}
              {expense.rejectionReason && (
                <p className="text-xs text-rose-800 font-medium bg-rose-100/70 p-2.5 rounded-lg border border-rose-200 mt-1">
                  Reason for rejection: {expense.rejectionReason}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Metadata & Status History */}
        <div className="space-y-6">
          {/* Employee Metadata */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
              Claimant Profile
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <User className="w-4 h-4 text-slate-400" />
                {expense.employeeName}
              </div>
              <div className="text-slate-500 font-mono text-[11px] pl-6">{expense.employeeEmail}</div>
              <div className="flex items-center gap-2 text-slate-700 pt-1">
                <Building className="w-4 h-4 text-slate-400" />
                {expense.departmentName}
              </div>
            </div>
          </div>

          {/* Audit History Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
              Status Audit History
            </h4>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {history.map((hist, idx) => (
                <div key={hist.id} className="relative text-xs">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-teal-500 ring-4 ring-white" />
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span>{hist.toStatus}</span>
                    <span className="text-[10px] text-slate-400 font-normal">by {hist.changedByName}</span>
                  </div>
                  {hist.reason && <p className="text-slate-500 text-[11px] mt-0.5 italic">{hist.reason}</p>}
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {new Date(hist.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                    {new Date(hist.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Review Dialog */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Review Financial Expense Claim</h3>
            <p className="text-xs text-slate-500">
              Review claim from {expense.employeeName} for ${expense.amount.toFixed(2)} ({expense.vendor}).
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReviewDecision('APPROVED')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  reviewDecision === 'APPROVED'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Approve Claim
              </button>
              <button
                type="button"
                onClick={() => setReviewDecision('REJECTED')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  reviewDecision === 'REJECTED'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Reject Claim
              </button>
            </div>

            {reviewDecision === 'APPROVED' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approval Notes / GL Coding (Optional)
                </label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Budget verified and cleared for payment..."
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
                  placeholder="e.g. Missing valid tax invoice; non-compliant with corporate travel policy..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={reviewing}
                onClick={() => setReviewModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewing}
                onClick={handleReviewSubmit}
                className={`flex-1 py-2 text-xs font-semibold text-white rounded-lg shadow-sm ${
                  reviewDecision === 'APPROVED' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {reviewing ? 'Recording...' : reviewDecision === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
