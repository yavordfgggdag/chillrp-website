-- Пусни веднъж в Supabase SQL Editor, ако не ползваш supabase db push за миграциите.
-- Същото съдържание: migrations/20260402120000_gang_applications_open_gate.sql

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
