-- След 20260404130000_pending_revolut_payments: метод на пълна бележка.

ALTER TABLE public.pending_revolut_payments
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS transfer_note_full text;

UPDATE public.pending_revolut_payments SET payment_method = 'revolut' WHERE payment_method IS NULL;

ALTER TABLE public.pending_revolut_payments ALTER COLUMN payment_method SET NOT NULL;
ALTER TABLE public.pending_revolut_payments ALTER COLUMN payment_method SET DEFAULT 'revolut';

ALTER TABLE public.pending_revolut_payments DROP CONSTRAINT IF EXISTS pending_revolut_payments_payment_method_check;
ALTER TABLE public.pending_revolut_payments ADD CONSTRAINT pending_revolut_payments_payment_method_check CHECK (
  payment_method = ANY (ARRAY['revolut'::text, 'paypal'::text])
);

COMMENT ON COLUMN public.pending_revolut_payments.payment_method IS 'revolut = IBAN превод; paypal = PayPal.me ръчно плащане.';
COMMENT ON COLUMN public.pending_revolut_payments.transfer_note_full IS 'Пълен текст на бележката за клиента.';
