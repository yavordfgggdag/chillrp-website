-- Shared wallet, SMS deposit requests, Builder/Helper apps, vote sites, leaderboard, checkout RPC

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS shop_balance_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minecraft_username text;

COMMENT ON COLUMN public.profiles.shop_balance_cents IS 'EUR cents; shared across TLR web apps for same Discord user.';
COMMENT ON COLUMN public.profiles.minecraft_username IS 'Minecraft IGN for shop/deliveries; must match in-game.';

-- SMS tiers (public read; admin maintains via SQL or future admin UI)
CREATE TABLE IF NOT EXISTS public.sms_tiers (
  id text PRIMARY KEY,
  short_number text NOT NULL,
  sms_body_template text NOT NULL,
  display_price_eur numeric(10,2) NOT NULL,
  credit_cents integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.sms_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_tiers_public_read" ON public.sms_tiers;
CREATE POLICY "sms_tiers_public_read" ON public.sms_tiers FOR SELECT USING (true);

INSERT INTO public.sms_tiers (id, short_number, sms_body_template, display_price_eur, credit_cents, sort_order)
VALUES
  ('tier_1', '1092', 'tlrpay {USERNAME}', 1.22, 46, 1),
  ('tier_2', '1094', 'tlrpay {USERNAME}', 2.46, 92, 2),
  ('tier_3', '1096', 'tlrpay {USERNAME}', 3.07, 115, 3)
ON CONFLICT (id) DO NOTHING;

-- SMS deposit claim (user submits after sending SMS; staff approves in admin)
CREATE TABLE IF NOT EXISTS public.sms_deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id text NOT NULL REFERENCES public.sms_tiers(id),
  minecraft_username text,
  entered_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  credited_cents integer,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sms_deposit_requests_user ON public.sms_deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_deposit_requests_status ON public.sms_deposit_requests(status);

ALTER TABLE public.sms_deposit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_deposit_insert_own" ON public.sms_deposit_requests;
DROP POLICY IF EXISTS "sms_deposit_select_own" ON public.sms_deposit_requests;
DROP POLICY IF EXISTS "sms_deposit_admin_all" ON public.sms_deposit_requests;

CREATE POLICY "sms_deposit_insert_own" ON public.sms_deposit_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sms_deposit_select_own" ON public.sms_deposit_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "sms_deposit_select_admin" ON public.sms_deposit_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "sms_deposit_admin_update" ON public.sms_deposit_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Builder / Helper applications
CREATE TABLE IF NOT EXISTS public.builder_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.helper_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.builder_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helper_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "builder_app_insert" ON public.builder_applications;
DROP POLICY IF EXISTS "builder_app_select_own" ON public.builder_applications;
DROP POLICY IF EXISTS "builder_app_admin" ON public.builder_applications;

CREATE POLICY "builder_app_insert" ON public.builder_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "builder_app_select_own" ON public.builder_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "builder_app_admin" ON public.builder_applications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "helper_app_insert" ON public.helper_applications;
DROP POLICY IF EXISTS "helper_app_select_own" ON public.helper_applications;
DROP POLICY IF EXISTS "helper_app_admin" ON public.helper_applications;

CREATE POLICY "helper_app_insert" ON public.helper_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "helper_app_select_own" ON public.helper_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "helper_app_admin" ON public.helper_applications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Vote links (public site)
CREATE TABLE IF NOT EXISTS public.mc_vote_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  reset_hours integer NOT NULL DEFAULT 24,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.mc_vote_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mc_vote_sites_read" ON public.mc_vote_sites;
DROP POLICY IF EXISTS "mc_vote_sites_read_admin" ON public.mc_vote_sites;
DROP POLICY IF EXISTS "mc_vote_sites_admin" ON public.mc_vote_sites;

CREATE POLICY "mc_vote_sites_read" ON public.mc_vote_sites FOR SELECT USING (is_active = true);

CREATE POLICY "mc_vote_sites_read_admin" ON public.mc_vote_sites
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "mc_vote_sites_admin" ON public.mc_vote_sites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.mc_vote_sites (name, url, reset_hours, sort_order)
SELECT * FROM (VALUES
  ('Minecraft-MP', 'https://minecraft-mp.com/', 24, 1),
  ('TopMinecraftServers', 'https://topminecraftservers.org/', 24, 2),
  ('Servers-Minecraft', 'https://servers-minecraft.net/', 24, 3)
) AS v(name, url, reset_hours, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.mc_vote_sites LIMIT 1);

-- Leaderboard (admin-edited rows; public read top N)
CREATE TABLE IF NOT EXISTS public.mc_leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_type text NOT NULL CHECK (board_type IN ('voter', 'supporter')),
  rank integer NOT NULL,
  minecraft_username text NOT NULL,
  value_text text NOT NULL,
  value_sort numeric,
  avatar_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mc_leaderboard_rank_type ON public.mc_leaderboard_entries(board_type, rank);

ALTER TABLE public.mc_leaderboard_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mc_lb_read" ON public.mc_leaderboard_entries;
DROP POLICY IF EXISTS "mc_lb_admin" ON public.mc_leaderboard_entries;

CREATE POLICY "mc_lb_read" ON public.mc_leaderboard_entries FOR SELECT USING (true);

CREATE POLICY "mc_lb_admin" ON public.mc_leaderboard_entries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Server status snapshot (optional single row keyed in app or latest)
CREATE TABLE IF NOT EXISTS public.mc_server_status (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_online boolean NOT NULL DEFAULT true,
  players_current integer NOT NULL DEFAULT 0,
  players_max integer NOT NULL DEFAULT 250,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.mc_server_status (id, is_online, players_current, players_max) VALUES (1, true, 0, 250)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.mc_server_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mc_status_read" ON public.mc_server_status;
DROP POLICY IF EXISTS "mc_status_admin" ON public.mc_server_status;

CREATE POLICY "mc_status_read" ON public.mc_server_status FOR SELECT USING (true);

CREATE POLICY "mc_status_admin" ON public.mc_server_status
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow users to update only minecraft_username on own profile (shop gate)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Approve SMS: credit balance (admin only, SECURITY DEFINER bypasses RLS on profiles for the update)
CREATE OR REPLACE FUNCTION public.approve_sms_deposit_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.sms_deposit_requests%ROWTYPE;
  t credit_cents integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO r FROM public.sms_deposit_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF r.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_pending');
  END IF;

  SELECT credit_cents INTO t FROM public.sms_tiers WHERE id = r.tier_id;
  IF t IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_tier');
  END IF;

  UPDATE public.profiles
  SET shop_balance_cents = COALESCE(shop_balance_cents, 0) + t
  WHERE id = r.user_id;

  UPDATE public.sms_deposit_requests
  SET status = 'approved', credited_cents = t, reviewed_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('ok', true, 'credited_cents', t);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_sms_deposit_request(p_request_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  UPDATE public.sms_deposit_requests
  SET status = 'rejected', admin_note = COALESCE(p_note, admin_note), reviewed_at = now()
  WHERE id = p_request_id AND status = 'pending'
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found_or_not_pending');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id);
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS payment_method text;

-- Purchase with balance: atomically deduct and record purchase (matches public.purchases schema)
CREATE OR REPLACE FUNCTION public.purchase_product_with_balance(
  p_product_id uuid,
  p_price_cents integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur integer;
  pname text;
  pcat text;
  dun text;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF p_price_cents IS NULL OR p_price_cents <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_price');
  END IF;

  SELECT name, category INTO pname, pcat FROM public.products WHERE id = p_product_id AND is_active = true;
  IF pname IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'product_not_found');
  END IF;

  SELECT shop_balance_cents, discord_username INTO cur, dun FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_profile');
  END IF;
  IF cur < p_price_cents THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'balance', cur);
  END IF;

  UPDATE public.profiles SET shop_balance_cents = cur - p_price_cents WHERE id = uid;

  INSERT INTO public.purchases (
    user_id, product_id, product_name, category, price_eur, payment_method, discord_username
  ) VALUES (
    uid, p_product_id, pname, pcat, (p_price_cents::numeric / 100.0), 'balance', dun
  );

  RETURN jsonb_build_object('ok', true, 'new_balance', cur - p_price_cents);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_sms_deposit_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_sms_deposit_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_product_with_balance(uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.approve_sms_deposit_request IS 'Admin credits shop_balance_cents from pending SMS request.';
COMMENT ON FUNCTION public.purchase_product_with_balance IS 'Deduct balance and insert purchase row; extend if purchases schema differs.';
