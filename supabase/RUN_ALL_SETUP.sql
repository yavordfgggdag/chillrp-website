-- =============================================================================
-- TLR – ВСИЧКИ RUN_THIS скриптове в един файл
-- =============================================================================
-- Условие: Първо трябва да си пуснал RUN_ONCE_CREATE_TABLES.sql (веднъж).
-- После: копирай целия този файл → Supabase Dashboard → SQL Editor → New query → Paste → Run.
-- =============================================================================

-- ========== 1) Сервиз: Фактури + Работно време ==========
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
CREATE POLICY "Authenticated read service_invoices" ON public.service_invoices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated insert service_invoices" ON public.service_invoices;
CREATE POLICY "Authenticated insert service_invoices" ON public.service_invoices FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated update service_invoices" ON public.service_invoices;
CREATE POLICY "Authenticated update service_invoices" ON public.service_invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated delete service_invoices" ON public.service_invoices;
CREATE POLICY "Authenticated delete service_invoices" ON public.service_invoices FOR DELETE TO authenticated USING (true);

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
CREATE POLICY "Authenticated read service_shifts" ON public.service_shifts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated insert service_shifts" ON public.service_shifts;
CREATE POLICY "Authenticated insert service_shifts" ON public.service_shifts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated update service_shifts" ON public.service_shifts;
CREATE POLICY "Authenticated update service_shifts" ON public.service_shifts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated delete service_shifts" ON public.service_shifts;
CREATE POLICY "Authenticated delete service_shifts" ON public.service_shifts FOR DELETE TO authenticated USING (true);

-- ========== 2) Web logs (админ таб „Логове”) ==========
CREATE TABLE IF NOT EXISTS public.web_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  page TEXT NOT NULL DEFAULT '/',
  user_id UUID,
  user_email TEXT,
  module TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_web_logs_created_at ON public.web_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_logs_event ON public.web_logs (event);
CREATE INDEX IF NOT EXISTS idx_web_logs_module ON public.web_logs (module) WHERE module IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_web_logs_user_id ON public.web_logs (user_id) WHERE user_id IS NOT NULL;
ALTER TABLE public.web_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view web logs" ON public.web_logs;
CREATE POLICY "Admins can view web logs" ON public.web_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ========== 3) Storage: bucket uploads + политики (качване снимки в админ) ==========
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Anyone can view uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public read uploads via media_assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin manage uploads" ON storage.objects;

CREATE POLICY "Anyone can view uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Admins can upload files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update uploads" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete uploads" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- ========== 4) Болница: фактури + смени ==========
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

-- ========== 5) Правила: добавяне на bazaar в rule_sections ==========
ALTER TABLE rule_sections DROP CONSTRAINT IF EXISTS rule_sections_page_check;
ALTER TABLE rule_sections ADD CONSTRAINT rule_sections_page_check CHECK (page IN ('discord','server','crime','bazaar'));

-- ========== 6) Кандидатури: изтриване от админ (кофа) ==========
ALTER TABLE public.gang_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can delete applications" ON public.gang_applications;
CREATE POLICY "Admins can delete applications"
  ON public.gang_applications FOR DELETE TO authenticated USING (true);

-- ========== Край. Презареди сайта (F5). ==========
