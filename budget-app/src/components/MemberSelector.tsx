import React from 'react';
import { Check, User } from 'lucide-react';
import { MEMBERS } from '../lib/members';
import type { MemberId } from '../types';

interface MemberSelectorProps {
  currentMember: MemberId;
  onChange: (member: MemberId) => void;
}

const MemberSelector: React.FC<MemberSelectorProps> = ({ currentMember, onChange }) => {
  return (
    <section
      aria-label="Selector de miembro"
      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <User size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            ¿Quién está gestionando?
          </h3>
        </div>
        <span className="text-xs text-slate-500 hidden sm:block">
          Selecciona una columna para ver y editar solo sus datos
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {MEMBERS.map((member) => {
          const isActive = member.id === currentMember;
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onChange(member.id)}
              aria-pressed={isActive}
              className={`relative text-left rounded-xl border p-4 transition-all duration-200 group overflow-hidden ${
                isActive
                  ? `border-transparent bg-slate-900 ring-2 ${member.ringClass} ${member.glowClass}`
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div
                className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-opacity duration-500 ${
                  isActive ? 'opacity-100' : 'opacity-0'
                } ${member.bgClass}`}
              />

              <div className="relative z-10 flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-tr ${member.gradient} ${
                    isActive ? 'scale-105' : 'opacity-80'
                  } transition-transform`}
                >
                  {member.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold truncate ${
                      isActive ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {member.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isActive ? 'Miembro activo' : 'Toca para seleccionar'}
                  </p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? `${member.bgClass} ${member.textClass}`
                      : 'bg-slate-800 text-slate-600'
                  }`}
                >
                  {isActive && <Check size={14} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default MemberSelector;
