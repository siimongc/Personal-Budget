-- =========================================================
-- MIGRACIÓN: Snapshots de periodo para el Distribuidor
-- Fecha: 2026-08-12
-- =========================================================
-- Esta migración crea la tabla period_snapshots que congela el
-- ingreso y la distribución por categoría del momento en que el
-- usuario pulsa "Guardar Periodo". Aunque luego cambie los
-- porcentajes de las categorías, el histórico de cada periodo
-- permanece intacto.
--
-- Es la base del Tracker (analítica por periodo) y de la futura
-- sección de Sueños Realistas.

-- 1) Nueva tabla period_snapshots
CREATE TABLE IF NOT EXISTS public.period_snapshots (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner text NOT NULL CHECK (owner IN ('simon', 'maria')),
    period date NOT NULL,
    income numeric NOT NULL CHECK (income >= 0),
    distributions jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(owner, period)
);

COMMENT ON COLUMN public.period_snapshots.distributions IS
  'Array JSON con { category_id, name, percentage, amount, color } capturado al momento del snapshot.';

-- 2) Índices para acelerar el filtrado por miembro y rango
CREATE INDEX IF NOT EXISTS idx_period_snapshots_owner_period
  ON public.period_snapshots(owner, period);

-- 3) Trigger para mantener updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_period_snapshots_updated_at ON public.period_snapshots;
CREATE TRIGGER trg_period_snapshots_updated_at
  BEFORE UPDATE ON public.period_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) RLS (mismo nivel público que el resto del MVP)
ALTER TABLE public.period_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura publica de snapshots"
  ON public.period_snapshots FOR SELECT USING (true);

CREATE POLICY "Permitir insertar snapshots publicamente"
  ON public.period_snapshots FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizar snapshots publicamente"
  ON public.period_snapshots FOR UPDATE USING (true);

CREATE POLICY "Permitir eliminar snapshots publicamente"
  ON public.period_snapshots FOR DELETE USING (true);