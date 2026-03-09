-- Supabase foundation: content + RBAC + audit + media
-- This migration is designed to be additive and idempotent where possible.

--------------------------------------------------------------------------------
-- 1) Extend role enum & helpers
--------------------------------------------------------------------------------

-- Extend existing app_role enum with new roles if not present.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'owner') THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'editor') THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'viewer') THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';
  END IF;
END
$$;

-- Helper functions for role checks (owner/admin/editor/viewer).
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.has_role(_user_id, 'owner'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
     OR public.has_role(_user_id, 'owner'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_editor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.has_role(_user_id, 'editor'::public.app_role)
     OR public.is_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_viewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.has_role(_user_id, 'viewer'::public.app_role)
     OR public.is_editor(_user_id)
$$;


--------------------------------------------------------------------------------
-- 2) Roles & user_roles metadata
--------------------------------------------------------------------------------

-- Dedicated roles table for human-readable role metadata.
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,              -- e.g. 'owner', 'admin', 'editor', 'viewer'
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Extend existing user_roles table with common metadata columns.
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;


--------------------------------------------------------------------------------
-- 3) Common updated_at trigger function
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--------------------------------------------------------------------------------
-- 4) Audit log table & trigger function
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  payload_before jsonb,
  payload_after jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins / owners / viewers can read audit logs. No direct writes.
DROP POLICY IF EXISTS "audit_log_admin_read" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_admin_all" ON public.audit_log;

CREATE POLICY "audit_log_admin_read"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.is_viewer(auth.uid())
);

-- No INSERT/UPDATE/DELETE via RLS; only via triggers using service role.

CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_action text;
  v_before jsonb;
  v_after jsonb;
  v_record_id uuid;
BEGIN
  v_action := TG_OP;

  IF (TG_OP = 'INSERT') THEN
    v_before := NULL;
    v_after  := to_jsonb(NEW);
    v_record_id := COALESCE(NEW.id, NULL);
  ELSIF (TG_OP = 'UPDATE') THEN
    v_before := to_jsonb(OLD);
    v_after  := to_jsonb(NEW);
    v_record_id := COALESCE(NEW.id, OLD.id);
  ELSIF (TG_OP = 'DELETE') THEN
    v_before := to_jsonb(OLD);
    v_after  := NULL;
    v_record_id := COALESCE(OLD.id, NULL);
  END IF;

  INSERT INTO public.audit_log (table_name, record_id, action, payload_before, payload_after, created_by)
  VALUES (TG_TABLE_NAME, v_record_id, v_action, v_before, v_after, auth.uid());

  RETURN COALESCE(NEW, OLD);
END;
$$;


--------------------------------------------------------------------------------
-- 5) Content tables: media_assets, page_sections, navigation_links, contact_leads
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name text NOT NULL DEFAULT 'uploads',
  path text NOT NULL,             -- storage.objects.name
  url text NOT NULL,
  mime_type text,
  size_bytes bigint,
  is_public boolean NOT NULL DEFAULT false,
  title text,
  alt text,
  tags text[] DEFAULT '{}',
  page text,                      -- optional association (e.g. 'home')
  section_key text,               -- optional association (e.g. 'hero')
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_media_assets_bucket_public_created
  ON public.media_assets (bucket_name, is_public, created_at DESC);


CREATE TABLE IF NOT EXISTS public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,             -- e.g. 'home'
  section_key text NOT NULL,      -- e.g. 'hero', 'story', 'trailer'
  title text,
  subtitle text,
  sort_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT page_sections_page_key_unique UNIQUE (page, section_key)
);

ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_page_sections_page_enabled_sort
  ON public.page_sections (page, is_enabled, sort_order);


CREATE TABLE IF NOT EXISTS public.navigation_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL,         -- 'header_main', 'footer_main', 'social'
  label text NOT NULL,
  url text NOT NULL,
  parent_id uuid REFERENCES public.navigation_links(id),
  sort_order integer NOT NULL DEFAULT 0,
  is_external boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  icon text,                      -- e.g. 'discord', 'instagram'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.navigation_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_navigation_links_location_enabled_sort
  ON public.navigation_links (location, is_enabled, sort_order);


