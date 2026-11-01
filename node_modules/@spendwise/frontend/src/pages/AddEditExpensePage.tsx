import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Send, Receipt, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { Currency, ExpenseCategory } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

export const AddEditExpensePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [vendor, setVendor] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  useEffect(() => {
    api.getExpenseCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
    }).catch(() => {});

    if (isEditing) {
      api.getExpenseById(id).then((exp) => {
        setCategoryId(exp.categoryId);
        setAmount(String(exp.amount));
        setCurrency(exp.currency);
        setVendor(exp.vendor);
        setExpenseDate(exp.expenseDate);
        setDescription(exp.description);
        setReceiptUrl(exp.receiptUrl || '');
        setLoading(false);
      }).catch((err) => {
        notifyError(err.message || 'Failed to load expense for editing');
        navigate('/expenses');
      });
    }
  }, [id]);

  const handleSubmit = async (submitNow: boolean) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      notifyError('Please enter a valid expense amount greater than zero');
      return;
    }
    if (!vendor.trim()) {
      notifyError('Vendor name is required');
      return;
    }
    if (!description.trim()) {
      notifyError('Expense description is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        categoryId,
        amount: numAmount,
        currency,
        vendor: vendor.trim(),
        expenseDate,
        description: description.trim(),
        receiptUrl: receiptUrl.trim() || undefined,
        submitNow,
      };

      if (isEditing) {
        await api.updateExpense(id, payload);
        success(submitNow ? 'Expense updated and submitted for approval' : 'Draft expense saved');
      } else {
        await api.createExpense(payload);
        success(submitNow ? 'Expense claim submitted for approval' : 'Draft expense created');
      }

      navigate('/expenses');
    } catch (err: any) {
      notifyError(err.message || 'Failed to save expense claim');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <Link
          to="/expenses"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isEditing ? 'Edit Financial Expense Claim' : 'Create New Expense Claim'}
          </h1>
          <p className="text-xs text-slate-500">
            Submit your corporate expenditures for review and budget allocation
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Expense Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Vendor / Payee Name *
            </label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Amazon Web Services, Uber, Apple"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Expense Amount *
            </label>
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-24 px-2 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
                <option value="GBP">GBP (£)</option>
              </select>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Transaction Date *
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Business Purpose / Detailed Description *
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain the commercial justification, project purpose, or corporate necessity..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Digital Receipt / Invoice Link (Optional)
          </label>
          <input
            type="url"
            value={receiptUrl}
            onChange={(e) => setReceiptUrl(e.target.value)}
            placeholder="https://drive.google.com/... or https://cdn.spendwise.corp/receipt.pdf"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link
            to="/expenses"
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 text-center"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(false)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-500" />
            Save as Draft
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-500/20 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
};
