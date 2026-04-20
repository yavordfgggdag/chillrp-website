-- ============================================================================
-- TLR MASTER SCHEMA
-- Single-source-of-truth SQL for setting up a fresh Supabase project.
-- This file consolidates:
-- - RUN_ONCE_CREATE_TABLES.sql
-- - RUN_ALL_SETUP.sql and other RUN_THIS_*.sql helpers
-- - migrations in supabase/migrations/* that define core app tables
-- Target: Postgres + Supabase defaults.
-- Safe to run multiple times (uses IF NOT EXISTS / DO $$ / DROP POLICY IF EXISTS).
-- ============================================================================

-- ============================================================================
-- 0. Extensions & basic enum
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 1. Core helpers: has_role, extended role helpers, updated_at / audit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Audit log + trigger used by supabase_foundation
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
DROP POLICY IF EXISTS "audit_log_admin_read" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_admin_all" ON public.audit_log;
CREATE POLICY "audit_log_admin_read"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

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

-- ============================================================================
-- 2. Users, profiles, roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  discord_username TEXT,
  discord_id TEXT
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id
  ON public.profiles(discord_id) WHERE discord_id IS NOT NULL;
COMMENT ON COLUMN public.profiles.discord_id IS 'Discord user ID (snowflake) from OAuth; used to send DMs from admin Messages.';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_dm_blocked_at TIMESTAMPTZ;
COMMENT ON COLUMN public.profiles.discord_dm_blocked_at IS 'Discord 50007 / closed DMs; hidden from admin Messages list; cleared on successful send-discord-dm-admin.';

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username) VALUES (new.id, new.email) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  role_id uuid REFERENCES public.roles(id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_roles') THEN
    CREATE TRIGGER set_updated_at_roles
      BEFORE UPDATE ON public.roles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_user_roles') THEN
    CREATE TRIGGER set_updated_at_user_roles
      BEFORE UPDATE ON public.user_roles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

DROP POLICY IF EXISTS "roles_admin_all" ON public.roles;
CREATE POLICY "roles_admin_all"
ON public.roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_self_view" ON public.user_roles;
CREATE POLICY "user_roles_admin_all"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "user_roles_self_view"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Seed core roles
INSERT INTO public.roles (name, description)
VALUES
  ('owner',  'Full access to all admin and system configuration'),
  ('admin',  'Manage all content and users'),
  ('editor', 'Manage content, navigation and media'),
  ('viewer', 'Read-only access to admin data')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. Gang applications & purchases
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gang_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gang_type TEXT NOT NULL,
  leader TEXT NOT NULL,
  members TEXT NOT NULL,
  goal TEXT NOT NULL,
  history TEXT NOT NULL,
  rules TEXT NOT NULL,
  rp_examples TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  discord_username TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  user_id UUID
);
ALTER TABLE public.gang_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit gang application" ON public.gang_applications;
DROP POLICY IF EXISTS "Submit gang application when open" ON public.gang_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.gang_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.gang_applications;
DROP POLICY IF EXISTS "Users can view own applications" ON public.gang_applications;
DROP POLICY IF EXISTS "Admins can delete applications" ON public.gang_applications;
CREATE POLICY "Anyone can submit gang application" ON public.gang_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all applications" ON public.gang_applications FOR SELECT USING (true);
CREATE POLICY "Admins can update applications" ON public.gang_applications FOR UPDATE USING (true);
CREATE POLICY "Admins can delete applications" ON public.gang_applications FOR DELETE TO authenticated USING (true);
CREATE POLICY "Users can view own applications" ON public.gang_applications FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  category TEXT,
  price_eur NUMERIC(10,2),
  discord_username TEXT,
  stripe_session_id TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all purchases" ON public.purchases;
DROP POLICY IF EXISTS "Anyone can insert a purchase" ON public.purchases;
DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;
CREATE POLICY "Admins can view all purchases" ON public.purchases FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Anyone can insert a purchase" ON public.purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own purchases" ON public.purchases FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Products, FAQ, rules, site_settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  product_media_urls TEXT[] NOT NULL DEFAULT '{}',
  price TEXT NOT NULL,
  original_price TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  long_description TEXT NOT NULL DEFAULT '',
  includes TEXT[] NOT NULL DEFAULT '{}',
  badge TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  stripe_price TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Authenticated can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated can delete products" ON public.products;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (true);
-- allow any authenticated user to manage via admin panel (Discord roles gate UI)
CREATE POLICY "Authenticated can insert products"
ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update products"
ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete products"
ON public.products FOR DELETE TO authenticated USING (true);
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT '',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active FAQ items" ON public.faq_items;
DROP POLICY IF EXISTS "Admins can insert FAQ items" ON public.faq_items;
DROP POLICY IF EXISTS "Admins can update FAQ items" ON public.faq_items;
DROP POLICY IF EXISTS "Admins can delete FAQ items" ON public.faq_items;
DROP POLICY IF EXISTS "Authenticated can insert faq_items" ON public.faq_items;
DROP POLICY IF EXISTS "Authenticated can update faq_items" ON public.faq_items;
DROP POLICY IF EXISTS "Authenticated can delete faq_items" ON public.faq_items;
CREATE POLICY "Anyone can view active FAQ items" ON public.faq_items FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert faq_items" ON public.faq_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update faq_items" ON public.faq_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete faq_items" ON public.faq_items FOR DELETE TO authenticated USING (true);
DROP TRIGGER IF EXISTS update_faq_items_updated_at ON public.faq_items;
CREATE TRIGGER update_faq_items_updated_at BEFORE UPDATE ON public.faq_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.rule_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'purple',
  items TEXT[] NOT NULL DEFAULT '{}',
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rule_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_sections DROP CONSTRAINT IF EXISTS rule_sections_page_check;
ALTER TABLE public.rule_sections ADD CONSTRAINT rule_sections_page_check
  CHECK (page IN ('discord', 'server', 'crime', 'bazaar'));
DROP POLICY IF EXISTS "Anyone can view rule sections" ON public.rule_sections;
DROP POLICY IF EXISTS "Admins can insert rule sections" ON public.rule_sections;
DROP POLICY IF EXISTS "Admins can update rule sections" ON public.rule_sections;
DROP POLICY IF EXISTS "Admins can delete rule sections" ON public.rule_sections;
DROP POLICY IF EXISTS "Authenticated can insert rule_sections" ON public.rule_sections;
DROP POLICY IF EXISTS "Authenticated can update rule_sections" ON public.rule_sections;
DROP POLICY IF EXISTS "Authenticated can delete rule_sections" ON public.rule_sections;
CREATE POLICY "Anyone can view rule sections" ON public.rule_sections FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert rule_sections" ON public.rule_sections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update rule_sections" ON public.rule_sections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete rule_sections" ON public.rule_sections FOR DELETE TO authenticated USING (true);
DROP TRIGGER IF EXISTS update_rule_sections_updated_at ON public.rule_sections;
CREATE TRIGGER update_rule_sections_updated_at BEFORE UPDATE ON public.rule_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can insert site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can delete site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated can insert site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated can update site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated can delete site_settings" ON public.site_settings;
CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert site_settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update site_settings" ON public.site_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete site_settings" ON public.site_settings FOR DELETE TO authenticated USING (true);
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FREE GANG: затваряне на INSERT при gang_applications_open = false (изисква site_settings)
CREATE OR REPLACE FUNCTION public.gang_applications_inserts_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE lower(trim(both from value))
        WHEN 'false' THEN false
        WHEN '0' THEN false
        WHEN 'no' THEN false
        WHEN 'off' THEN false
        WHEN 'затворено' THEN false
        WHEN 'затворени' THEN false
        WHEN 'не' THEN false
        ELSE true
      END
      FROM public.site_settings
      WHERE key = 'gang_applications_open'
      LIMIT 1
    ),
    true
  );
$$;
DROP POLICY IF EXISTS "Anyone can submit gang application" ON public.gang_applications;
DROP POLICY IF EXISTS "Submit gang application when open" ON public.gang_applications;
CREATE POLICY "Submit gang application when open"
ON public.gang_applications
FOR INSERT
WITH CHECK (public.gang_applications_inserts_allowed());

-- ============================================================================
-- 5. CMS: media_assets, page_sections, navigation_links, contact_leads
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name text NOT NULL DEFAULT 'uploads',
  path text NOT NULL,
  url text NOT NULL,
  mime_type text,
  size_bytes bigint,
  is_public boolean NOT NULL DEFAULT false,
  title text,
  alt text,
  tags text[] DEFAULT '{}',
  page text,
  section_key text,
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
  page text NOT NULL,
  section_key text NOT NULL,
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
  location text NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  parent_id uuid REFERENCES public.navigation_links(id),
  sort_order integer NOT NULL DEFAULT 0,
  is_external boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  icon text,
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_media_assets') THEN
    CREATE TRIGGER set_updated_at_media_assets
      BEFORE UPDATE ON public.media_assets
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_page_sections') THEN
    CREATE TRIGGER set_updated_at_page_sections
      BEFORE UPDATE ON public.page_sections
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_navigation_links') THEN
    CREATE TRIGGER set_updated_at_navigation_links
      BEFORE UPDATE ON public.navigation_links
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_contact_leads') THEN
    CREATE TRIGGER set_updated_at_contact_leads
      BEFORE UPDATE ON public.contact_leads
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

DROP POLICY IF EXISTS "media_assets_public_read" ON public.media_assets;
DROP POLICY IF EXISTS "media_assets_admin_all" ON public.media_assets;
CREATE POLICY "media_assets_public_read"
ON public.media_assets
FOR SELECT TO public
USING (is_public = true);
CREATE POLICY "media_assets_admin_all"
ON public.media_assets
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "page_sections_public_read" ON public.page_sections;
DROP POLICY IF EXISTS "page_sections_admin_all" ON public.page_sections;
CREATE POLICY "page_sections_public_read"
ON public.page_sections
FOR SELECT TO public
USING (is_enabled = true);
CREATE POLICY "page_sections_admin_all"
ON public.page_sections
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "navigation_links_public_read" ON public.navigation_links;
DROP POLICY IF EXISTS "navigation_links_admin_all" ON public.navigation_links;
CREATE POLICY "navigation_links_public_read"
ON public.navigation_links
FOR SELECT TO public
USING (is_enabled = true);
CREATE POLICY "navigation_links_admin_all"
ON public.navigation_links
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "contact_leads_public_insert" ON public.contact_leads;
DROP POLICY IF EXISTS "contact_leads_admin_all" ON public.contact_leads;
DROP POLICY IF EXISTS "contact_leads_admin_read" ON public.contact_leads;
CREATE POLICY "contact_leads_public_insert"
ON public.contact_leads
FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "contact_leads_admin_read"
ON public.contact_leads
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "contact_leads_admin_all"
ON public.contact_leads
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Seed basic page_sections and navigation_links (idempotent)
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

INSERT INTO public.navigation_links (location, label, url, sort_order, is_external, is_enabled, icon)
VALUES
  ('header_main', 'Начало',        '/',                10, false, true, NULL),
  ('header_main', 'Правила',       '/rules/server',    20, false, true, NULL),
  ('header_main', 'Магазин',       '/shop',            30, false, true, NULL),
  ('header_main', 'FAQ',           '/faq',             40, false, true, NULL),
  ('header_main', 'Gang',          '/gangs',           50, false, true, NULL),
  ('footer_main', 'Gang Rules',    '/rules/crime',     20, false, true, NULL),
  ('footer_main', 'Discord Rules', '/rules/discord',   30, false, true, NULL),
  ('social',      'Discord',       'https://discord.gg/chillroleplay', 10, true, true, 'discord')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. Staff members + Discord sync
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'shield',
  color TEXT NOT NULL DEFAULT 'text-neon-purple',
  bg TEXT NOT NULL DEFAULT 'border-neon-purple/30 bg-[hsl(271_76%_65%/0.07)]',
  avatar_url TEXT,
  avatar_scale TEXT DEFAULT 'scale-[2.2]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  discord_id TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  emoji TEXT
);
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Admins can insert staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Admins can update staff members" ON public.staff_members;
DROP POLICY IF EXISTS "Admins can delete staff members" ON public.staff_members;
CREATE POLICY "Anyone can view staff members" ON public.staff_members FOR SELECT USING (true);
-- Admin/authenticated management (Discord roles gate UI)
CREATE POLICY "Admins can insert staff members" ON public.staff_members FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update staff members" ON public.staff_members FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete staff members" ON public.staff_members FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================================
-- 7. Web logs
-- ============================================================================

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

-- ============================================================================
-- 8. Hospital / Service / Obshtina invoices & shifts
-- ============================================================================

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
DROP POLICY IF EXISTS "Authenticated insert hospital_invoices" ON public.hospital_invoices;
DROP POLICY IF EXISTS "Authenticated update hospital_invoices" ON public.hospital_invoices;
DROP POLICY IF EXISTS "Authenticated delete hospital_invoices" ON public.hospital_invoices;
CREATE POLICY "Authenticated read hospital_invoices" ON public.hospital_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert hospital_invoices" ON public.hospital_invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update hospital_invoices" ON public.hospital_invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
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
DROP POLICY IF EXISTS "Authenticated insert hospital_shifts" ON public.hospital_shifts;
DROP POLICY IF EXISTS "Authenticated update hospital_shifts" ON public.hospital_shifts;
DROP POLICY IF EXISTS "Authenticated delete hospital_shifts" ON public.hospital_shifts;
CREATE POLICY "Authenticated read hospital_shifts" ON public.hospital_shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert hospital_shifts" ON public.hospital_shifts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update hospital_shifts" ON public.hospital_shifts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete hospital_shifts" ON public.hospital_shifts FOR DELETE TO authenticated USING (true);

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
DROP POLICY IF EXISTS "Authenticated insert service_invoices" ON public.service_invoices;
DROP POLICY IF EXISTS "Authenticated update service_invoices" ON public.service_invoices;
DROP POLICY IF EXISTS "Authenticated delete service_invoices" ON public.service_invoices;
CREATE POLICY "Authenticated read service_invoices" ON public.service_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert service_invoices" ON public.service_invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update service_invoices" ON public.service_invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
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
DROP POLICY IF EXISTS "Authenticated insert service_shifts" ON public.service_shifts;
DROP POLICY IF EXISTS "Authenticated update service_shifts" ON public.service_shifts;
DROP POLICY IF EXISTS "Authenticated delete service_shifts" ON public.service_shifts;
CREATE POLICY "Authenticated read service_shifts" ON public.service_shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert service_shifts" ON public.service_shifts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update service_shifts" ON public.service_shifts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete service_shifts" ON public.service_shifts FOR DELETE TO authenticated USING (true);

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
DROP POLICY IF EXISTS "Authenticated insert obshtina_invoices" ON public.obshtina_invoices;
DROP POLICY IF EXISTS "Authenticated update obshtina_invoices" ON public.obshtina_invoices;
DROP POLICY IF EXISTS "Authenticated delete obshtina_invoices" ON public.obshtina_invoices;
CREATE POLICY "Authenticated read obshtina_invoices" ON public.obshtina_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert obshtina_invoices" ON public.obshtina_invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update obshtina_invoices" ON public.obshtina_invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete obshtina_invoices" ON public.obshtina_invoices FOR DELETE TO authenticated USING (true);

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
DROP POLICY IF EXISTS "Authenticated insert obshtina_shifts" ON public.obshtina_shifts;
DROP POLICY IF EXISTS "Authenticated update obshtina_shifts" ON public.obshtina_shifts;
DROP POLICY IF EXISTS "Authenticated delete obshtina_shifts" ON public.obshtina_shifts;
CREATE POLICY "Authenticated read obshtina_shifts" ON public.obshtina_shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert obshtina_shifts" ON public.obshtina_shifts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update obshtina_shifts" ON public.obshtina_shifts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete obshtina_shifts" ON public.obshtina_shifts FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 9. Police handbook
-- ============================================================================

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
-- 10. Storage bucket & policies
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Anyone can view uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public read uploads via media_assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin manage uploads" ON storage.objects;

CREATE POLICY "Anyone can view uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');

CREATE POLICY "Admins can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update uploads"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete uploads"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Optional stricter public read via media_assets (kept for completeness)
DROP POLICY IF EXISTS "Public read uploads via media_assets" ON storage.objects;
CREATE POLICY "Public read uploads via media_assets"
ON storage.objects
FOR SELECT TO public
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

-- ============================================================================
-- END MASTER SCHEMA
-- ============================================================================

