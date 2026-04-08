import React, { useState } from 'react';
import { DollarSign, PieChart, ArrowRight, Wallet } from 'lucide-react';
import type { Category } from '../types';

interface IncomeDistributorProps {
  categories: Category[];
}

const IncomeDistributor: React.FC<IncomeDistributorProps> = ({ categories }) => {
  const [income, setIncome] = useState<number | ''>('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalPercentage = categories.reduce((acc, cat) => acc + cat.percentage, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Distribuidor de Ingresos</h2>
        <p className="text-slate-400">Digita tu ingreso mensual y mira cómo se reparte según tus porcentajes.</p>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-full max-w-md">
            <label className="block text-center text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
              Ingreso Mensual
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
              <input
                type="number"
                className="block w-full pl-12 pr-4 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl text-3xl font-bold text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all text-center"
                placeholder="0"
                value={income}
                onChange={(e) => setIncome(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {income !== '' && Number(income) > 0 && categories.length > 0 && (
          <div className="mt-12">
            <h3 className="text-xl font-bold text-white flex items-center mb-6">
              <PieChart className="mr-2 text-cyan-400" /> Distribución Calculada
            </h3>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(cat => {
                const amount = (Number(income) * cat.percentage) / 100;
                return (
                  <div key={cat.id} className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#34d399' }} />
                        <span className="text-slate-300 font-medium">{cat.name}</span>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-1 rounded-md">
                        {cat.percentage}%
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white tracking-tight">
                      {formatCurrency(amount)}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPercentage !== 100 && (
              <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center text-amber-400 text-sm">
                <Wallet className="mr-3 flex-shrink-0" size={20} />
                <p>
                  Tus categorías suman un <strong>{totalPercentage}%</strong> en lugar de un 100%. 
                  Queda un <strong>{(100 - totalPercentage).toFixed(1)}% ({formatCurrency((Number(income) * (100 - totalPercentage)) / 100)})</strong> sin asignar.
                </p>
              </div>
            )}
          </div>
        )}

        {(!categories || categories.length === 0) && (
          <div className="mt-10 text-center text-slate-500">
            <ArrowRight className="mx-auto h-8 w-8 mb-2 opacity-30" />
            <p>Primero debes configurar algunas categorías para ver la distribución.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default IncomeDistributor;
