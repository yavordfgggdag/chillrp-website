-- Шаблони за бележка при превод/PayPal и Discord DM (само products).
-- За pending_revolut_payments виж 20260404130100_pending_payment_method.sql (след създаване на таблицата).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS transfer_note_template text,
  ADD COLUMN IF NOT EXISTS discord_purchase_dm_template text;

COMMENT ON COLUMN public.products.transfer_note_template IS
  'Шаблон за бележка при Revolut/PayPal: {{reference}}, {{product_name}}, {{product_summary}}, {{total_eur}}, {{discord_username}}. Празно = само {{reference}}.';
COMMENT ON COLUMN public.products.discord_purchase_dm_template IS
  'По избор: основен текст (description) в Discord DM след покупка. Плейсхолдъри: {{product_name}}, {{product_summary}}, {{total_eur}}, {{discord_username}}, {{redeem_code}}, {{ingame_instruction}}, {{auto_gc_note}}, {{price}}, {{category}}, {{reference}}.';
