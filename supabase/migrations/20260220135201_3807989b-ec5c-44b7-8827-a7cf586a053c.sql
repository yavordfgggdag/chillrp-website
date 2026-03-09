
-- Fix overly permissive UPDATE policy - only admins can update
DROP POLICY IF EXISTS "Admins can update applications" ON public.gang_applications;

CREATE POLICY "Admins can update applications"
ON public.gang_applications
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Fix overly permissive INSERT policy - keep public insert but tighten the insert check
DROP POLICY IF EXISTS "Anyone can submit gang application" ON public.gang_applications;

CREATE POLICY "Anyone can submit gang application"
ON public.gang_applications
FOR INSERT
WITH CHECK (
  status = 'pending'
  AND admin_note IS NULL
  AND reviewed_at IS NULL
);
