import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  Inbox,
  TrendingUp,
  CalendarRange,
  Wallet,
  PieChart as PieChartIcon,
  Trash2,
  X,
} from 'lucide-react';
import type { Category, MemberId, MonthlyIncome, PeriodSnapshot } from '../types';
import { MEMBERS, getMember } from '../lib/members';
import { supabase } from '../lib/supabase';

interface TrackerProps {
  categories: Category[];
  currentMember: MemberId;
  onMemberChange?: (member: MemberId) => void;
}

type RangeKey = '1m' | '3m' | '6m' | '12m' | 'all';
type OwnerFilter = MemberId | 'both';

const RANGE_OPTIONS: { key: RangeKey; label: string; months: number | null }[] = [
  { key: '1m', label: '1 mes', months: 1 },
  { key: '3m', label: '3 meses', months: 3 },
  { key: '6m', label: '6 meses', months: 6 },
  { key: '12m', label: '12 meses', months: 12 },
  { key: 'all', label: 'Todo', months: null },
];

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

const periodToMonthKey = (period: string): string => {
  const yyyy = period.slice(0, 4);
  const mm = period.slice(5, 7);
  return `${yyyy}-${mm}`;
};

const monthKeyToLabel = (key: string): string => {
  const [yyyy, mm] = key.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[Number(mm) - 1]} ${yyyy.slice(2)}`;
};

const currentMonthKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const shiftMonthKey = (key: string, deltaMonths: number): string => {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y, m - 1 + deltaMonths, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const Tracker: React.FC<TrackerProps> = ({ categories, currentMember, onMemberChange }) => {
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>(currentMember);
  const [range, setRange] = useState<RangeKey>('6m');

  const [incomeRows, setIncomeRows] = useState<MonthlyIncome[]>([]);
  const [snapshots, setSnapshots] = useState<PeriodSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingPeriod, setDeletingPeriod] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    setOwnerFilter(currentMember);
  }, [currentMember]);

  const handleDeleteSnapshot = async (snap: PeriodSnapshot) => {
    const memberLabel = getMember(snap.owner).label;
    const monthLabel = monthKeyToLabel(periodToMonthKey(snap.period));
    const confirmed = window.confirm(
      `¿Eliminar el periodo ${monthLabel} de ${memberLabel}? Esta acción no se deshace.`
    );
    if (!confirmed) return;

    setDeletingPeriod(snap.period);
    setDeleteFeedback(null);

    const { error: deleteError } = await supabase
      .from('period_snapshots')
      .delete()
      .eq('owner', snap.owner)
      .eq('period', snap.period);

    if (deleteError) {
      console.error('Error eliminando snapshot:', deleteError);
      setDeleteFeedback({
        type: 'error',
        message: `No se pudo eliminar el periodo ${monthLabel}.`,
      });
      setDeletingPeriod(null);
      return;
    }

    setSnapshots((prev) =>
      prev.filter((s) => !(s.owner === snap.owner && s.period === snap.period))
    );
    setDeleteFeedback({
      type: 'success',
      message: `Periodo ${monthLabel} de ${memberLabel} eliminado.`,
    });
    setDeletingPeriod(null);
    setTimeout(() => setDeleteFeedback(null), 2500);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setDeleteFeedback(null);
      try {
        const owners: MemberId[] =
          ownerFilter === 'both' ? ['simon', 'maria'] : [ownerFilter];

        const [incomeRes, snapshotRes] = await Promise.all([
          supabase
            .from('monthly_income')
            .select('*')
            .in('owner', owners)
            .order('period', { ascending: true }),
          supabase
            .from('period_snapshots')
            .select('*')
            .in('owner', owners)
            .order('period', { ascending: true }),
        ]);

        if (cancelled) return;

        if (incomeRes.error) throw incomeRes.error;
        if (snapshotRes.error) throw snapshotRes.error;

        setIncomeRows((incomeRes.data ?? []) as MonthlyIncome[]);
        setSnapshots((snapshotRes.data ?? []) as PeriodSnapshot[]);
      } catch (err) {
        console.error('Error cargando datos del tracker:', err);
        if (!cancelled) {
          setError('No se pudieron cargar los datos del tracker.');
          setIncomeRows([]);
          setSnapshots([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [ownerFilter]);

  // Filtrar por rango
  const rangeMonths = RANGE_OPTIONS.find((r) => r.key === range)?.months ?? null;
  const cutoffKey = useMemo(() => {
    if (rangeMonths === null) return null;
    return shiftMonthKey(currentMonthKey(), -(rangeMonths - 1));
  }, [rangeMonths]);

  const filteredIncome = useMemo(() => {
    if (!cutoffKey) return incomeRows;
    return incomeRows.filter((row) => periodToMonthKey(row.period) >= cutoffKey);
  }, [incomeRows, cutoffKey]);

  const filteredSnapshots = useMemo(() => {
    if (!cutoffKey) return snapshots;
    return snapshots.filter((s) => periodToMonthKey(s.period) >= cutoffKey);
  }, [snapshots, cutoffKey]);

  // KPIs
  const kpis = useMemo<{
    totalIncome: number;
    avgIncome: number;
    maxIncome: number;
    snapshotCount: number;
    incomeCount: number;
    topCategory: { name: string; amount: number } | null;
  }>(() => {
    const totalIncome = filteredIncome.reduce((acc, r) => acc + Number(r.amount), 0);
    const avgIncome = filteredIncome.length > 0 ? totalIncome / filteredIncome.length : 0;
    const maxIncome = filteredIncome.reduce(
      (acc, r) => Math.max(acc, Number(r.amount)),
      0
    );

    const categoryTotals = new Map<string, number>();
    filteredSnapshots.forEach((snap) => {
      snap.distributions.forEach((d) => {
        categoryTotals.set(d.name, (categoryTotals.get(d.name) ?? 0) + d.amount);
      });
    });

    let topCategory: { name: string; amount: number } | null = null;
    categoryTotals.forEach((catAmount, catName) => {
      if (topCategory === null || catAmount > topCategory.amount) {
        topCategory = { name: catName, amount: catAmount };
      }
    });

    return {
      totalIncome,
      avgIncome,
      maxIncome,
      snapshotCount: filteredSnapshots.length,
      incomeCount: filteredIncome.length,
      topCategory,
    };
  }, [filteredIncome, filteredSnapshots]);

  // Línea de ingresos: agrupada por mes y miembro
  const incomeLineData = useMemo(() => {
    const owners: MemberId[] =
      ownerFilter === 'both' ? ['simon', 'maria'] : [ownerFilter];
    const monthSet = new Set<string>();
    filteredIncome.forEach((r) => monthSet.add(periodToMonthKey(r.period)));

    if (monthSet.size === 0) return [] as Array<Record<string, string | number>>;

    const sortedMonths = Array.from(monthSet).sort();
    return sortedMonths.map((monthKey) => {
      const row: Record<string, string | number> = { month: monthKeyToLabel(monthKey) };
      owners.forEach((owner) => {
        const match = filteredIncome.find(
          (r) => periodToMonthKey(r.period) === monthKey && r.owner === owner
        );
        row[owner] = match ? Number(match.amount) : 0;
      });
      return row;
    });
  }, [filteredIncome, ownerFilter]);

  // Área apilada por categoría: una serie por nombre de categoría
  const categoryAreaData = useMemo(() => {
    if (filteredSnapshots.length === 0) return { rows: [] as Array<Record<string, string | number>>, names: [] as string[] };

    const monthSet = new Set<string>();
    filteredSnapshots.forEach((s) => monthSet.add(periodToMonthKey(s.period)));

    // Determinar si el ownerFilter es "ambos": en ese caso sumamos por mes+categoría
    // sin distinguir miembros. Si es un miembro, mismo comportamiento.
    const categoryNames = new Set<string>();
    filteredSnapshots.forEach((s) =>
      s.distributions.forEach((d) => categoryNames.add(d.name))
    );

    const sortedMonths = Array.from(monthSet).sort();
    const rows = sortedMonths.map((monthKey) => {
      const row: Record<string, string | number> = { month: monthKeyToLabel(monthKey) };
      const matching = filteredSnapshots.filter(
        (s) => periodToMonthKey(s.period) === monthKey
      );
      categoryNames.forEach((name) => {
        const total = matching.reduce((acc, snap) => {
          const d = snap.distributions.find((x) => x.name === name);
          return acc + (d ? d.amount : 0);
        }, 0);
        row[name] = total;
      });
      return row;
    });

    return { rows, names: Array.from(categoryNames) };
  }, [filteredSnapshots]);

  const categoryColors = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => {
      if (c.color) map.set(c.name, c.color);
    });
    filteredSnapshots.forEach((s) =>
      s.distributions.forEach((d) => {
        if (d.color && !map.has(d.name)) map.set(d.name, d.color);
      })
    );
    const fallback = ['#34d399', '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#fb923c', '#60a5fa', '#f87171'];
    let i = 0;
    const result = new Map<string, string>();
    Array.from(new Set(Array.from(map.keys()))).forEach((name) => {
      result.set(name, map.get(name) ?? fallback[i % fallback.length]);
      i += 1;
    });
    return result;
  }, [categories, filteredSnapshots]);

  // Pie: distribución del último snapshot
  const latestPieData = useMemo(() => {
    if (filteredSnapshots.length === 0) return [] as Array<{ name: string; value: number; color: string }>;
    const latest = filteredSnapshots[filteredSnapshots.length - 1];
    return latest.distributions.map((d) => ({
      name: d.name,
      value: d.amount,
      color: d.color ?? categoryColors.get(d.name) ?? '#34d399',
    }));
  }, [filteredSnapshots, categoryColors]);

  const hasData = filteredIncome.length > 0 || filteredSnapshots.length > 0;

  const memberColor = (owner: MemberId) =>
    owner === 'simon' ? '#34d399' : '#f472b6';

  return (
    <div className="space-y-6 max-w-7xl">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <BarChart3 className="text-emerald-400" /> Tracker de Periodos
        </h2>
        <p className="text-slate-400">
          Analítica y gráficas basadas en los periodos guardados desde el Distribuidor.
        </p>
      </header>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Miembro</h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['simon', 'maria', 'both'] as OwnerFilter[]).map((opt) => {
                const isActive = ownerFilter === opt;
                const label = opt === 'both' ? 'Ambos' : getMember(opt).label;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setOwnerFilter(opt);
                      if (opt !== 'both' && onMemberChange) onMemberChange(opt);
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalendarRange size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Rango</h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              {RANGE_OPTIONS.map((opt) => {
                const isActive = range === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRange(opt.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30'
                        : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : !hasData ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <Inbox size={36} className="text-slate-600 mb-3" />
          <p className="text-slate-300 font-medium">No hay datos en este rango.</p>
          <p className="text-slate-500 text-sm mt-1">
            Ve a <strong className="text-slate-300">Distribuidor</strong>, digita tu ingreso y pulsa{' '}
            <strong className="text-slate-300">Guardar periodo</strong> para empezar a construir tu histórico.
          </p>
        </div>
      ) : (
        <>
          {filteredSnapshots.length > 0 && (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CalendarRange size={18} className="text-slate-400" />
                  Periodos guardados
                </h3>
                <span className="text-xs text-slate-500">
                  {filteredSnapshots.length} en el rango actual
                </span>
              </div>

              {deleteFeedback && (
                <div
                  className={`mb-4 px-4 py-2 rounded-xl text-sm flex items-center justify-between ${
                    deleteFeedback.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  <span>{deleteFeedback.message}</span>
                  <button
                    type="button"
                    onClick={() => setDeleteFeedback(null)}
                    className="ml-3 opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Cerrar mensaje"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <ul className="divide-y divide-slate-800">
                {filteredSnapshots
                  .slice()
                  .sort((a, b) => (a.period < b.period ? 1 : -1))
                  .map((snap) => {
                    const monthLabel = monthKeyToLabel(periodToMonthKey(snap.period));
                    const memberInfo = getMember(snap.owner);
                    const isDeleting = deletingPeriod === snap.period;
                    return (
                      <li
                        key={`${snap.owner}-${snap.period}`}
                        className="flex items-center justify-between gap-4 py-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-tr ${memberInfo.gradient}`}
                          >
                            {memberInfo.initial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {monthLabel} ·{' '}
                              <span className={memberInfo.textClass}>{memberInfo.label}</span>
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {formatCurrency(snap.income)} · {snap.distributions.length}{' '}
                              {snap.distributions.length === 1 ? 'categoría' : 'categorías'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSnapshot(snap)}
                          disabled={isDeleting}
                          className={`p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ${
                            isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          aria-label={`Eliminar periodo ${monthLabel} de ${memberInfo.label}`}
                          title="Eliminar periodo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </section>
          )}

          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<TrendingUp size={18} />}
              label="Ingreso promedio"
              value={formatCurrency(kpis.avgIncome)}
              tone="emerald"
            />
            <KpiCard
              icon={<Wallet size={18} />}
              label="Ingreso total"
              value={formatCurrency(kpis.totalIncome)}
              tone="cyan"
            />
            <KpiCard
              icon={<CalendarRange size={18} />}
              label="Periodos guardados"
              value={`${kpis.snapshotCount}`}
              tone="violet"
            />
            <KpiCard
              icon={<PieChartIcon size={18} />}
              label="Categoría top"
              value={kpis.topCategory ? kpis.topCategory.name : '—'}
              hint={kpis.topCategory ? formatCurrency(kpis.topCategory.amount) : 'Sin datos'}
              tone="amber"
            />
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Evolución del ingreso</h3>
            {incomeLineData.length === 0 ? (
              <EmptyChart message="Aún no hay ingresos registrados en este rango." />
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={incomeLineData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis
                      stroke="#64748b"
                      tickFormatter={(v: number) => formatShortCurrency(v)}
                      width={70}
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
                        const key = String(name ?? '');
                        if (key === 'simon' || key === 'maria') {
                          return [formatCurrency(numValue), MEMBERS.find((m) => m.id === key)?.label ?? key];
                        }
                        return [formatCurrency(numValue), key];
                      }}
                    />
                    <Legend
                      formatter={(value: string) =>
                        value === 'simon' || value === 'maria'
                          ? MEMBERS.find((m) => m.id === value)?.label ?? value
                          : value
                      }
                    />
                    {(ownerFilter === 'both'
                      ? (['simon', 'maria'] as MemberId[])
                      : [ownerFilter as MemberId]
                    ).map((owner) => (
                      <Line
                        key={owner}
                        type="monotone"
                        dataKey={owner}
                        stroke={memberColor(owner)}
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="grid lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 lg:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4">
                Distribución por categoría (área apilada)
              </h3>
              {categoryAreaData.rows.length === 0 ? (
                <EmptyChart message="Guarda un periodo para ver la distribución por categoría." />
              ) : (
                <div style={{ width: '100%', height: 340 }}>
                  <ResponsiveContainer>
                    <AreaChart data={categoryAreaData.rows} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <defs>
                        {categoryAreaData.names.map((name) => (
                          <linearGradient key={name} id={`grad-${name.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={categoryColors.get(name) ?? '#34d399'} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={categoryColors.get(name) ?? '#34d399'} stopOpacity={0.2} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis
                        stroke="#64748b"
                        tickFormatter={(v: number) => formatShortCurrency(v)}
                        width={70}
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
                          return [formatCurrency(numValue), String(name ?? '')];
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: 12 }} />
                      {categoryAreaData.names.map((name) => (
                        <Area
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stackId="1"
                          stroke={categoryColors.get(name) ?? '#34d399'}
                          fill={`url(#grad-${name.replace(/\s+/g, '')})`}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Último periodo</h3>
              {latestPieData.length === 0 ? (
                <EmptyChart message="Sin snapshot aún." />
              ) : (
                <>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: 12,
                          }}
                          formatter={(value, name) => {
                            const numValue = typeof value === 'number' ? value : Number(value ?? 0);
                            return [formatCurrency(numValue), String(name ?? '')];
                          }}
                        />
                        <Pie
                          data={latestPieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {latestPieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-4 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {latestPieData.map((entry) => (
                      <li key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="text-slate-300 truncate">{entry.name}</span>
                        </div>
                        <span className="text-slate-400 ml-2 flex-shrink-0">{formatCurrency(entry.value)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: 'emerald' | 'cyan' | 'violet' | 'amber';
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, hint, tone }) => {
  const tones: Record<KpiCardProps['tone'], { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  };
  const t = tones[tone];
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`w-8 h-8 rounded-lg ${t.bg} ${t.text} flex items-center justify-center`}>{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-bold text-white truncate">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1 truncate">{hint}</div>}
    </div>
  );
};

const EmptyChart: React.FC<{ message: string }> = ({ message }) => (
  <div className="h-[260px] flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
    {message}
  </div>
);

export default Tracker;