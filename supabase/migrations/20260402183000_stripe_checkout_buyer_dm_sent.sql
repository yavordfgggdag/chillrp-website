-- Един Discord DM към купувача на checkout session (идемпотентност при Stripe retry).
CREATE TABLE IF NOT EXISTS public.stripe_checkout_buyer_dm_sent (
  checkout_session_id text PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_checkout_buyer_dm_sent ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.stripe_checkout_buyer_dm_sent IS
  'Маркер че за тази Stripe checkout session е изпратено buyer DM; пълни се от stripe-webhook-opcrime-gc.';
