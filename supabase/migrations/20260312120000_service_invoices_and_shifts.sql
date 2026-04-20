-- Service invoices (Фактури) и service_shifts (Работно време) за модула Сервиз
CREATE TABLE IF NOT EXISTS public.service_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  invoice_date date NOT NULL DEFAULT (current_date),
  client_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount text NOT NULL DEFAULT '0',
  issued_by_user_id uuid REFERENCES auth.users(id),
  issued_by_name text
);

ALTER TABLE public.service_invoices ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_invoices TO authenticated;

DROP POLICY IF EXISTS "Authenticated read service_invoices" ON public.service_invoices;
CREATE POLICY "Authenticated read service_invoices"
ON public.service_invoices FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert service_invoices" ON public.service_invoices;
CREATE POLICY "Authenticated insert service_invoices"
ON public.service_invoices FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update service_invoices" ON public.service_invoices;
CREATE POLICY "Authenticated update service_invoices"
ON public.service_invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete service_invoices" ON public.service_invoices;
CREATE POLICY "Authenticated delete service_invoices"
ON public.service_invoices FOR DELETE TO authenticated USING (true);

-- Service shifts (Работно време)
CREATE TABLE IF NOT EXISTS public.service_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL,
  ended_at timestamptz
);

ALTER TABLE public.service_shifts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_shifts TO authenticated;

DROP POLICY IF EXISTS "Authenticated read service_shifts" ON public.service_shifts;
CREATE POLICY "Authenticated read service_shifts"
ON public.service_shifts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert service_shifts" ON public.service_shifts;
CREATE POLICY "Authenticated insert service_shifts"
ON public.service_shifts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update service_shifts" ON public.service_shifts;
CREATE POLICY "Authenticated update service_shifts"
ON public.service_shifts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete service_shifts" ON public.service_shifts;
CREATE POLICY "Authenticated delete service_shifts"
ON public.service_shifts FOR DELETE TO authenticated USING (true);
