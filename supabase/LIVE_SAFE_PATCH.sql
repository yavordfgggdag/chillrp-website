-- ============================================================================
-- TLR LIVE-SAFE PATCH
-- Additive / idempotent SQL intended to be safe on an existing database.
-- This script:
-- - only uses CREATE TABLE IF NOT EXISTS / ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- - only uses DROP POLICY IF EXISTS / CREATE POLICY (no DROP TABLE / DROP COLUMN)
-- It can be run multiple times without data loss.
--
-- Use cases:
-- - Bring an older TLR database closer to the current code expectations
-- - Ensure newer columns/tables/policies required by the app exist
--
-- IMPORTANT: This does NOT try to fully replace existing RLS or schema;
-- it just ensures the minimum contract needed by the app.
-- ============================================================================

-- 1) Profiles: ensure discord_id column and index exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discord_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_discord_id
  ON public.profiles(discord_id) WHERE discord_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.discord_id IS
  'Discord user ID (snowflake) from OAuth; used to send DMs from admin Messages.';


-- 2) Staff members: ensure Discord-sync columns exist
ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS discord_id text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS emoji text;

COMMENT ON COLUMN public.staff_members.discord_id IS 'Discord user id when synced from Discord';
COMMENT ON COLUMN public.staff_members.source IS 'manual | discord_sync';
COMMENT ON COLUMN public.staff_members.emoji IS 'Emoji character for display (e.g. 🎫) when from Discord sync';


-- 3) Web logs: ensure table, indexes and policy exist
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

CREATE INDEX IF NOT EXISTS idx_web_logs_created_at
  ON public.web_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_logs_event
  ON public.web_logs (event);
CREATE INDEX IF NOT EXISTS idx_web_logs_module
  ON public.web_logs (module) WHERE module IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_web_logs_user_id
  ON public.web_logs (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.web_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view web logs" ON public.web_logs;
CREATE POLICY "Admins can view web logs"
ON public.web_logs
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));


-- 4) Gang applications: make sure DELETE policy matches app expectations
ALTER TABLE public.gang_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete applications" ON public.gang_applications;
CREATE POLICY "Admins can delete applications"
  ON public.gang_applications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));


-- 5) Hospital / Service / Obshtina invoices & shifts
-- These are all CREATE TABLE IF NOT EXISTS and RLS policies; if tables already
-- exist, nothing will be dropped.

-- Hospital
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
CREATE POLICY "Authenticated read hospital_invoices"
ON public.hospital_invoices
FOR SELECT TO authenticated
USING (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated insert hospital_invoices" ON public.hospital_invoices;
CREATE POLICY "Authenticated insert hospital_invoices"
ON public.hospital_invoices
FOR INSERT TO authenticated
WITH CHECK (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated update hospital_invoices" ON public.hospital_invoices;
CREATE POLICY "Authenticated update hospital_invoices"
ON public.hospital_invoices
FOR UPDATE TO authenticated
USING (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated delete hospital_invoices" ON public.hospital_invoices;
CREATE POLICY "Authenticated delete hospital_invoices"
ON public.hospital_invoices
FOR DELETE TO authenticated
USING (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

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
CREATE POLICY "Authenticated read hospital_shifts"
ON public.hospital_shifts
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated insert hospital_shifts" ON public.hospital_shifts;
CREATE POLICY "Authenticated insert hospital_shifts"
ON public.hospital_shifts
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated update hospital_shifts" ON public.hospital_shifts;
CREATE POLICY "Authenticated update hospital_shifts"
ON public.hospital_shifts
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated delete hospital_shifts" ON public.hospital_shifts;
CREATE POLICY "Authenticated delete hospital_shifts"
ON public.hospital_shifts
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);


-- Service
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
ON public.service_invoices
FOR SELECT TO authenticated
USING (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated insert service_invoices" ON public.service_invoices;
CREATE POLICY "Authenticated insert service_invoices"
ON public.service_invoices
FOR INSERT TO authenticated
WITH CHECK (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated update service_invoices" ON public.service_invoices;
CREATE POLICY "Authenticated update service_invoices"
ON public.service_invoices
FOR UPDATE TO authenticated
USING (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated delete service_invoices" ON public.service_invoices;
CREATE POLICY "Authenticated delete service_invoices"
ON public.service_invoices
FOR DELETE TO authenticated
USING (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

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
ON public.service_shifts
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated insert service_shifts" ON public.service_shifts;
CREATE POLICY "Authenticated insert service_shifts"
ON public.service_shifts
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated update service_shifts" ON public.service_shifts;
CREATE POLICY "Authenticated update service_shifts"
ON public.service_shifts
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated delete service_shifts" ON public.service_shifts;
CREATE POLICY "Authenticated delete service_shifts"
ON public.service_shifts
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);


-- Obshtina
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
ON public.obshtina_invoices
FOR SELECT TO authenticated
USING (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated insert obshtina_invoices" ON public.obshtina_invoices;
CREATE POLICY "Authenticated insert obshtina_invoices"
ON public.obshtina_invoices
FOR INSERT TO authenticated
WITH CHECK (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated update obshtina_invoices" ON public.obshtina_invoices;
CREATE POLICY "Authenticated update obshtina_invoices"
ON public.obshtina_invoices
FOR UPDATE TO authenticated
USING (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated delete obshtina_invoices" ON public.obshtina_invoices;
CREATE POLICY "Authenticated delete obshtina_invoices"
ON public.obshtina_invoices
FOR DELETE TO authenticated
USING (
  issued_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

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
ON public.obshtina_shifts
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated insert obshtina_shifts" ON public.obshtina_shifts;
CREATE POLICY "Authenticated insert obshtina_shifts"
ON public.obshtina_shifts
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated update obshtina_shifts" ON public.obshtina_shifts;
CREATE POLICY "Authenticated update obshtina_shifts"
ON public.obshtina_shifts
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated delete obshtina_shifts" ON public.obshtina_shifts;
CREATE POLICY "Authenticated delete obshtina_shifts"
ON public.obshtina_shifts
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);


-- 6) Police handbook tables (if not present)
CREATE TABLE IF NOT EXISTS public.police_handbook (
  id text PRIMARY KEY DEFAULT 'current',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.police_handbook_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL
);

ALTER TABLE public.police_handbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.police_handbook_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "police_handbook_authenticated_read" ON public.police_handbook;
DROP POLICY IF EXISTS "police_handbook_backups_authenticated_read" ON public.police_handbook_backups;

CREATE POLICY "police_handbook_authenticated_read"
ON public.police_handbook
FOR SELECT TO authenticated USING (true);

CREATE POLICY "police_handbook_backups_authenticated_read"
ON public.police_handbook_backups
FOR SELECT TO authenticated USING (true);

INSERT INTO public.police_handbook (id, data, updated_at)
VALUES ('current', '{}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- END LIVE-SAFE PATCH
-- ============================================================================

