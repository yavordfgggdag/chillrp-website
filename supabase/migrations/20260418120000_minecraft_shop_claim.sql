-- Minecraft: взимане на покупки в игра чрез плъгин + Edge Function.
-- products.minecraft_grants_json: { "commands": ["lp user {player} parent set vip"] } или ["cmd1","cmd2"]
-- purchases.minecraft_claimed_at: маркира еднократно изпълнение на наградите за MC.

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS minecraft_claimed_at timestamptz;

COMMENT ON COLUMN public.purchases.minecraft_claimed_at IS
  'Когато играчът е взел наградата в Minecraft сървъра (плъгин /claimshop).';

CREATE INDEX IF NOT EXISTS idx_purchases_user_mc_claim
  ON public.purchases (user_id)
  WHERE minecraft_claimed_at IS NULL AND user_id IS NOT NULL;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS minecraft_grants_json jsonb;

COMMENT ON COLUMN public.products.minecraft_grants_json IS
  'Конзолни команди за Paper след покупка: { "commands": ["..."] }; плейсхолдъри {player}, {uuid}.';
