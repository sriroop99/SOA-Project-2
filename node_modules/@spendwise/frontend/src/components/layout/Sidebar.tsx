import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  CheckSquare,
  PieChart,
  Scale,
  BarChart3,
  Building2,
  Users,
  History,
  Settings,
  ShieldCheck,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, switchDemoAccount } = useAuth();

  const isRole = (...roles: UserRole[]) => user && roles.includes(user.role);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Expenses', path: '/expenses', icon: Receipt },
    ...(isRole('ADMIN', 'FINANCE_MANAGER')
      ? [{ label: 'Approval Queue', path: '/approvals', icon: CheckSquare, badge: 'Finance' }]
      : []),
    { label: 'Budgets', path: '/budgets', icon: PieChart },
    { label: 'Reconciliation', path: '/reconciliation', icon: Scale },
    { label: 'Analytics & Reports', path: '/reports', icon: BarChart3 },
    { label: 'Departments', path: '/departments', icon: Building2 },
    ...(isRole('ADMIN') ? [{ label: 'User Directory', path: '/users', icon: Users }] : []),
    { label: 'Audit History', path: '/audit', icon: History },
    { label: 'Settings & LB Node', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-navy-900 border-r border-slate-800 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-navy-900/90">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-teal-400 flex items-center justify-center text-navy-900 shadow-md shadow-teal-500/20 font-extrabold text-lg">
            S
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight leading-none">SpendWise</h1>
            <span className="text-[10px] text-teal-400 font-semibold tracking-wider uppercase">SOA Review 2</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-500/15 text-teal-400 font-semibold border border-teal-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Quick Demo Role Switcher for Evaluators */}
        <div className="p-3 mx-3 my-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              Role Switcher
            </span>
            <span className="text-[9px] bg-slate-700 text-teal-300 px-1 rounded">1-Click</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2 leading-tight">
            Instantly switch JWT token identity to test role-based access control.
          </p>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => switchDemoAccount('ADMIN')}
              className={`text-[10px] py-1.5 px-1 rounded font-semibold transition-all ${
                user?.role === 'ADMIN'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-700/80 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => switchDemoAccount('FINANCE_MANAGER')}
              className={`text-[10px] py-1.5 px-1 rounded font-semibold transition-all ${
                user?.role === 'FINANCE_MANAGER'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-700/80 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Finance
            </button>
            <button
              onClick={() => switchDemoAccount('EMPLOYEE')}
              className={`text-[10px] py-1.5 px-1 rounded font-semibold transition-all ${
                user?.role === 'EMPLOYEE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-700/80 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Employee
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
