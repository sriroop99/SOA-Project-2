import React, { useEffect, useState } from 'react';
import { History, ShieldCheck, RefreshCw, FileText, CheckCircle, XCircle, Send } from 'lucide-react';
import { api } from '../services/api';
import { Expense } from '../types';

export const AuditHistoryPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await api.listExpenses({ limit: 50 });
      setExpenses(res.items);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Audit Trail</h1>
          <p className="text-sm text-slate-500">
            Immutable chronological transaction ledger and reviewer decision audit logs
          </p>
        </div>

        <button
          onClick={fetchAudit}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm self-start"
          title="Refresh Audit Trail"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
        </button>
      </div>

      {/* Audit Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {expenses.map((exp) => (
            <div key={exp.id} className="relative text-xs space-y-1">
              <div
                className={`absolute -left-6 top-1 w-3 h-3 rounded-full ring-4 ring-white ${
                  exp.status === 'APPROVED'
                    ? 'bg-teal-500'
                    : exp.status === 'SUBMITTED'
                    ? 'bg-amber-500'
                    : exp.status === 'REJECTED'
                    ? 'bg-rose-500'
                    : 'bg-slate-400'
                }`}
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{exp.vendor}</span>
                  <span className="font-mono text-slate-600">(${exp.amount.toFixed(2)})</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      exp.status === 'APPROVED'
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : exp.status === 'SUBMITTED'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : exp.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {exp.status}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  {new Date(exp.updatedAt).toLocaleString()}
                </span>
              </div>

              <p className="text-slate-600 leading-relaxed">{exp.description}</p>

              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 pt-1">
                <span>Employee: <strong className="text-slate-700">{exp.employeeName}</strong></span>
                <span>Department: <strong className="text-slate-700">{exp.departmentName}</strong></span>
                {exp.reviewedByName && (
                  <span className="text-teal-700 font-medium">
                    Verified By: <strong>{exp.reviewedByName}</strong>
                  </span>
                )}
                {exp.rejectionReason && (
                  <span className="text-rose-700 font-medium">
                    Reason: <em>{exp.rejectionReason}</em>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
