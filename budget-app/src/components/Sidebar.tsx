import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Calculator,
  MessageSquare,
  LineChart,
  BarChart3,
  Target,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { signOut } from '../lib/auth';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

const ACCENT_GRADIENTS: Record<string, string> = {
  emerald: 'from-emerald-400 to-cyan-500',
  pink: 'from-pink-400 to-fuchsia-500',
  amber: 'from-amber-400 to-orange-500',
  violet: 'from-violet-400 to-indigo-500',
};

export const navItems = [
  { id: 'categories', label: 'Categorías', icon: LayoutDashboard },
  { id: 'income', label: 'Distribuidor', icon: Wallet },
  { id: 'tracker', label: 'Tracker', icon: BarChart3 },
  { id: 'dreams', label: 'Sueños', icon: Target },
  { id: 'calculators', label: 'Calculadoras', icon: Calculator },
  { id: 'telegram', label: 'Integración Telegram', icon: MessageSquare },
  { id: 'dashboard', label: 'Inversiones', icon: LineChart },
];

const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { profile, user } = useAuth();
  const displayName = profile?.display_name ?? user?.email ?? '';
  const initial = profile?.initial ?? displayName.charAt(0).toUpperCase();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 h-screen flex flex-col hidden md:flex">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Finanzas
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.2)]'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-emerald-400' : ''} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-6 mt-auto space-y-2">
        <div className="bg-slate-800 p-4 rounded-xl flex items-center space-x-3">
          <div
            className={`w-8 h-8 rounded-full bg-gradient-to-tr ${
              ACCENT_GRADIENTS[profile?.accent ?? 'emerald']
            } flex items-center justify-center text-white font-bold text-sm shrink-0`}
          >
            {initial}
          </div>
          <div className="text-sm min-w-0">
            <p className="text-slate-200 font-medium truncate">{displayName}</p>
            <p className="text-slate-500 text-xs">Sesión activa</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center space-x-2 px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
