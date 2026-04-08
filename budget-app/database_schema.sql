-- CREACIÓN DE TABLAS PARA FINANZAS PRO

-- Tabla de Categorías (Gestor que armamos en la web)
CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    percentage numeric NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    color text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabla de Gastos (Lo que envía el bot o el botón +)
CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
    amount numeric NOT NULL CHECK (amount > 0),
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =========================================================
-- CONFIGURACIÓN DE SEGURIDAD (Row Level Security) MVP
-- =========================================================
-- Alerta: Permitimos que cualquier persona "anon" pueda leer y escribir. 
-- Esto es útil para tu etapa de desarrollo inicial sin Autenticación.
-- Cuando lances a Producción real, deberás añadir restricciones "auth.uid()".

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Políticas para categories
CREATE POLICY "Permitir lectura publica de categorias" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Permitir insertar categorias publicamente" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizar categorias publicamente" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminar categorias publicamente" ON public.categories FOR DELETE USING (true);

-- Políticas para expenses
CREATE POLICY "Permitir lectura publica de gastos" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Permitir insertar gastos publicamente" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizar gastos publicamente" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminar gastos publicamente" ON public.expenses FOR DELETE USING (true);
