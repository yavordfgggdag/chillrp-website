-- Затваря INSERT към gang_applications, когато site_settings.gang_applications_open е false.
-- Функцията е SECURITY DEFINER, за да чете site_settings независимо от RLS на извикващия.

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

COMMENT ON FUNCTION public.gang_applications_inserts_allowed() IS 'false когато gang_applications_open е затворено; по подразбиране true ако ключът липсва.';

DROP POLICY IF EXISTS "Anyone can submit gang application" ON public.gang_applications;
DROP POLICY IF EXISTS "Submit gang application when open" ON public.gang_applications;

CREATE POLICY "Submit gang application when open"
ON public.gang_applications
FOR INSERT
WITH CHECK (public.gang_applications_inserts_allowed());
