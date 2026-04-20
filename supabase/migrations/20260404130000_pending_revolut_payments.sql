-- Sync with supabase/RUN_THIS_revolut_pending_payments.sql (idempotent policies).

CREATE TABLE IF NOT EXISTS public.pending_revolut_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  discord_username text,
  amount_eur numeric(10, 2) NOT NULL,
  summary text NOT NULL,
  items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'awaiting_transfer',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pending_revolut_payments_status_check CHECK (
    status = ANY (ARRAY['awaiting_transfer'::text, 'completed'::text, 'cancelled'::text])
  )
);

CREATE INDEX IF NOT EXISTS idx_pending_revolut_user ON public.pending_revolut_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_pending_revolut_status ON public.pending_revolut_payments (status);
CREATE INDEX IF NOT EXISTS idx_pending_revolut_created ON public.pending_revolut_payments (created_at DESC);

ALTER TABLE public.pending_revolut_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own pending revolut" ON public.pending_revolut_payments;
DROP POLICY IF EXISTS "Users select own pending revolut" ON public.pending_revolut_payments;
DROP POLICY IF EXISTS "Admins select all pending revolut" ON public.pending_revolut_payments;
DROP POLICY IF EXISTS "Admins update pending revolut" ON public.pending_revolut_payments;

CREATE POLICY "Users insert own pending revolut"
  ON public.pending_revolut_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users select own pending revolut"
  ON public.pending_revolut_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins select all pending revolut"
  ON public.pending_revolut_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update pending revolut"
  ON public.pending_revolut_payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
