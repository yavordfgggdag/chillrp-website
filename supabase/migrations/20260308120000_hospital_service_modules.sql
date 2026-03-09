-- Module tables: Болница (Hospital) and Сервиз (Service)
-- Invoices and shifts per module. RLS: authenticated only (role enforced in app via check-module-role).

-- Hospital invoices
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

CREATE POLICY "Authenticated read hospital_invoices"
ON public.hospital_invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert hospital_invoices"
ON public.hospital_invoices FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update hospital_invoices"
ON public.hospital_invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated delete hospital_invoices"
ON public.hospital_invoices FOR DELETE TO authenticated USING (true);

-- Hospital shifts (работно време)
CREATE TABLE IF NOT EXISTS public.hospital_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL,
  ended_at timestamptz
);

ALTER TABLE public.hospital_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read hospital_shifts"
ON public.hospital_shifts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert hospital_shifts"
ON public.hospital_shifts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update hospital_shifts"
ON public.hospital_shifts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated delete hospital_shifts"
ON public.hospital_shifts FOR DELETE TO authenticated USING (true);

-- Service invoices
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

CREATE POLICY "Authenticated read service_invoices"
ON public.service_invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert service_invoices"
ON public.service_invoices FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update service_invoices"
ON public.service_invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated delete service_invoices"
ON public.service_invoices FOR DELETE TO authenticated USING (true);

-- Service shifts
CREATE TABLE IF NOT EXISTS public.service_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL,
  ended_at timestamptz
);

ALTER TABLE public.service_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read service_shifts"
ON public.service_shifts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert service_shifts"
ON public.service_shifts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update service_shifts"
ON public.service_shifts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated delete service_shifts"
ON public.service_shifts FOR DELETE TO authenticated USING (true);
