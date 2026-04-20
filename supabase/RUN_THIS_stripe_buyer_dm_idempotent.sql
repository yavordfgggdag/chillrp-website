-- Идемпотентност: един buyer Discord DM на Stripe checkout session.
CREATE TABLE IF NOT EXISTS public.stripe_checkout_buyer_dm_sent (
  checkout_session_id text PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_checkout_buyer_dm_sent ENABLE ROW LEVEL SECURITY;
