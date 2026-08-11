-- =========================================================
-- MIGRACIÓN: Soporte para dos miembros (Simón y María)
-- Fecha: 2026-08-10
-- =========================================================
-- Esta migración es aditiva: no rompe el schema existente.
-- Las filas previas quedan asignadas a 'simon' para mantener
-- la restricción NOT NULL del nuevo campo.

-- 1) Columna owner en categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS owner text NOT NULL DEFAULT 'simon'
  CHECK (owner IN ('simon', 'maria'));

-- 2) Columna owner en expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS owner text NOT NULL DEFAULT 'simon'
  CHECK (owner IN ('simon', 'maria'));

-- 3) Índices para acelerar el filtrado por miembro
CREATE INDEX IF NOT EXISTS idx_categories_owner ON public.categories(owner);
CREATE INDEX IF NOT EXISTS idx_expenses_owner   ON public.expenses(owner);

-- 4) Nueva tabla monthly_income
--    Guarda el ingreso mensual que digitó cada miembro (Simón o María).
--    UNIQUE(owner, period) garantiza un único registro por mes y miembro.
CREATE TABLE IF NOT EXISTS public.monthly_income (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner text NOT NULL CHECK (owner IN ('simon', 'maria')),
    period date NOT NULL,
    amount numeric NOT NULL CHECK (amount >= 0),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(owner, period)
);

CREATE INDEX IF NOT EXISTS idx_monthly_income_owner_period
  ON public.monthly_income(owner, period);

-- 5) RLS para monthly_income (mismo nivel público que el resto del MVP)
ALTER TABLE public.monthly_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura publica de ingresos mensuales"
  ON public.monthly_income FOR SELECT USING (true);

CREATE POLICY "Permitir insertar ingresos mensuales publicamente"
  ON public.monthly_income FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizar ingresos mensuales publicamente"
  ON public.monthly_income FOR UPDATE USING (true);

CREATE POLICY "Permitir eliminar ingresos mensuales publicamente"
  ON public.monthly_income FOR DELETE USING (true);

-- 6) Backfill: cualquier fila existente queda en 'simon'
UPDATE public.categories SET owner = 'simon' WHERE owner IS DISTINCT FROM 'simon';
UPDATE public.expenses   SET owner = 'simon' WHERE owner IS DISTINCT FROM 'simon';
