-- Таблици за Болница: hospital_invoices и hospital_shifts
-- При 404 при запис на фактура: копирай целия файл → Supabase Dashboard → SQL Editor → New query → Paste → Run

CREATE TABLE IF NOT EXISTS public.hospital_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  invoice_date date NOT NULL DEFAULT (current_date),
  client_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount text NOT NULL DEFAULT '0',
  issued_by_user_id uuid REFERENCES auth.users(id),
  issued_by_name text
);

ALTER TABLE public.hospital_invoices ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_invoices TO authenticated;

DROP POLICY IF EXISTS "Authenticated read hospital_invoices" ON public.hospital_invoices;
CREATE POLICY "Authenticated read hospital_invoices" ON public.hospital_invoices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated insert hospital_invoices" ON public.hospital_invoices;
CREATE POLICY "Authenticated insert hospital_invoices" ON public.hospital_invoices FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated update hospital_invoices" ON public.hospital_invoices;
CREATE POLICY "Authenticated update hospital_invoices" ON public.hospital_invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated delete hospital_invoices" ON public.hospital_invoices;
CREATE POLICY "Authenticated delete hospital_invoices" ON public.hospital_invoices FOR DELETE TO authenticated USING (true);

-- Hospital shifts
CREATE TABLE IF NOT EXISTS public.hospital_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL,
  ended_at timestamptz
);

ALTER TABLE public.hospital_shifts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_shifts TO authenticated;

DROP POLICY IF EXISTS "Authenticated read hospital_shifts" ON public.hospital_shifts;
CREATE POLICY "Authenticated read hospital_shifts" ON public.hospital_shifts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated insert hospital_shifts" ON public.hospital_shifts;
CREATE POLICY "Authenticated insert hospital_shifts" ON public.hospital_shifts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated update hospital_shifts" ON public.hospital_shifts;
CREATE POLICY "Authenticated update hospital_shifts" ON public.hospital_shifts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated delete hospital_shifts" ON public.hospital_shifts;
CREATE POLICY "Authenticated delete hospital_shifts" ON public.hospital_shifts FOR DELETE TO authenticated USING (true);
