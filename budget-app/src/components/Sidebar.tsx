import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Calculator,
  MessageSquare,
  LineChart
} from 'lucide-react';
import type { MemberId } from '../types';
import { getMember } from '../lib/members';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentMember: MemberId;
}

export const navItems = [
  { id: 'categories', label: 'Categorías', icon: LayoutDashboard },
  { id: 'income', label: 'Distribuidor', icon: Wallet },
  { id: 'calculators', label: 'Calculadoras', icon: Calculator },
  { id: 'telegram', label: 'Integración Telegram', icon: MessageSquare },
  { id: 'dashboard', label: 'Inversiones', icon: LineChart },
];

const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, currentMember }) => {
  const member = getMember(currentMember);

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
<<<<<<< HEAD
      <div className="p-6 mt-auto">
        <div className="bg-slate-800 p-4 rounded-xl flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${member.gradient} flex items-center justify-center text-white font-bold text-sm`}>
            {member.initial}
          </div>
          <div className="text-sm">
            <p className="text-slate-200 font-medium">{member.label}</p>
            <p className="text-slate-500 text-xs">Miembro activo</p>
          </div>
        </div>
      </div>
=======
>>>>>>> 27c6cae23b034567fa2bcc4639d34769f24966b3
    </aside>
  );
};

export default Sidebar;
