import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export const LoginPage: React.FC = () => {
  const { login, switchDemoAccount } = useAuth();
  const { error: notifyError, success: notifySuccess } = useNotification();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      notifyError('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      notifySuccess('Logged in successfully');
      navigate('/');
    } catch (err: any) {
      notifyError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (role: 'ADMIN' | 'FINANCE_MANAGER' | 'EMPLOYEE') => {
    setIsSubmitting(true);
    try {
      await switchDemoAccount(role);
      notifySuccess(`Logged in as ${role}`);
      navigate('/');
    } catch (err: any) {
      notifyError(err.message || 'Quick login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-teal-400 flex items-center justify-center text-navy-900 shadow-xl shadow-teal-500/20 font-extrabold text-2xl">
            S
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-white">
          SpendWise Corporate
        </h2>
        <p className="mt-1 text-center text-xs text-teal-400 font-medium uppercase tracking-wider">
          SOA Programming & Microservices • Review 2
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Corporate Email</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@spendwise.corp"
                  className="block w-full pl-10 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Master Password</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-slate-900 bg-teal-400 hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Evaluator 1-Click Demo Logins */}
          <div className="mt-6 pt-5 border-t border-slate-700/70">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Evaluator 1-Click Credentials
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-purple-500/20 text-purple-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-none">Administrator</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">admin@spendwise.corp</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                  Full Access
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('FINANCE_MANAGER')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-teal-500/20 text-teal-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-none">Finance Manager</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">finance@spendwise.corp</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
                  Approval & Budgets
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('EMPLOYEE')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-blue-500/20 text-blue-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-none">Employee</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">employee@spendwise.corp</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                  Expense Claims
                </span>
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link to="/register" className="text-xs text-teal-400 hover:text-teal-300 font-medium">
              Don't have an account? Register new employee
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
