-- =============================================================================
-- Web logs – всички действия по сайта (page_view, click, admin_*, job_* и т.н.)
-- Пусни в Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

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
-- Само админите виждат логовете; записът става от Edge Function (service role, bypass RLS)
CREATE POLICY "Admins can view web logs" ON public.web_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
