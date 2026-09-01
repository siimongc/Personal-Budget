-- =========================================================
-- MIGRACIÓN: Autenticación real con Supabase Auth
-- Fecha: 2026-09-01
-- =========================================================
-- Reemplaza el picker hardcodeado ('simon'/'maria') por cuentas
-- reales de Supabase Auth. Cada fila pasa a pertenecer a un
-- auth.users.id real (owner_id) protegido por RLS con auth.uid().
--
-- Esta migración se corre en DOS pasos porque requiere un backfill
-- manual entre medio (no se puede automatizar la creación de las
-- cuentas de Simón y María). Seguí el orden:
--
--   PASO 1) Correr la sección "1) Columnas nuevas (aditivo)".
--   PASO 2) Crear las cuentas reales de Simón y María (signup en la
--           app, o Authentication > Users en el dashboard de
--           Supabase). Copiar sus UUID.
--   PASO 3) Reemplazar los placeholders <SIMON_UUID> / <MARIA_UUID>
--           de la sección "2) Backfill manual" y correrla.
--   PASO 4) Correr el resto del archivo (secciones 3 en adelante).

-- =========================================================
-- 1) Columnas nuevas (aditivo, no rompe nada existente)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text NOT NULL,
    initial text,
    accent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios leen su propio perfil"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Los usuarios crean su propio perfil"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Los usuarios actualizan su propio perfil"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.monthly_income
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.period_snapshots
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- =========================================================
-- 2) Backfill manual — reemplazá los placeholders antes de correr
-- =========================================================
-- UPDATE public.categories       SET owner_id = '<SIMON_UUID>' WHERE owner = 'simon';
-- UPDATE public.categories       SET owner_id = '<MARIA_UUID>' WHERE owner = 'maria';
-- UPDATE public.expenses         SET owner_id = '<SIMON_UUID>' WHERE owner = 'simon';
-- UPDATE public.expenses         SET owner_id = '<MARIA_UUID>' WHERE owner = 'maria';
-- UPDATE public.monthly_income   SET owner_id = '<SIMON_UUID>' WHERE owner = 'simon';
-- UPDATE public.monthly_income   SET owner_id = '<MARIA_UUID>' WHERE owner = 'maria';
-- UPDATE public.period_snapshots SET owner_id = '<SIMON_UUID>' WHERE owner = 'simon';
-- UPDATE public.period_snapshots SET owner_id = '<MARIA_UUID>' WHERE owner = 'maria';
--
-- UPDATE public.profiles SET display_name = 'Simón', initial = 'S', accent = 'emerald' WHERE id = '<SIMON_UUID>';
-- UPDATE public.profiles SET display_name = 'María', initial = 'M', accent = 'pink'    WHERE id = '<MARIA_UUID>';
-- (o insertá directamente si el trigger de onboarding de la app no corrió esas filas)

-- =========================================================
-- 3) Cerrar el esquema: NOT NULL, quitar columna vieja, índices
-- =========================================================

ALTER TABLE public.categories       ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.expenses         ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.monthly_income   ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.period_snapshots ALTER COLUMN owner_id SET NOT NULL;

ALTER TABLE public.categories       DROP COLUMN IF EXISTS owner;
ALTER TABLE public.expenses         DROP COLUMN IF EXISTS owner;
ALTER TABLE public.monthly_income   DROP COLUMN IF EXISTS owner;
ALTER TABLE public.period_snapshots DROP COLUMN IF EXISTS owner;

-- monthly_income y period_snapshots tenían UNIQUE(owner, period);
-- recrearla sobre owner_id.
ALTER TABLE public.monthly_income
  DROP CONSTRAINT IF EXISTS monthly_income_owner_period_key;
ALTER TABLE public.monthly_income
  ADD CONSTRAINT monthly_income_owner_id_period_key UNIQUE (owner_id, period);

ALTER TABLE public.period_snapshots
  DROP CONSTRAINT IF EXISTS period_snapshots_owner_period_key;
