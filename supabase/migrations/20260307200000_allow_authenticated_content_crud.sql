-- Allow authenticated users (e.g. Discord staff using admin panel) to manage content.
-- The app uses Discord roles for admin access; RLS previously required user_roles.role = 'admin'.
-- This migration adds policies so any authenticated user can INSERT/UPDATE/DELETE on content tables,
-- while keeping public SELECT for FAQ, rules, site_settings, and products.

-- faq_items: keep public SELECT, allow authenticated full CRUD
DROP POLICY IF EXISTS "Admins can insert FAQ items" ON public.faq_items;
DROP POLICY IF EXISTS "Admins can update FAQ items" ON public.faq_items;
DROP POLICY IF EXISTS "Admins can delete FAQ items" ON public.faq_items;

CREATE POLICY "Authenticated can insert faq_items"
ON public.faq_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update faq_items"
ON public.faq_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete faq_items"
ON public.faq_items FOR DELETE TO authenticated USING (true);

-- rule_sections: same
DROP POLICY IF EXISTS "Admins can insert rule sections" ON public.rule_sections;
DROP POLICY IF EXISTS "Admins can update rule sections" ON public.rule_sections;
DROP POLICY IF EXISTS "Admins can delete rule sections" ON public.rule_sections;

CREATE POLICY "Authenticated can insert rule_sections"
ON public.rule_sections FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update rule_sections"
ON public.rule_sections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete rule_sections"
ON public.rule_sections FOR DELETE TO authenticated USING (true);

-- site_settings: same
DROP POLICY IF EXISTS "Admins can insert site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can delete site settings" ON public.site_settings;

CREATE POLICY "Authenticated can insert site_settings"
ON public.site_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update site_settings"
ON public.site_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete site_settings"
ON public.site_settings FOR DELETE TO authenticated USING (true);

-- products: keep public SELECT, allow authenticated full CRUD (replace admin-only)
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

CREATE POLICY "Authenticated can insert products"
ON public.products FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update products"
ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete products"
ON public.products FOR DELETE TO authenticated USING (true);
