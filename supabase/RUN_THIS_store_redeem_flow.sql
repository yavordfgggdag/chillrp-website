-- TLR: продукти с op-crime награди + redeem код след Stripe (команда в играта).
-- Изпълни веднъж в Supabase → SQL Editor.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS opcrime_use_redeem_code boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS opcrime_org_money_amount integer;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS opcrime_org_money_account text NOT NULL DEFAULT 'balance';

COMMENT ON COLUMN public.products.opcrime_use_redeem_code IS
  'Ако true: GC за този ред отива в store_redeem_codes (в игра с команда), не по RCON auto.';
COMMENT ON COLUMN public.products.opcrime_org_money_amount IS
  'Начисление в сейфа на банда (op-crime org id от количката при checkout). NULL/0 = няма.';
COMMENT ON COLUMN public.products.opcrime_org_money_account IS
  'balance или dirtymoney — подава се на op-crime:addOrganisationMoney.';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ingame_grants_json jsonb;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ingame_player_hint text;

COMMENT ON COLUMN public.products.ingame_grants_json IS
  'Опционален JSON масив с награди за /chillrp_redeem: [{type:season_gc,amount:N},{type:org_money,orgId:N,amount:N,account?:balance|dirtymoney}] на брой продукт.';
COMMENT ON COLUMN public.products.ingame_player_hint IS
  'Текст за сайта: как да вземат наградата в игра (показва се на страницата на продукта).';

CREATE TABLE IF NOT EXISTS public.store_redeem_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  stripe_session_id text NOT NULL UNIQUE,
  supabase_user_id uuid,
  grants jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  redeemed_citizenid text
);

CREATE INDEX IF NOT EXISTS idx_store_redeem_codes_status ON public.store_redeem_codes (status);

ALTER TABLE public.store_redeem_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own store redeem codes" ON public.store_redeem_codes;
CREATE POLICY "Users can view own store redeem codes"
ON public.store_redeem_codes
FOR SELECT TO authenticated
USING (supabase_user_id = auth.uid());

COMMENT ON TABLE public.store_redeem_codes IS
  'Еднократни кодове след Stripe; играчът ги активира с chillrp_redeem на сървъра (edge redeem-store-purchase).';
