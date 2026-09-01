import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Target,
  Sparkles,
  PiggyBank,
  Goal as GoalIcon,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Clock,
  Calculator,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { Category, PeriodSnapshot } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

interface DreamPlannerProps {
  categories: Category[];
}

const MONTHS_WINDOW = 3;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatShortCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value}`;
};

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const formatTargetDate = (monthsAhead: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
};

// Conversión de tasa efectiva anual (en %) a tasa efectiva mensual (en decimal).
// Si EA = 0 → TEM = 0 (modo lineal).
const eaToMonthly = (eaPct: number): number => {
  if (eaPct <= 0) return 0;
  return Math.pow(1 + eaPct / 100, 1 / 12) - 1;
};

// Valor futuro con anualidad: FV = PV × (1+i)^n + PMT × [((1+i)^n − 1) / i].
// Caso degenerado i = 0 → FV = PV + PMT × n (lineal).
const fvAtMonth = (pv: number, pmt: number, months: number, eaPct: number): number => {
  if (months <= 0) return pv;
  const i = eaToMonthly(eaPct);
  if (i === 0) return pv + pmt * months;
  const growth = Math.pow(1 + i, months);
  return pv * growth + (pmt * (growth - 1)) / i;
};

// Meses necesarios para que FV ≥ goal. Iteración numérica con cap 1200 meses.
const monthsToReachGoal = (
  pv: number,
  goal: number,
  pmt: number,
  eaPct: number
): number => {
  if (pv >= goal) return 0;
  for (let n = 1; n <= 1200; n++) {
    if (fvAtMonth(pv, pmt, n, eaPct) >= goal) return n;
  }
  return -1;
};

// Aporte mensual requerido para alcanzar goal en `years` con compound growth.
// PMT = (goal − PV × (1+i)^n) / [((1+i)^n − 1) / i]
const requiredMonthlyCompound = (
  pv: number,
  goal: number,
  years: number,
  eaPct: number
): number => {
  const n = Math.max(1, Math.round(years * 12));
  const i = eaToMonthly(eaPct);
  const growth = Math.pow(1 + i, n);
  const pvFuture = pv * growth;
  if (pvFuture >= goal) return 0;
  if (i === 0) return (goal - pv) / n;
  return (goal - pvFuture) / ((growth - 1) / i);
};

const DreamPlanner: React.FC<DreamPlannerProps> = ({ categories }) => {
  const { user } = useAuth();
  const [currentSavings, setCurrentSavings] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [goal, setGoal] = useState<number | ''>('');
  const [years, setYears] = useState<number | ''>('');
  const [ea, setEa] = useState<number | ''>(5);

  const [snapshots, setSnapshots] = useState<PeriodSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si la categoría seleccionada ya no existe, limpiarla.
    if (categoryId && !categories.some((c) => c.id === categoryId)) {
      setCategoryId('');
    }
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  // Cargar snapshots del usuario logueado
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('period_snapshots')
        .select('*')
        .eq('owner_id', user.id)
        .order('period', { ascending: false })
        .limit(MONTHS_WINDOW);

      if (cancelled) return;
      if (error) {
        console.error('Error cargando snapshots:', error);
        setSnapshots([]);
      } else {
        setSnapshots((data ?? []) as PeriodSnapshot[]);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId]
  );

  // Aporte mensual: promedio del monto de la categoría en los últimos snapshots
  const monthlyContribution = useMemo(() => {
    if (!selectedCategory) return { value: 0, sampleCount: 0 };
    const amounts: number[] = [];
    snapshots.forEach((snap) => {
      const d = snap.distributions.find((x) => x.name === selectedCategory.name);
      if (d && d.amount > 0) amounts.push(d.amount);
    });
    if (amounts.length === 0) return { value: 0, sampleCount: 0 };
    const avg = amounts.reduce((acc, v) => acc + v, 0) / amounts.length;
    return { value: avg, sampleCount: amounts.length };
  }, [selectedCategory, snapshots]);

  // Cálculo del sueño: modo tiempo
  const timeResult = useMemo(() => {
    if (currentSavings === '' || goal === '' || goal <= 0) return null;

    const saved = Number(currentSavings);
    const target = Number(goal);
    const remaining = target - saved;
    const contribution = monthlyContribution.value;
    const eaPct = ea === '' ? 0 : Number(ea);

    if (remaining <= 0) {
      return { kind: 'covered' as const, saved, target };
    }

    // Sin aporte mensual pero con EA > 0: cálculo compuesto desde PV solo.
    if (contribution <= 0) {
      if (eaPct > 0 && saved > 0) {
        const yearsNeeded = Math.log(target / saved) / Math.log(1 + eaPct / 100);
        if (Number.isFinite(yearsNeeded) && yearsNeeded > 0) {
          const months = Math.ceil(yearsNeeded * 12);
          return {
            kind: 'projection' as const,
            saved,
            target,
            remaining,
            contribution,
            months,
            targetDate: formatTargetDate(months),
            sampleCount: monthlyContribution.sampleCount,
          };
        }
      }
      return { kind: 'no_contribution' as const, saved, target, remaining };
    }

    const months = monthsToReachGoal(saved, target, contribution, eaPct);
    if (months <= 0) {
      return { kind: 'no_contribution' as const, saved, target, remaining };
    }
    const targetDate = formatTargetDate(months);
    return {
      kind: 'projection' as const,
      saved,
      target,
      remaining,
      contribution,
      months,
      targetDate,
      sampleCount: monthlyContribution.sampleCount,
    };
  }, [currentSavings, goal, ea, monthlyContribution]);

  // Cálculo del sueño: modo aporte
  const amountResult = useMemo(() => {
    if (
      currentSavings === '' ||
      goal === '' ||
      Number(goal) <= 0 ||
      years === '' ||
      Number(years) <= 0
    )
      return null;

    const saved = Number(currentSavings);
    const target = Number(goal);
    const yearsNum = Number(years);
    const remaining = target - saved;
    const eaPct = ea === '' ? 0 : Number(ea);

    if (remaining <= 0) {
      return { kind: 'covered' as const, saved, target };
    }

    const totalMonths = Math.max(1, Math.round(yearsNum * 12));
    const requiredMonthly = requiredMonthlyCompound(saved, target, yearsNum, eaPct);
    const currentMonthly = monthlyContribution.value;
    const cushion = currentMonthly - requiredMonthly;

    let monthsAtCurrent: number | null = null;
    let targetDateAtCurrent: string | null = null;
    if (currentMonthly > 0) {
      monthsAtCurrent = monthsToReachGoal(saved, target, currentMonthly, eaPct);
      if (monthsAtCurrent > 0) {
        targetDateAtCurrent = formatTargetDate(monthsAtCurrent);
      }
    }

    return {
      kind: 'amount' as const,
      saved,
      target,
      remaining,
      years: yearsNum,
      totalMonths,
      requiredMonthly,
      currentMonthly,
      cushion,
      monthsAtCurrent,
      targetDateAtCurrent,
      sampleCount: monthlyContribution.sampleCount,
    };
  }, [currentSavings, goal, years, ea, monthlyContribution]);

  // Datos para el mini chart de proyección (modo tiempo)
  const projectionData = useMemo(() => {
    if (!timeResult || timeResult.kind !== 'projection') return [];
    const { saved, contribution, months } = timeResult;
    const eaPct = ea === '' ? 0 : Number(ea);
    const points: Array<{ month: number; ahorro: number }> = [{ month: 0, ahorro: saved }];
    const step = Math.max(1, Math.ceil(months / 30));
    for (let m = step; m <= months; m += step) {
      points.push({ month: m, ahorro: fvAtMonth(saved, contribution, m, eaPct) });
    }
    if (points[points.length - 1].month !== months) {
      points.push({
        month: months,
        ahorro: fvAtMonth(saved, contribution, months, eaPct),
      });
    }
    return points;
  }, [timeResult, ea]);

  // Datos para el mini chart de proyección (modo aporte) — doble línea
  const amountChartData = useMemo(() => {
    if (!amountResult || amountResult.kind !== 'amount') return [];
    const {
      saved,
      requiredMonthly,
      currentMonthly,
      totalMonths,
      years: yearsNum,
    } = amountResult;
    const eaPct = ea === '' ? 0 : Number(ea);
    const step = Math.max(1, Math.ceil(totalMonths / 30));
    const points: Array<{ year: number; requerido: number; actual: number }> = [];
    for (let m = 0; m <= totalMonths; m += step) {
      points.push({
        year: Number((m / 12).toFixed(2)),
        requerido: fvAtMonth(saved, requiredMonthly, m, eaPct),
        actual:
          currentMonthly > 0 ? fvAtMonth(saved, currentMonthly, m, eaPct) : saved,
      });
    }
    if (points[points.length - 1].year !== yearsNum) {
      points.push({
        year: Number(yearsNum.toFixed(2)),
        requerido: fvAtMonth(saved, requiredMonthly, totalMonths, eaPct),
        actual:
          currentMonthly > 0
            ? fvAtMonth(saved, currentMonthly, totalMonths, eaPct)
            : saved,
      });
    }
    return points;
  }, [amountResult, ea]);

  const noCategories = !loading && categories.length === 0;
  const noSnapshots = !loading && snapshots.length === 0;
  const selectedCategoryHasNoHistory =
    !!selectedCategory &&
    !loading &&
    snapshots.length > 0 &&
    monthlyContribution.sampleCount === 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Target className="text-emerald-400" /> Sueños Realistas
        </h2>
        <p className="text-slate-400">
          Calculamos cuánto tardarías con tu ritmo actual y, si defines un plazo, cuánto deberías
          aportar al mes para llegar a tiempo. Todo con el crecimiento compuesto que elijas.
        </p>
      </header>

      {noCategories ? (
        <EmptyState
          icon={<PiggyBank size={32} />}
          title="Aún no tienes categorías"
          message="Crea categorías con sus porcentajes en la sección Categorías para poder calcular sueños."
        />
      ) : noSnapshots ? (
        <EmptyState
          icon={<Inbox size={32} />}
          title="No hay periodos guardados"
          message='Ve a Distribuidor, digita tu ingreso y pulsa "Guardar periodo" para empezar.'
        />
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Formulario */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 blur-[80px] rounded-full pointer-events-none bg-emerald-500/10" />
            <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <GoalIcon size={18} className="text-emerald-400" />
              Tu punto de partida
            </h3>

            <div className="space-y-4 relative z-10">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Ya tengo ahorrado
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="0"
                    value={currentSavings}
                    onChange={(e) =>
                      setCurrentSavings(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-2.5 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:border-transparent transition-colors focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Categoría de ahorro
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors focus:ring-emerald-500/50"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.percentage}%)
                    </option>
                  ))}
                </select>
                {selectedCategory && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    En el último periodo, {selectedCategory.name} recibió{' '}
                    <span className="text-emerald-400">
                      {formatCurrency(
                        snapshots[0]?.distributions.find((d) => d.name === selectedCategory.name)
                          ?.amount ?? 0
                      )}
                    </span>
                    .
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Mi objetivo es
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="0"
                    value={goal}
                    onChange={(e) =>
                      setGoal(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-2.5 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:border-transparent transition-colors focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center justify-between">
                  <span>Plazo en años</span>
                  <span className="text-xs text-slate-500">Opcional · Define tu horizonte</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    placeholder="0"
                    value={years}
                    onChange={(e) =>
                      setYears(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-16 py-2.5 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:border-transparent transition-colors focus:ring-emerald-500/50"
                  />
                  <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500 text-sm">
                    años
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center justify-between">
                  <span>Interés efectivo anual</span>
                  <span className="text-xs text-slate-500">Crecimiento compuesto</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="0"
                    value={ea}
                    onChange={(e) =>
                      setEa(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-16 py-2.5 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:border-transparent transition-colors focus:ring-emerald-500/50"
                  />
                  <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500 text-sm">
                    % EA
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Tu ahorro crece a esta tasa cada año. Pon <strong className="text-slate-300">0%</strong> para cálculo lineal.
                </p>
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className="lg:col-span-3 space-y-4">
            <CombinedResult
              timeResult={timeResult}
              amountResult={amountResult}
              selectedCategory={selectedCategory}
              projectionData={projectionData}
              amountChartData={amountChartData}
              categoryHasNoHistory={selectedCategoryHasNoHistory}
              ea={ea}
              hasYearsInput={years !== '' && Number(years) > 0}
            />

            {selectedCategoryHasNoHistory &&
              ((timeResult?.kind === 'projection') ||
                (amountResult?.kind === 'amount')) && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 text-amber-400 text-sm">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <p>
                    La categoría <strong>{selectedCategory?.name}</strong> aún no aparece en los periodos
                    guardados. El cálculo usa el porcentaje actual sobre el último ingreso registrado.
                  </p>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message }) => (
  <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
    <div className="text-slate-600 mb-3">{icon}</div>
    <p className="text-slate-300 font-medium">{title}</p>
    <p className="text-slate-500 text-sm mt-1 max-w-md">{message}</p>
  </div>
);

interface CoveredCardProps {
  saved: number;
  target: number;
}

const CoveredCard: React.FC<CoveredCardProps> = ({ saved, target }) => (
  <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-2xl p-8 relative overflow-hidden">
    <div className="absolute -top-20 -right-20 w-64 h-64 blur-[80px] rounded-full pointer-events-none bg-emerald-500/10" />
    <div className="relative z-10 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
        <CheckCircle2 size={32} />
      </div>
      <h3 className="text-2xl font-bold text-white mb-1">¡Objetivo cubierto!</h3>
      <p className="text-slate-300">
        Ya tienes <strong className="text-white">{formatCurrency(saved)}</strong>, supera tu meta
        de <strong className="text-white">{formatCurrency(target)}</strong>.
      </p>
    </div>
  </div>
);

interface NoContributionCardProps {
  categoryName: string;
  remaining: number;
}

const NoContributionCard: React.FC<NoContributionCardProps> = ({
  categoryName,
  remaining,
}) => (
  <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-8">
    <div className="flex items-start gap-3">
      <AlertCircle size={24} className="text-rose-400 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-xl font-bold text-white mb-1">No llegarás con este ritmo</h3>
        <p className="text-slate-300 text-sm">
          La categoría <strong>{categoryName}</strong> tiene 0% de aporte mensual registrado. Te
          faltan <strong className="text-white">{formatCurrency(remaining)}</strong> pero no hay
          dinero destinado a ella. Ajusta el porcentaje en la sección Categorías.
        </p>
      </div>
    </div>
  </div>
);

interface TimeProjectionResult {
  kind: 'projection';
  saved: number;
  target: number;
  remaining: number;
  contribution: number;
  months: number;
  targetDate: string;
  sampleCount: number;
}

type TimeResult =
  | { kind: 'covered'; saved: number; target: number }
  | { kind: 'no_contribution'; saved: number; target: number; remaining: number }
  | TimeProjectionResult
  | null;

interface AmountResult {
  kind: 'amount';
  saved: number;
  target: number;
  remaining: number;
  years: number;
  totalMonths: number;
  requiredMonthly: number;
  currentMonthly: number;
  cushion: number;
  monthsAtCurrent: number | null;
  targetDateAtCurrent: string | null;
  sampleCount: number;
}

type AmountResultType =
  | { kind: 'covered'; saved: number; target: number }
  | AmountResult
  | null;

interface CombinedResultProps {
  timeResult: TimeResult;
  amountResult: AmountResultType;
  selectedCategory: Category | null;
  projectionData: Array<{ month: number; ahorro: number }>;
  amountChartData: Array<{ year: number; requerido: number; actual: number }>;
  categoryHasNoHistory: boolean;
  ea: number | '';
  hasYearsInput: boolean;
}

const CombinedResult: React.FC<CombinedResultProps> = ({
  timeResult,
  amountResult,
  selectedCategory,
  projectionData,
  amountChartData,
  categoryHasNoHistory,
  ea,
  hasYearsInput,
}) => {
  // Estado vacío: sin datos para calcular.
  if (!timeResult) {
    return (
      <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[280px]">
        <GoalIcon size={32} className="text-slate-600 mb-3" />
        <p className="text-slate-300 font-medium">Cuéntanos tu sueño</p>
        <p className="text-slate-500 text-sm mt-1 max-w-xs">
          Llena ahorro, categoría y objetivo para empezar. Si añades un plazo en años también te
          diremos cuánto aportar al mes.
        </p>
      </div>
    );
  }

  // Covered: ya tienes el objetivo.
  if (timeResult.kind === 'covered') {
    return <CoveredCard saved={timeResult.saved} target={timeResult.target} />;
  }

  // No contribution: nunca llega con 0 aporte y 0% EA.
  if (timeResult.kind === 'no_contribution') {
    return (
      <NoContributionCard
        categoryName={selectedCategory?.name ?? ''}
        remaining={timeResult.remaining}
      />
    );
  }

  const yearsDisplay = timeResult.months / 12;
  const timeLabel =
    timeResult.months >= 12
      ? `${timeResult.months} meses · ${yearsDisplay.toFixed(1)} años`
      : `${timeResult.months} ${timeResult.months === 1 ? 'mes' : 'meses'}`;

  const showAmountBlock = hasYearsInput && amountResult && amountResult.kind === 'amount';
  const eaLabel = ea === '' || Number(ea) === 0 ? '0%' : `${Number(ea)}%`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 blur-[80px] rounded-full pointer-events-none bg-emerald-500/10" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10 space-y-8">
        {/* ── Bloque tiempo ── */}
        <section>
          <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Clock size={14} /> Al ritmo actual
          </p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-5xl sm:text-6xl font-bold text-emerald-400">
              {timeResult.months}
            </span>
            <span className="text-xl text-slate-300">
              {timeResult.months === 1 ? 'mes' : 'meses'}
            </span>
            <span className="text-sm text-slate-500">· {timeLabel}</span>
          </div>
          <p className="text-slate-400 mt-2">
            con tu aporte de{' '}
            <strong className="text-emerald-400">
              {formatCurrency(timeResult.contribution)}/mes
            </strong>{' '}
            llegarías en <strong className="text-white">{timeResult.targetDate}</strong>.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mt-5">
            <MiniStat
              label="Tu ritmo/mes"
              value={formatCurrency(timeResult.contribution)}
              tone="text-emerald-400"
            />
            <MiniStat
              label="Te faltan"
              value={formatCurrency(timeResult.remaining)}
              tone="text-amber-400"
            />
            <MiniStat
              label="Objetivo"
              value={formatCurrency(timeResult.target)}
              tone="text-white"
            />
          </div>
        </section>

        {/* ── Bloque aporte (solo si plazo lleno) ── */}
        {showAmountBlock && amountResult && (
          <>
            <div className="border-t border-slate-800" />
            <section>
              <p className="text-xs text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calculator size={14} /> Si quieres lograrlo en {amountResult.years}{' '}
                {amountResult.years === 1 ? 'año' : 'años'}
              </p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-5xl sm:text-6xl font-bold text-white">
                  {formatCurrency(amountResult.requiredMonthly)}
                </span>
                <span className="text-xl text-slate-300">/ mes</span>
              </div>
              <p className="text-slate-400 mt-2">
                para llegar a{' '}
                <strong className="text-white">{formatCurrency(amountResult.target)}</strong> en{' '}
                <strong className="text-white">
                  {amountResult.totalMonths} meses
                </strong>
                .
              </p>

              <AmountCushionBadge amountResult={amountResult} />

              <div className="grid sm:grid-cols-3 gap-4 mt-5">
                <MiniStat
                  label="Requerido/mes"
                  value={formatCurrency(amountResult.requiredMonthly)}
                  tone={
                    amountResult.cushion >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }
                />
                <MiniStat
                  label="Tu ritmo actual"
                  value={
                    amountResult.currentMonthly > 0
                      ? formatCurrency(amountResult.currentMonthly)
                      : '—'
                  }
                  tone="text-emerald-400"
                />
                <MiniStat
                  label={
                    amountResult.cushion >= 0 ? 'Colchón' : 'Te falta al mes'
                  }
                  value={
                    amountResult.currentMonthly > 0
                      ? formatCurrency(Math.abs(amountResult.cushion))
                      : '—'
                  }
                  tone={
                    amountResult.cushion >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }
                />
              </div>
            </section>
          </>
        )}

        {/* ── Chart único (doble línea cuando hay plazo; simple cuando no) ── */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-3 flex items-center gap-2 flex-wrap">
            <Sparkles size={12} />
            {categoryHasNoHistory
              ? 'Estimación: la categoría no tiene historial, usamos % actual sobre el último ingreso.'
              : `Basado en ${
                  timeResult.sampleCount
                } ${timeResult.sampleCount === 1 ? 'periodo guardado' : 'periodos guardados'}.`}
            {' · '}Cálculo con <strong className="text-slate-300">{eaLabel} EA</strong>
          </p>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              {showAmountBlock && amountResult ? (
                <LineChart
                  data={amountChartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="year"
                    stroke="#64748b"
                    tickFormatter={(v: number) => `${v}a`}
                    label={{
                      value: 'Años',
                      position: 'insideBottom',
                      offset: -2,
                      fill: '#64748b',
                      fontSize: 11,
                    }}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tickFormatter={(v: number) => formatShortCurrency(v)}
                    width={70}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 12,
                    }}
                    labelStyle={{ color: '#cbd5e1' }}
                    formatter={(value, name) => {
                      const numValue =
                        typeof value === 'number' ? value : Number(value ?? 0);
                      const label =
                        String(name) === 'requerido'
                          ? 'Al ritmo requerido'
                          : 'Al ritmo actual';
                      return [formatCurrency(numValue), label];
                    }}
                    labelFormatter={(label) => `Año ${label}`}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
                    formatter={(value: string) =>
                      value === 'requerido' ? 'Requerido' : 'Actual'
                    }
                  />
                  <ReferenceLine
                    y={timeResult.target}
                    stroke="#34d399"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Objetivo',
                      position: 'right',
                      fill: '#34d399',
                      fontSize: 11,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="requerido"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#34d399"
                    strokeWidth={3}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              ) : (
                <LineChart data={projectionData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="month"
                    stroke="#64748b"
                    label={{
                      value: 'Meses',
                      position: 'insideBottom',
                      offset: -2,
                      fill: '#64748b',
                      fontSize: 11,
                    }}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tickFormatter={(v: number) => formatShortCurrency(v)}
                    width={70}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 12,
                    }}
                    labelStyle={{ color: '#cbd5e1' }}
                    formatter={(value) => {
                      const numValue =
                        typeof value === 'number' ? value : Number(value ?? 0);
                      return [formatCurrency(numValue), 'Ahorro'];
                    }}
                    labelFormatter={(label) => `Mes ${label}`}
                  />
                  <ReferenceLine
                    y={timeResult.target}
                    stroke="#34d399"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Objetivo',
                      position: 'right',
                      fill: '#34d399',
                      fontSize: 11,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ahorro"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AmountCushionBadgeProps {
  amountResult: AmountResult;
}

const AmountCushionBadge: React.FC<AmountCushionBadgeProps> = ({ amountResult }) => {
  const isOnTrack = amountResult.cushion >= 0;
  const hasCurrentPace = amountResult.currentMonthly > 0;

  if (!hasCurrentPace) {
    return (
      <div className="mt-4 rounded-xl p-4 border bg-amber-500/10 border-amber-500/30 flex items-start gap-3">
        <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-slate-300">
          La categoría no tiene historial registrado. No podemos comparar tu ritmo actual con el
          aporte requerido.
        </p>
      </div>
    );
  }

  const shortfall = amountResult.requiredMonthly - amountResult.currentMonthly;

  return (
    <div
      className={`mt-4 rounded-xl p-4 border ${
        isOnTrack
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-amber-500/10 border-amber-500/30'
      }`}
    >
      <div className="flex items-start gap-3">
        {isOnTrack ? (
          <TrendingUp size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
        ) : (
          <TrendingDown size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className={`font-semibold ${isOnTrack ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isOnTrack ? '¡Vas por buen camino!' : 'Necesitas ajustar tu ritmo'}
          </p>
          <p className="text-sm text-slate-300 mt-1">
            Tu ritmo actual es{' '}
            <strong className="text-white">
              {formatCurrency(amountResult.currentMonthly)}/mes
            </strong>
            {isOnTrack ? (
              <>
                {' '}· Te sobra{' '}
                <strong className="text-emerald-400">
                  {formatCurrency(amountResult.cushion)}/mes
                </strong>
                .
              </>
            ) : (
              <>
                {' '}· Te faltan{' '}
                <strong className="text-amber-400">
                  {formatCurrency(shortfall)}/mes
                </strong>{' '}
                para llegar a tiempo.
              </>
            )}
          </p>
          {amountResult.targetDateAtCurrent && amountResult.monthsAtCurrent && (
            <p className="text-xs text-slate-400 mt-1.5">
              Al ritmo actual llegarías en{' '}
              <strong className="text-slate-200">{amountResult.targetDateAtCurrent}</strong>{' '}
              ({amountResult.monthsAtCurrent} meses).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

interface MiniStatProps {
  label: string;
  value: string;
  tone: string;
}

const MiniStat: React.FC<MiniStatProps> = ({ label, value, tone }) => (
  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
    <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`text-lg font-bold mt-1 truncate ${tone}`}>{value}</p>
  </div>
);

export default DreamPlanner;