CREATE TABLE IF NOT EXISTS public.contact_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'closed')),
  source_page text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  handled_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_contact_leads_status_created
  ON public.contact_leads (status, created_at DESC);


--------------------------------------------------------------------------------
-- 6) Updated_at triggers
--------------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_media_assets'
  ) THEN
    CREATE TRIGGER set_updated_at_media_assets
      BEFORE UPDATE ON public.media_assets
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_page_sections'
  ) THEN
    CREATE TRIGGER set_updated_at_page_sections
      BEFORE UPDATE ON public.page_sections
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_navigation_links'
  ) THEN
    CREATE TRIGGER set_updated_at_navigation_links
      BEFORE UPDATE ON public.navigation_links
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_contact_leads'
  ) THEN
    CREATE TRIGGER set_updated_at_contact_leads
      BEFORE UPDATE ON public.contact_leads
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_roles'
  ) THEN
    CREATE TRIGGER set_updated_at_roles
      BEFORE UPDATE ON public.roles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_user_roles'
  ) THEN
    CREATE TRIGGER set_updated_at_user_roles
      BEFORE UPDATE ON public.user_roles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;


--------------------------------------------------------------------------------
-- 7) Audit triggers for key tables
--------------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_page_sections'
  ) THEN
    CREATE TRIGGER audit_page_sections
      AFTER INSERT OR UPDATE OR DELETE ON public.page_sections
      FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_navigation_links'
  ) THEN
    CREATE TRIGGER audit_navigation_links
      AFTER INSERT OR UPDATE OR DELETE ON public.navigation_links
      FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_media_assets'
  ) THEN
    CREATE TRIGGER audit_media_assets
      AFTER INSERT OR UPDATE OR DELETE ON public.media_assets
      FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_roles'
  ) THEN
    CREATE TRIGGER audit_roles
      AFTER INSERT OR UPDATE OR DELETE ON public.roles
      FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_user_roles'
  ) THEN
    CREATE TRIGGER audit_user_roles
      AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
      FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
  END IF;
END
$$;


--------------------------------------------------------------------------------
-- 8) RLS policies
--------------------------------------------------------------------------------

-- media_assets: public can only see public items; admins/editors can manage.
DROP POLICY IF EXISTS "media_assets_public_read" ON public.media_assets;
DROP POLICY IF EXISTS "media_assets_admin_all" ON public.media_assets;

CREATE POLICY "media_assets_public_read"
ON public.media_assets
FOR SELECT
TO public
USING (is_public = true);

CREATE POLICY "media_assets_admin_all"
ON public.media_assets
FOR ALL
TO authenticated
USING (public.is_editor(auth.uid()))
WITH CHECK (public.is_editor(auth.uid()));


-- page_sections: public can read enabled sections; editors/admins/owners can CRUD.
DROP POLICY IF EXISTS "page_sections_public_read" ON public.page_sections;
DROP POLICY IF EXISTS "page_sections_admin_all" ON public.page_sections;

CREATE POLICY "page_sections_public_read"
ON public.page_sections
FOR SELECT
TO public
USING (is_enabled = true);

CREATE POLICY "page_sections_admin_all"
ON public.page_sections
FOR ALL
TO authenticated
USING (public.is_editor(auth.uid()))
WITH CHECK (public.is_editor(auth.uid()));


-- navigation_links: public can read enabled links; editors/admins/owners can CRUD.
DROP POLICY IF EXISTS "navigation_links_public_read" ON public.navigation_links;
DROP POLICY IF EXISTS "navigation_links_admin_all" ON public.navigation_links;

CREATE POLICY "navigation_links_public_read"
ON public.navigation_links
FOR SELECT
TO public
USING (is_enabled = true);

CREATE POLICY "navigation_links_admin_all"
ON public.navigation_links
FOR ALL
TO authenticated
USING (public.is_editor(auth.uid()))
WITH CHECK (public.is_editor(auth.uid()));


-- contact_leads: public can insert; admins/editors/viewers can manage.
DROP POLICY IF EXISTS "contact_leads_public_insert" ON public.contact_leads;
DROP POLICY IF EXISTS "contact_leads_admin_all" ON public.contact_leads;
DROP POLICY IF EXISTS "contact_leads_admin_read" ON public.contact_leads;

