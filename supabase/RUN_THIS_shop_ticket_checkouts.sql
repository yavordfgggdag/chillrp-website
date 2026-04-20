-- Изпълни веднъж в Supabase → SQL Editor (същото като migrations/20260405140000_shop_ticket_checkouts.sql).

CREATE TABLE IF NOT EXISTS public.shop_ticket_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  product_name text NOT NULL,
  amount_display text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  discord_username text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  CONSTRAINT shop_ticket_checkouts_ticket_code_unique UNIQUE (ticket_code),
  CONSTRAINT shop_ticket_checkouts_status_check CHECK (
    status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text])
  )
);

CREATE INDEX IF NOT EXISTS idx_shop_ticket_user ON public.shop_ticket_checkouts (user_id);
CREATE INDEX IF NOT EXISTS idx_shop_ticket_status ON public.shop_ticket_checkouts (status);
CREATE INDEX IF NOT EXISTS idx_shop_ticket_created ON public.shop_ticket_checkouts (created_at DESC);

CREATE OR REPLACE FUNCTION public.shop_ticket_checkouts_set_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  cand text;
  n int := 0;
BEGIN
  IF NEW.ticket_code IS NOT NULL AND btrim(NEW.ticket_code) <> '' THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  WHILE n < 40 LOOP
    cand := 'TICKET-' || upper(substr(md5(random()::text || clock_timestamp()::text || n::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.shop_ticket_checkouts c WHERE c.ticket_code = cand);
    n := n + 1;
  END LOOP;
  IF n >= 40 THEN
    RAISE EXCEPTION 'shop_ticket_checkouts: could not generate ticket_code';
  END IF;
  NEW.ticket_code := cand;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shop_ticket_checkouts_set_code_trg ON public.shop_ticket_checkouts;
CREATE TRIGGER shop_ticket_checkouts_set_code_trg
  BEFORE INSERT ON public.shop_ticket_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.shop_ticket_checkouts_set_code();

ALTER TABLE public.shop_ticket_checkouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_ticket_ins_own" ON public.shop_ticket_checkouts;
DROP POLICY IF EXISTS "shop_ticket_select_own" ON public.shop_ticket_checkouts;
DROP POLICY IF EXISTS "shop_ticket_admin_select" ON public.shop_ticket_checkouts;
DROP POLICY IF EXISTS "shop_ticket_admin_update" ON public.shop_ticket_checkouts;

CREATE POLICY "shop_ticket_ins_own"
  ON public.shop_ticket_checkouts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shop_ticket_select_own"
  ON public.shop_ticket_checkouts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "shop_ticket_admin_select"
  ON public.shop_ticket_checkouts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "shop_ticket_admin_update"
  ON public.shop_ticket_checkouts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