ALTER TABLE public.period_snapshots
  ADD CONSTRAINT period_snapshots_owner_id_period_key UNIQUE (owner_id, period);

CREATE INDEX IF NOT EXISTS idx_categories_owner_id       ON public.categories(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_owner_id         ON public.expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_monthly_income_owner_id   ON public.monthly_income(owner_id, period);
CREATE INDEX IF NOT EXISTS idx_period_snapshots_owner_id ON public.period_snapshots(owner_id, period);

-- =========================================================
-- 4) RLS real: cada usuario solo ve/edita lo suyo
-- =========================================================

DROP POLICY IF EXISTS "Permitir lectura publica de categorias"      ON public.categories;
DROP POLICY IF EXISTS "Permitir insertar categorias publicamente"   ON public.categories;
DROP POLICY IF EXISTS "Permitir actualizar categorias publicamente" ON public.categories;
DROP POLICY IF EXISTS "Permitir eliminar categorias publicamente"   ON public.categories;

CREATE POLICY "categories_select_own" ON public.categories FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "categories_insert_own" ON public.categories FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "categories_update_own" ON public.categories FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "categories_delete_own" ON public.categories FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Permitir lectura publica de gastos"      ON public.expenses;
DROP POLICY IF EXISTS "Permitir insertar gastos publicamente"   ON public.expenses;
DROP POLICY IF EXISTS "Permitir actualizar gastos publicamente" ON public.expenses;
DROP POLICY IF EXISTS "Permitir eliminar gastos publicamente"   ON public.expenses;

CREATE POLICY "expenses_select_own" ON public.expenses FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "expenses_insert_own" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "expenses_update_own" ON public.expenses FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "expenses_delete_own" ON public.expenses FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Permitir lectura publica de ingresos mensuales"    ON public.monthly_income;
DROP POLICY IF EXISTS "Permitir insertar ingresos mensuales publicamente" ON public.monthly_income;
DROP POLICY IF EXISTS "Permitir actualizar ingresos mensuales publicamente" ON public.monthly_income;
DROP POLICY IF EXISTS "Permitir eliminar ingresos mensuales publicamente" ON public.monthly_income;

CREATE POLICY "monthly_income_select_own" ON public.monthly_income FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "monthly_income_insert_own" ON public.monthly_income FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "monthly_income_update_own" ON public.monthly_income FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "monthly_income_delete_own" ON public.monthly_income FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Permitir lectura publica de snapshots"    ON public.period_snapshots;
DROP POLICY IF EXISTS "Permitir insertar snapshots publicamente" ON public.period_snapshots;
DROP POLICY IF EXISTS "Permitir actualizar snapshots publicamente" ON public.period_snapshots;
DROP POLICY IF EXISTS "Permitir eliminar snapshots publicamente" ON public.period_snapshots;

CREATE POLICY "period_snapshots_select_own" ON public.period_snapshots FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "period_snapshots_insert_own" ON public.period_snapshots FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "period_snapshots_update_own" ON public.period_snapshots FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "period_snapshots_delete_own" ON public.period_snapshots FOR DELETE USING (auth.uid() = owner_id);

-- =========================================================
-- 5) Vínculo con el bot de Telegram
-- =========================================================
-- El webhook usa la service role key (bypassa RLS), pero igual
-- habilitamos RLS para que el usuario pueda generar/consultar su
-- propio código desde el cliente con la anon key.

CREATE TABLE IF NOT EXISTS public.telegram_link_codes (
    code text PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at timestamp with time zone NOT NULL,
    used boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telegram_link_codes_select_own" ON public.telegram_link_codes FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "telegram_link_codes_insert_own" ON public.telegram_link_codes FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.telegram_links (
    chat_id bigint PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    linked_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telegram_links_select_own" ON public.telegram_links FOR SELECT USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_owner ON public.telegram_link_codes(owner_id);
