import React, { useEffect, useRef, useState } from 'react';
import { DollarSign, PieChart, ArrowRight, Wallet, Save, Check, BookmarkPlus, RefreshCw } from 'lucide-react';
import type { Category, PeriodDistributionEntry } from '../types';
import { currentPeriod } from '../lib/period';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

interface IncomeDistributorProps {
  categories: Category[];
}

const IncomeDistributor: React.FC<IncomeDistributorProps> = ({ categories }) => {
  const { user } = useAuth();
  const [income, setIncome] = useState<number | ''>('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [snapshotState, setSnapshotState] =
    useState<'idle' | 'saving' | 'created' | 'updated' | 'error'>('idle');
  const [snapshotExists, setSnapshotExists] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const period = currentPeriod();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalPercentage = categories.reduce((acc, cat) => acc + cat.percentage, 0);

  // Cargar el ingreso guardado del usuario logueado + mes actual
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadIncome = async () => {
      setSaveState('idle');
      const { data, error } = await supabase
        .from('monthly_income')
        .select('amount')
        .eq('owner_id', user.id)
        .eq('period', period)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Error cargando ingreso:', error);
        setIncome('');
        return;
      }

      setIncome(data?.amount ?? '');
    };

    const loadSnapshot = async () => {
      const { data, error } = await supabase
        .from('period_snapshots')
        .select('id')
        .eq('owner_id', user.id)
        .eq('period', period)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error('Error consultando snapshot:', error);
        return;
      }
      setSnapshotExists(Boolean(data));
      setSnapshotState('idle');
    };

    loadIncome();
    loadSnapshot();
    return () => {
      cancelled = true;
    };
  }, [user, period]);

  // Guardar snapshot (distribución congelada del periodo)
  const handleSavePeriod = async () => {
    if (!user) return;
    const amount = income === '' ? 0 : Number(income);
    if (!Number.isFinite(amount) || amount <= 0 || categories.length === 0) return;

    const distributions: PeriodDistributionEntry[] = categories.map((cat) => ({
      category_id: cat.id,
      name: cat.name,
      percentage: Number(cat.percentage),
      amount: (amount * Number(cat.percentage)) / 100,
      color: cat.color,
    }));

    setSnapshotState('saving');
    const { error } = await supabase
      .from('period_snapshots')
      .upsert(
        {
          owner_id: user.id,
          period,
          income: amount,
          distributions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id,period' }
      );

    if (error) {
      console.error('Error guardando snapshot:', error);
      setSnapshotState('error');
      return;
    }

    setSnapshotState(snapshotExists ? 'updated' : 'created');
    setSnapshotExists(true);
    setTimeout(() => setSnapshotState('idle'), 1800);
  };

  const canSaveSnapshot =
    income !== '' &&
    Number(income) > 0 &&
    categories.length > 0 &&
    snapshotState !== 'saving';

  // Persistir con debounce cuando cambia el ingreso
  useEffect(() => {
    if (!user) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const amount = income === '' ? 0 : Number(income);
      if (Number.isNaN(amount) || amount < 0) return;

      setSaveState('saving');
      const { error } = await supabase
        .from('monthly_income')
        .upsert(
          { owner_id: user.id, period, amount },
          { onConflict: 'owner_id,period' }
        );

      if (error) {
        console.error('Error guardando ingreso:', error);
        setSaveState('error');
      } else {
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 1500);
      }
    }, 600);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [income, user, period]);

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Distribuidor de Ingresos</h2>
        <p className="text-slate-400">
          Digita tu ingreso mensual y mira cómo se reparte según tus porcentajes.
        </p>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-64 h-64 blur-[80px] rounded-full pointer-events-none bg-emerald-500/10"></div>
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
                className="block w-full pl-12 pr-4 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl text-3xl font-bold text-white placeholder-slate-700 focus:outline-none focus:border-transparent focus:ring-4 transition-all text-center focus:ring-emerald-500/50"
                placeholder="0"
                value={income}
                onChange={(e) => setIncome(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs">
              {saveState === 'saving' && (
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Save size={12} className="animate-pulse" /> Guardando…
                </span>
              )}
              {saveState === 'saved' && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Check size={12} /> Guardado en el servidor
                </span>
              )}
              {saveState === 'error' && (
                <span className="text-rose-400 flex items-center gap-1.5">
                  Error al guardar, reintentando…
                </span>
              )}
              {saveState === 'idle' && income !== '' && (
                <span className="text-slate-500">Periodo {period}</span>
              )}
            </div>

            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleSavePeriod}
                disabled={!canSaveSnapshot}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-slate-950 transition-all ${
                  canSaveSnapshot
                    ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 hover:opacity-90 shadow-[0_0_30px_rgba(52,211,153,0.25)]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {snapshotState === 'saving' ? (
                  <>
                    <Save size={16} className="animate-pulse" /> Guardando periodo…
                  </>
                ) : snapshotState === 'updated' ? (
                  <>
                    <RefreshCw size={16} /> Periodo actualizado
                  </>
                ) : snapshotState === 'created' ? (
                  <>
                    <Check size={16} /> Periodo guardado
                  </>
                ) : snapshotExists ? (
                  <>
                    <RefreshCw size={16} /> Actualizar periodo
                  </>
                ) : (
                  <>
                    <BookmarkPlus size={16} /> Guardar periodo
                  </>
                )}
              </button>

              {snapshotState === 'error' && (
                <span className="text-xs text-rose-400">No se pudo guardar el periodo, reintenta.</span>
              )}

              {snapshotState === 'idle' && snapshotExists && (
                <span className="text-[11px] text-slate-500">
                  Ya tienes un snapshot de este periodo. Vuelve a pulsar para actualizarlo.
                </span>
              )}
            </div>
          </div>
        </div>

        {income !== '' && Number(income) > 0 && categories.length > 0 && (
          <div className="mt-12">
            <h3 className="text-xl font-bold text-white flex items-center mb-6">
              <PieChart className="mr-2 text-emerald-400" /> Distribución Calculada
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
            <p>Aún no tenés categorías configuradas. Ve a la sección de Categorías primero.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomeDistributor;
