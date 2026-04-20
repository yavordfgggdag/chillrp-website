-- =============================================================================
-- Изтриване на кандидатури от админ панела (Кандидатури → кофа)
-- Пусни в Supabase Dashboard → SQL Editor → Run
-- =============================================================================

ALTER TABLE public.gang_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete applications" ON public.gang_applications;
CREATE POLICY "Admins can delete applications"
  ON public.gang_applications FOR DELETE
  TO authenticated
  USING (true);

-- След Run: в /admin → Кандидатури натисни кофата при кандидатура и потвърди – записът ще се изтрие.
