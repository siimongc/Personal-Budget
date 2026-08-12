import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
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
  const [currentSavings, setCurrentSavings] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [goal, setGoal] = useState<number | ''>('');

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

  // Cálculo del sueño
  const result = useMemo(() => {
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

  // Datos para el mini chart de proyección
  const projectionData = useMemo(() => {
    if (!result || result.kind !== 'projection') return [];
    const { saved, contribution, months } = result;
    const points: Array<{ month: number; ahorro: number }> = [{ month: 0, ahorro: saved }];
    // Limitar a ~30 puntos en el chart para no renderizar miles
    const step = Math.max(1, Math.ceil(months / 30));
    for (let m = step; m <= months; m += step) {
      points.push({ month: m, ahorro: saved + contribution * m });
    }
    if (points[points.length - 1].month !== months) {
      points.push({ month: months, ahorro: saved + contribution * months });
    }
    return points;
  }, [result]);

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
            </div>
          </div>

          {/* Resultado */}
          <div className="lg:col-span-3 space-y-4">
            {!result ? (
              <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[280px]">
                <GoalIcon size={32} className="text-slate-600 mb-3" />
                <p className="text-slate-300 font-medium">Cuéntanos tu sueño</p>
                <p className="text-slate-500 text-sm mt-1 max-w-xs">
                  Llena los tres campos para ver cuánto tardarías en alcanzar tu objetivo.
                </p>
              </div>
            ) : result.kind === 'covered' ? (
              <CoveredCard
                memberInfo={memberInfo}
                saved={result.saved}
                target={result.target}
              />
            ) : result.kind === 'no_contribution' ? (
              <NoContributionCard
                categoryName={selectedCategory?.name ?? ''}
                remaining={result.remaining}
              />
            ) : (
              <ProjectionCard
                memberInfo={memberInfo}
                result={result}
                projectionData={projectionData}
                categoryHasNoHistory={selectedCategoryHasNoHistory}
              />
            )}

            {selectedCategoryHasNoHistory && result?.kind === 'projection' && (
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

interface ProjectionResult {
  kind: 'projection';
  saved: number;
  target: number;
  remaining: number;
  contribution: number;
  months: number;
  targetDate: string;
  sampleCount: number;
}

interface ProjectionCardProps {
  memberInfo: ReturnType<typeof getMember>;
  result: ProjectionResult;
  projectionData: Array<{ month: number; ahorro: number }>;
  categoryHasNoHistory: boolean;
}

const ProjectionCard: React.FC<ProjectionCardProps> = ({
  memberInfo,
  result,
  projectionData,
  categoryHasNoHistory,
}) => {
  const years = result.months / 12;
  const timeLabel =
    result.months >= 12
      ? `${result.months} meses · ${years.toFixed(1)} años`
      : `${result.months} ${result.months === 1 ? 'mes' : 'meses'}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
      <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${memberInfo.bgClass}`} />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10 space-y-6">
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Tiempo estimado</p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`text-5xl sm:text-6xl font-bold ${memberInfo.textClass}`}>
              {result.months}
            </span>
            <span className="text-xl text-slate-300">
              {result.months === 1 ? 'mes' : 'meses'}
            </span>
            <span className="text-sm text-slate-500">· {timeLabel}</span>
          </div>
          <p className="text-slate-400 mt-2">
            Llegarías en <strong className="text-white">{result.targetDate}</strong>
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <MiniStat
            label="Aporte mensual"
            value={formatCurrency(result.contribution)}
            tone={memberInfo.textClass}
          />
          <MiniStat
            label="Te faltan"
            value={formatCurrency(result.remaining)}
            tone="text-amber-400"
          />
          <MiniStat label="Objetivo" value={formatCurrency(result.target)} tone="text-white" />
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-3 flex items-center gap-2">
            <Sparkles size={12} />
            {categoryHasNoHistory
              ? 'Estimación: la categoría no tiene historial, usamos % actual sobre el último ingreso.'
              : `Basado en ${result.sampleCount} ${result.sampleCount === 1 ? 'periodo guardado' : 'periodos guardados'}.`}
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
                  y={result.target}
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