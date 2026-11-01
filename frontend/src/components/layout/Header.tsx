import React, { useState, useEffect } from 'react';
import { Menu, LogOut, Activity, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [activeInstance, setActiveInstance] = useState<string>('Detecting...');
  const [isHealthy, setIsHealthy] = useState<boolean>(true);

  useEffect(() => {
    const fetchInstance = async () => {
      try {
        const diag = await api.getExpenseDiagnostic();
        setActiveInstance(diag.instanceId);
        setIsHealthy(true);
      } catch {
        setActiveInstance('Cluster Offline');
        setIsHealthy(false);
      }
    };

    fetchInstance();
    const interval = setInterval(fetchInstance, 10000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'FINANCE_MANAGER':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Live LB status pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs">
          <Activity className={`w-3.5 h-3.5 ${isHealthy ? 'text-teal-600 animate-pulse' : 'text-rose-500'}`} />
          <span className="text-slate-500 font-medium">Load Balancer Node:</span>
          <span className="font-mono font-bold text-slate-800">{activeInstance}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-semibold text-slate-900 leading-none">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{user.email}</div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(
                  user.role
                )}`}
              >
                {user.role}
              </span>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="text-xs text-slate-500">Not authenticated</div>
        )}
      </div>
    </header>
  );
};
