-- Автоматично начисляване на op-crime Season GC след Stripe (webhook + профил).
-- Изпълни веднъж в Supabase → SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS qb_citizenid text;

COMMENT ON COLUMN public.profiles.qb_citizenid IS
  'QB-Core/Qbox citizenid за автоматично GC след покупка (виж STRIPE_SETUP.md).';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS opcrime_gc_amount integer;

COMMENT ON COLUMN public.products.opcrime_gc_amount IS
  'Колко Season GC (op-crime) да се начисли на брой този продукт; 0 или NULL = без GC.';

CREATE TABLE IF NOT EXISTS public.opcrime_gc_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text NOT NULL UNIQUE,
  supabase_user_id uuid,
  qb_citizenid text,
  gc_amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  delivery_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opcrime_gc_deliveries_status
  ON public.opcrime_gc_deliveries (status);

ALTER TABLE public.opcrime_gc_deliveries ENABLE ROW LEVEL SECURITY;