CREATE POLICY "contact_leads_public_insert"
ON public.contact_leads
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "contact_leads_admin_read"
ON public.contact_leads
FOR SELECT
TO authenticated
USING (public.is_viewer(auth.uid()));

CREATE POLICY "contact_leads_admin_all"
ON public.contact_leads
FOR UPDATE, DELETE
TO authenticated
USING (public.is_editor(auth.uid()))
WITH CHECK (public.is_editor(auth.uid()));


-- roles: only admins/owners can manage and read.
DROP POLICY IF EXISTS "roles_admin_all" ON public.roles;

CREATE POLICY "roles_admin_all"
ON public.roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- user_roles: admins/owners can manage; users can view their own roles.
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_self_view" ON public.user_roles;

CREATE POLICY "user_roles_admin_all"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_self_view"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);


--------------------------------------------------------------------------------
-- 9) Storage bucket & policies for media uploads
--------------------------------------------------------------------------------

-- Ensure uploads bucket exists.
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;

-- RLS is enabled on storage.objects by default in Supabase.

-- Public can only read objects that are marked public via media_assets.
DROP POLICY IF EXISTS "Public read uploads via media_assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin manage uploads" ON storage.objects;

CREATE POLICY "Public read uploads via media_assets"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'uploads'
  AND EXISTS (
    SELECT 1
    FROM public.media_assets m
    WHERE m.bucket_name = storage.objects.bucket_id
      AND m.path = storage.objects.name
      AND m.is_public = true
  )
);

-- Admin / editor / owner can fully manage objects in uploads bucket.
CREATE POLICY "Admin manage uploads"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'uploads'
  AND public.is_editor(auth.uid())
)
WITH CHECK (
  bucket_id = 'uploads'
  AND public.is_editor(auth.uid())
);


--------------------------------------------------------------------------------
-- 10) Seed default homepage sections & navigation
--------------------------------------------------------------------------------

-- Seed core roles.
INSERT INTO public.roles (name, description)
VALUES
  ('owner',  'Full access to all admin and system configuration'),
  ('admin',  'Manage all content and users'),
  ('editor', 'Manage content, navigation and media'),
  ('viewer', 'Read-only access to admin data')
ON CONFLICT (name) DO NOTHING;


-- Seed homepage sections so the public site can render immediately.
INSERT INTO public.page_sections (page, section_key, title, subtitle, sort_order, is_enabled, settings)
VALUES
  ('home', 'hero',       'Hero',       'Главен банер', 10, true, '{}'::jsonb),
  ('home', 'story',      'Story',      'Твоята история', 20, true, '{}'::jsonb),
  ('home', 'trailer',    'Trailer',    'Официален трейлър', 30, true, '{}'::jsonb),
  ('home', 'gang',       'Gang',       'Free Gang', 40, true, '{}'::jsonb),
  ('home', 'staff',      'Staff',      'Екип', 50, true, '{}'::jsonb),
  ('home', 'shop',       'Shop',       'Магазин', 60, true, '{}'::jsonb),
  ('home', 'final_cta',  'Final CTA',  'Финален призив', 70, true, '{}'::jsonb),
  ('home', 'footer',     'Footer',     'Футър', 80, true, '{}'::jsonb)
ON CONFLICT (page, section_key) DO NOTHING;


-- Seed navigation links (header, footer, social).
INSERT INTO public.navigation_links (location, label, url, sort_order, is_external, is_enabled, icon)
VALUES
  ('header_main', 'Начало',        '/',                10, false, true, NULL),
  ('header_main', 'Правила',       '/rules/server',    20, false, true, NULL),
  ('header_main', 'Магазин',       '/shop',            30, false, true, NULL),
  ('header_main', 'FAQ',           '/faq',             40, false, true, NULL),
  ('header_main', 'Gang',          '/gangs',           50, false, true, NULL),
  ('footer_main', 'Контакт',       '/contact',         10, false, true, NULL),
  ('footer_main', 'Gang Rules',    '/rules/crime',     20, false, true, NULL),
  ('footer_main', 'Discord Rules', '/rules/discord',   30, false, true, NULL),
  ('social',      'Discord',       'https://discord.gg/chillroleplay', 10, true, true, 'discord')
ON CONFLICT DO NOTHING;

