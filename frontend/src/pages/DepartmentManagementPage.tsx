import React, { useEffect, useState } from 'react';
import { Building2, Plus, RefreshCw, Users, Hash } from 'lucide-react';
import { api } from '../services/api';
import { Department } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export const DepartmentManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Add department modal
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const list = await api.listDepartments();
      setDepartments(list);
    } catch (err: any) {
      notifyError(err.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      notifyError('Department code and name are required');
      return;
    }

    setSaving(true);
    try {
      await api.createDepartment({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
      });

      success('Department created successfully');
      setModalOpen(false);
      setCode('');
      setName('');
      setDescription('');
      fetchDepartments();
    } catch (err: any) {
      notifyError(err.message || 'Failed to create department');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Corporate Departments</h1>
          <p className="text-sm text-slate-500">
            Organizational cost centers and budget divisions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDepartments}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </button>
          )}
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs font-mono">
                {dept.code}
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">ID: {dept.id.slice(0, 12)}</span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">{dept.name}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {dept.description || 'Enterprise cost center and operational division.'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
              Created: {new Date(dept.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* Add Department Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Corporate Department</h3>

            <form onSubmit={handleCreateDepartment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Code (2-5 uppercase) *</label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. IT, LEGAL, SEC"
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Information Security & Compliance"
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mandate, cost allocation, and function..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
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
                  {saving ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
