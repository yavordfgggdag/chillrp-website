-- Obshtina (Община): obshtina_invoices (Фактури) и obshtina_shifts (Работно време)
CREATE TABLE IF NOT EXISTS public.obshtina_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  invoice_date date NOT NULL DEFAULT (current_date),
  client_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount text NOT NULL DEFAULT '0',
  issued_by_user_id uuid REFERENCES auth.users(id),
  issued_by_name text
);

ALTER TABLE public.obshtina_invoices ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obshtina_invoices TO authenticated;

DROP POLICY IF EXISTS "Authenticated read obshtina_invoices" ON public.obshtina_invoices;
CREATE POLICY "Authenticated read obshtina_invoices"
ON public.obshtina_invoices FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert obshtina_invoices" ON public.obshtina_invoices;
CREATE POLICY "Authenticated insert obshtina_invoices"
ON public.obshtina_invoices FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update obshtina_invoices" ON public.obshtina_invoices;
CREATE POLICY "Authenticated update obshtina_invoices"
ON public.obshtina_invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete obshtina_invoices" ON public.obshtina_invoices;
CREATE POLICY "Authenticated delete obshtina_invoices"
ON public.obshtina_invoices FOR DELETE TO authenticated USING (true);

-- Obshtina shifts (Работно време)
CREATE TABLE IF NOT EXISTS public.obshtina_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL,
  ended_at timestamptz
);

ALTER TABLE public.obshtina_shifts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obshtina_shifts TO authenticated;

DROP POLICY IF EXISTS "Authenticated read obshtina_shifts" ON public.obshtina_shifts;
CREATE POLICY "Authenticated read obshtina_shifts"
ON public.obshtina_shifts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert obshtina_shifts" ON public.obshtina_shifts;
CREATE POLICY "Authenticated insert obshtina_shifts"
ON public.obshtina_shifts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update obshtina_shifts" ON public.obshtina_shifts;
CREATE POLICY "Authenticated update obshtina_shifts"
ON public.obshtina_shifts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete obshtina_shifts" ON public.obshtina_shifts;
CREATE POLICY "Authenticated delete obshtina_shifts"
ON public.obshtina_shifts FOR DELETE TO authenticated USING (true);
