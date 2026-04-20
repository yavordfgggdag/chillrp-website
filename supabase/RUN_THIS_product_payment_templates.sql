-- Идемпотентно: колони за шаблони (бележка превод/PayPal + Discord DM). Синхрон с migrations/20260403120000_product_payment_templates.sql

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS transfer_note_template text,
  ADD COLUMN IF NOT EXISTS discord_purchase_dm_template text;

ALTER TABLE public.pending_revolut_payments
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'revolut',
  ADD COLUMN IF NOT EXISTS transfer_note_full text;

UPDATE public.pending_revolut_payments SET payment_method = 'revolut' WHERE payment_method IS NULL;

ALTER TABLE public.pending_revolut_payments ALTER COLUMN payment_method SET NOT NULL;
ALTER TABLE public.pending_revolut_payments ALTER COLUMN payment_method SET DEFAULT 'revolut';

ALTER TABLE public.pending_revolut_payments DROP CONSTRAINT IF EXISTS pending_revolut_payments_payment_method_check;
ALTER TABLE public.pending_revolut_payments ADD CONSTRAINT pending_revolut_payments_payment_method_check CHECK (
  payment_method = ANY (ARRAY['revolut'::text, 'paypal'::text])
);
