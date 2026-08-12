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
import type { Category, MemberId, PeriodSnapshot } from '../types';
import { getMember } from '../lib/members';
import { supabase } from '../lib/supabase';

interface DreamPlannerProps {
  categories: Category[];
  currentMember: MemberId;
  onMemberChange?: (member: MemberId) => void;
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

const DreamPlanner: React.FC<DreamPlannerProps> = ({
  categories,
  currentMember,
  onMemberChange,
}) => {
  const [member, setMember] = useState<MemberId>(currentMember);
  const [mode, setMode] = useState<'time' | 'amount'>('time');
  const [currentSavings, setCurrentSavings] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [goal, setGoal] = useState<number | ''>('');
  const [years, setYears] = useState<number | ''>('');

  const [snapshots, setSnapshots] = useState<PeriodSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMember(currentMember);
  }, [currentMember]);

  const memberInfo = getMember(member);
  const memberCategories = useMemo(
    () => categories.filter((c) => c.owner === member),
    [categories, member]
  );

  useEffect(() => {
    // Si la categoría seleccionada ya no existe para el miembro, limpiarla.
    if (categoryId && !memberCategories.some((c) => c.id === categoryId)) {
      setCategoryId('');
    }
    if (!categoryId && memberCategories.length > 0) {
      setCategoryId(memberCategories[0].id);
    }
  }, [memberCategories, categoryId]);

  // Cargar snapshots del miembro seleccionado
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('period_snapshots')
        .select('*')
        .eq('owner', member)
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
  }, [member]);

  const selectedCategory = useMemo(
    () => memberCategories.find((c) => c.id === categoryId) ?? null,
    [memberCategories, categoryId]
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

    if (remaining <= 0) {
      return { kind: 'covered' as const, saved, target };
    }

    if (contribution <= 0) {
      return { kind: 'no_contribution' as const, saved, target, remaining };
    }

    const months = Math.ceil(remaining / contribution);
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
  }, [currentSavings, goal, monthlyContribution]);

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

    if (remaining <= 0) {
      return { kind: 'covered' as const, saved, target };
    }

    const totalMonths = Math.max(1, Math.round(yearsNum * 12));
    const requiredMonthly = remaining / totalMonths;
    const currentMonthly = monthlyContribution.value;
    const cushion = currentMonthly - requiredMonthly;

    let monthsAtCurrent: number | null = null;
    let targetDateAtCurrent: string | null = null;
    if (currentMonthly > 0) {
      monthsAtCurrent = Math.ceil(remaining / currentMonthly);
      targetDateAtCurrent = formatTargetDate(monthsAtCurrent);
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
  }, [currentSavings, goal, years, monthlyContribution]);

  // Datos para el mini chart de proyección (modo tiempo)
  const projectionData = useMemo(() => {
    if (!timeResult || timeResult.kind !== 'projection') return [];
    const { saved, contribution, months } = timeResult;
    const points: Array<{ month: number; ahorro: number }> = [{ month: 0, ahorro: saved }];
    const step = Math.max(1, Math.ceil(months / 30));
    for (let m = step; m <= months; m += step) {
      points.push({ month: m, ahorro: saved + contribution * m });
    }
    if (points[points.length - 1].month !== months) {
      points.push({ month: months, ahorro: saved + contribution * months });
    }
    return points;
  }, [timeResult]);

  // Datos para el mini chart de proyección (modo aporte) — doble línea
  const amountChartData = useMemo(() => {
    if (!amountResult || amountResult.kind !== 'amount') return [];
    const { saved, requiredMonthly, currentMonthly, totalMonths, years: yearsNum } = amountResult;
    const step = Math.max(1, Math.ceil(totalMonths / 30));
    const points: Array<{ year: number; requerido: number; actual: number }> = [];
    for (let m = 0; m <= totalMonths; m += step) {
      points.push({
        year: Number((m / 12).toFixed(2)),
        requerido: saved + requiredMonthly * m,
        actual: saved + (currentMonthly > 0 ? currentMonthly * m : 0),
      });
    }
    if (points[points.length - 1].year !== yearsNum) {
      points.push({
        year: Number(yearsNum.toFixed(2)),
        requerido: saved + requiredMonthly * totalMonths,
        actual: saved + (currentMonthly > 0 ? currentMonthly * totalMonths : 0),
      });
    }
    return points;
  }, [amountResult]);

  const noCategories = !loading && memberCategories.length === 0;
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
          ¿Cuánto te falta para tu meta? Te lo calculamos con tu ritmo real de los últimos{' '}
          {MONTHS_WINDOW} periodos guardados.
        </p>
      </header>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            ¿Qué quieres calcular?
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMode('time')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              mode === 'time'
                ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Clock size={16} />
            <span>¿Cuánto tardaré?</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('amount')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              mode === 'amount'
                ? 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30'
                : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Calculator size={16} />
            <span>¿Cuánto debo ahorrar al mes?</span>
          </button>
        </div>
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            ¿Para quién es el sueño?
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['simon', 'maria'] as MemberId[]).map((opt) => {
            const info = getMember(opt);
            const isActive = member === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setMember(opt);
                  onMemberChange?.(opt);
                }}
                className={`relative text-left rounded-xl border p-4 transition-all duration-200 overflow-hidden ${
                  isActive
                    ? `border-transparent bg-slate-900 ring-2 ${info.ringClass} ${info.glowClass}`
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div
                  className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-opacity duration-500 ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  } ${info.bgClass}`}
                />
                <div className="relative z-10 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-tr ${info.gradient}`}
                  >
                    {info.initial}
                  </div>
                  <div>
                    <p className={`font-semibold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                      {info.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isActive ? 'Miembro activo' : 'Toca para seleccionar'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {noCategories ? (
        <EmptyState
          icon={<PiggyBank size={32} />}
          title={`${memberInfo.label} aún no tiene categorías`}
          message="Crea categorías con sus porcentajes en la sección Categorías para poder calcular sueños."
        />
      ) : noSnapshots ? (
        <EmptyState
          icon={<Inbox size={32} />}
          title="No hay periodos guardados"
          message={`Ve a Distribuidor, digita el ingreso de ${memberInfo.label} y pulsa "Guardar periodo" para empezar.`}
        />
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Formulario */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${memberInfo.bgClass}`} />
            <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <GoalIcon size={18} className={memberInfo.textClass} />
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
                    className={`w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-2.5 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${memberInfo.ringClass.replace('ring-', 'focus:ring-')}`}
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
                  className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${memberInfo.ringClass.replace('ring-', 'focus:ring-')}`}
                >
                  {memberCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.percentage}%)
                    </option>
                  ))}
                </select>
                {selectedCategory && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    En el último periodo, {selectedCategory.name} recibió{' '}
                    <span className={memberInfo.textClass}>
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
                    className={`w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-2.5 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${memberInfo.ringClass.replace('ring-', 'focus:ring-')}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center justify-between">
                  <span>Plazo en años</span>
                  <span className="text-xs text-slate-500">
                    {mode === 'time'
                      ? 'Necesario para "¿Cuánto debo ahorrar?"'
                      : 'Usado para el cálculo de aporte'}
                  </span>
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
                    className={`w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-16 py-2.5 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${memberInfo.ringClass.replace('ring-', 'focus:ring-')}`}
                  />
                  <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500 text-sm">
                    años
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className="lg:col-span-3 space-y-4">
            {mode === 'time' ? (
              <TimeModeResult
                timeResult={timeResult}
                memberInfo={memberInfo}
                selectedCategory={selectedCategory}
                projectionData={projectionData}
                categoryHasNoHistory={selectedCategoryHasNoHistory}
              />
            ) : (
              <AmountModeResult
                amountResult={amountResult}
                memberInfo={memberInfo}
                amountChartData={amountChartData}
                categoryHasNoHistory={selectedCategoryHasNoHistory}
              />
            )}

            {selectedCategoryHasNoHistory &&
              ((mode === 'time' && timeResult?.kind === 'projection') ||
                (mode === 'amount' && amountResult?.kind === 'amount')) && (
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
  memberInfo: ReturnType<typeof getMember>;
  saved: number;
  target: number;
}

const CoveredCard: React.FC<CoveredCardProps> = ({ memberInfo, saved, target }) => (
  <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-2xl p-8 relative overflow-hidden">
    <div className={`absolute -top-20 -right-20 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${memberInfo.bgClass}`} />
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

interface TimeModeResultProps {
  timeResult: TimeResult;
  memberInfo: ReturnType<typeof getMember>;
  selectedCategory: Category | null;
  projectionData: Array<{ month: number; ahorro: number }>;
  categoryHasNoHistory: boolean;
}

const TimeModeResult: React.FC<TimeModeResultProps> = ({
  timeResult,
  memberInfo,
  selectedCategory,
  projectionData,
  categoryHasNoHistory,
}) => {
  if (!timeResult) {
    return (
      <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[280px]">
        <GoalIcon size={32} className="text-slate-600 mb-3" />
        <p className="text-slate-300 font-medium">Cuéntanos tu sueño</p>
        <p className="text-slate-500 text-sm mt-1 max-w-xs">
          Llena los campos para ver cuánto tardarías en alcanzar tu objetivo.
        </p>
      </div>
    );
  }

  if (timeResult.kind === 'covered') {
    return (
      <CoveredCard
        memberInfo={memberInfo}
        saved={timeResult.saved}
        target={timeResult.target}
      />
    );
  }

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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
      <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${memberInfo.bgClass}`} />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10 space-y-6">
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Tiempo estimado</p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`text-5xl sm:text-6xl font-bold ${memberInfo.textClass}`}>
              {timeResult.months}
            </span>
            <span className="text-xl text-slate-300">
              {timeResult.months === 1 ? 'mes' : 'meses'}
            </span>
            <span className="text-sm text-slate-500">· {timeLabel}</span>
          </div>
          <p className="text-slate-400 mt-2">
            Llegarías en <strong className="text-white">{timeResult.targetDate}</strong>
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <MiniStat
            label="Aporte mensual"
            value={formatCurrency(timeResult.contribution)}
            tone={memberInfo.textClass}
          />
          <MiniStat
            label="Te faltan"
            value={formatCurrency(timeResult.remaining)}
            tone="text-amber-400"
          />
          <MiniStat label="Objetivo" value={formatCurrency(timeResult.target)} tone="text-white" />
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-3 flex items-center gap-2">
            <Sparkles size={12} />
            {categoryHasNoHistory
              ? 'Estimación: la categoría no tiene historial, usamos % actual sobre el último ingreso.'
              : `Basado en ${timeResult.sampleCount} ${timeResult.sampleCount === 1 ? 'periodo guardado' : 'periodos guardados'}.`}
          </p>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
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
                    const numValue = typeof value === 'number' ? value : Number(value ?? 0);
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
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

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

interface AmountModeResultProps {
  amountResult: AmountResultType;
  memberInfo: ReturnType<typeof getMember>;
  amountChartData: Array<{ year: number; requerido: number; actual: number }>;
  categoryHasNoHistory: boolean;
}

const AmountModeResult: React.FC<AmountModeResultProps> = ({
  amountResult,
  memberInfo,
  amountChartData,
  categoryHasNoHistory,
}) => {
  if (!amountResult) {
    return (
      <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[280px]">
        <Calculator size={32} className="text-slate-600 mb-3" />
        <p className="text-slate-300 font-medium">Define tu plazo</p>
        <p className="text-slate-500 text-sm mt-1 max-w-xs">
          Indica tu ahorro actual, la categoría, el objetivo y los años en los que quieres
          lograrlo. Te diremos cuánto debes aportar al mes.
        </p>
      </div>
    );
  }

  if (amountResult.kind === 'covered') {
    return (
      <CoveredCard
        memberInfo={memberInfo}
        saved={amountResult.saved}
        target={amountResult.target}
      />
    );
  }

  const isOnTrack = amountResult.cushion >= 0;
  const hasCurrentPace = amountResult.currentMonthly > 0;
  const shortfall = amountResult.requiredMonthly - amountResult.currentMonthly;
  const sampleLabel =
    amountResult.sampleCount === 0
      ? 'Sin historial de la categoría'
      : `Basado en ${amountResult.sampleCount} ${amountResult.sampleCount === 1 ? 'periodo guardado' : 'periodos guardados'}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
      <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${memberInfo.bgClass}`} />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10 space-y-6">
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">
            Aporte mensual requerido
          </p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-5xl sm:text-6xl font-bold text-white">
              {formatCurrency(amountResult.requiredMonthly)}
            </span>
            <span className="text-xl text-slate-300">/ mes</span>
          </div>
          <p className="text-slate-400 mt-2">
            Para llegar a <strong className="text-white">{formatCurrency(amountResult.target)}</strong> en{' '}
            <strong className="text-white">
              {amountResult.years} {amountResult.years === 1 ? 'año' : 'años'}
            </strong>{' '}
            ({amountResult.totalMonths} meses).
          </p>
        </div>

        <div
          className={`rounded-xl p-4 border ${
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
              {hasCurrentPace ? (
                <p className="text-sm text-slate-300 mt-1">
                  Tu ritmo actual es{' '}
                  <strong className="text-white">
                    {formatCurrency(amountResult.currentMonthly)}/mes
                  </strong>
                  {isOnTrack ? (
                    <>
                      {' '}
                      · Te sobra{' '}
                      <strong className="text-emerald-400">
                        {formatCurrency(amountResult.cushion)}/mes
                      </strong>
                      .
                    </>
                  ) : (
                    <>
                      {' '}
                      · Te faltan{' '}
                      <strong className="text-amber-400">
                        {formatCurrency(shortfall)}/mes
                      </strong>{' '}
                      para llegar a tiempo.
                    </>
                  )}
                </p>
              ) : (
                <p className="text-sm text-slate-300 mt-1">
                  La categoría no tiene historial registrado. Ajusta su porcentaje o guarda
                  periodos en Distribuidor para poder comparar.
                </p>
              )}
              {hasCurrentPace && amountResult.targetDateAtCurrent && (
                <p className="text-xs text-slate-400 mt-1.5">
                  Al ritmo actual llegarías en{' '}
                  <strong className="text-slate-200">{amountResult.targetDateAtCurrent}</strong>{' '}
                  ({amountResult.monthsAtCurrent} meses).
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <MiniStat
            label="Requerido/mes"
            value={formatCurrency(amountResult.requiredMonthly)}
            tone={isOnTrack ? 'text-emerald-400' : 'text-amber-400'}
          />
          <MiniStat
            label="Tu ritmo actual"
            value={hasCurrentPace ? formatCurrency(amountResult.currentMonthly) : '—'}
            tone={memberInfo.textClass}
          />
          <MiniStat
            label="Plazo"
            value={`${amountResult.years} ${amountResult.years === 1 ? 'año' : 'años'}`}
            tone="text-white"
          />
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-3 flex items-center gap-2">
            <Sparkles size={12} />
            {categoryHasNoHistory
              ? 'Estimación: la categoría no tiene historial, usamos % actual sobre el último ingreso.'
              : sampleLabel}
          </p>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
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
                    const numValue = typeof value === 'number' ? value : Number(value ?? 0);
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
                  y={amountResult.target}
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
                  stroke={memberInfo.id === 'simon' ? '#34d399' : '#f472b6'}
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
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