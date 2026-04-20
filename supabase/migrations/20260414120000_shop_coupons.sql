-- Shop coupons: table, validate RPC, purchase with balance applies coupon server-side.
-- Order: launch promo is reflected in p_price_cents from client; coupon applies on top.

CREATE TABLE IF NOT EXISTS public.shop_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  discount_percent numeric(5,2),
  discount_cents integer,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  min_cart_cents integer NOT NULL DEFAULT 0,
  applies_to_product_ids uuid[] DEFAULT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_coupons_discount_chk CHECK (
    (discount_percent IS NOT NULL AND discount_percent > 0 AND discount_percent <= 100 AND discount_cents IS NULL)
    OR (discount_cents IS NOT NULL AND discount_cents > 0 AND discount_percent IS NULL)
  )
);

DROP INDEX IF EXISTS public.shop_coupons_code_ci;
CREATE UNIQUE INDEX shop_coupons_code_ci ON public.shop_coupons ((lower(trim(code))));

CREATE INDEX IF NOT EXISTS idx_shop_coupons_active ON public.shop_coupons(active) WHERE active = true;

ALTER TABLE public.shop_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_coupons_admin_all" ON public.shop_coupons;
CREATE POLICY "shop_coupons_admin_all" ON public.shop_coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS applied_coupon_code text;

-- Validate coupon for UI (does not increment uses). p_product_id required when coupon has product allowlist.
CREATE OR REPLACE FUNCTION public.validate_shop_coupon(
  p_code text,
  p_product_id uuid,
  p_subtotal_cents integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.shop_coupons%ROWTYPE;
  norm text;
  disc integer;
  final integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF p_subtotal_cents IS NULL OR p_subtotal_cents <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_subtotal');
  END IF;

  norm := lower(trim(p_code));
  IF norm = '' OR norm IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_code');
  END IF;

  SELECT * INTO c FROM public.shop_coupons WHERE lower(trim(code)) = norm;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;
  IF NOT c.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inactive');
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_uses');
  END IF;
  IF p_subtotal_cents < COALESCE(c.min_cart_cents, 0) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'below_min_cart', 'min_cart_cents', c.min_cart_cents);
  END IF;
  IF c.applies_to_product_ids IS NOT NULL AND array_length(c.applies_to_product_ids, 1) IS NOT NULL THEN
    IF p_product_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'product_required');
    END IF;
    IF NOT (p_product_id = ANY (c.applies_to_product_ids)) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'product_not_eligible');
    END IF;
  END IF;

  IF c.discount_percent IS NOT NULL THEN
    disc := floor(p_subtotal_cents * (c.discount_percent / 100.0))::integer;
  ELSE
    disc := LEAST(GREATEST(p_subtotal_cents - 1, 0), c.discount_cents);
  END IF;
  IF disc < 0 THEN disc := 0; END IF;
  final := p_subtotal_cents - disc;
  IF final < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'discount_too_high');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'subtotal_cents', p_subtotal_cents,
    'discount_cents', disc,
    'final_cents', final,
    'code', c.code
  );
END;
$$;

DROP FUNCTION IF EXISTS public.purchase_product_with_balance(uuid, integer);

CREATE OR REPLACE FUNCTION public.purchase_product_with_balance(
  p_product_id uuid,
  p_price_cents integer,
  p_coupon_code text DEFAULT NULL
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
  subtotal integer;
  final_cents integer;
  disc integer;
  c public.shop_coupons%ROWTYPE;
  norm text;
  coupon_applied text := NULL;
  coupon_row_id uuid := NULL;
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

  subtotal := p_price_cents;
  final_cents := subtotal;

  IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
    norm := lower(trim(p_coupon_code));
    SELECT * INTO c FROM public.shop_coupons WHERE lower(trim(code)) = norm FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_coupon');
    END IF;
    IF NOT c.active THEN
      RETURN jsonb_build_object('ok', false, 'error', 'coupon_inactive');
    END IF;
    IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
      RETURN jsonb_build_object('ok', false, 'error', 'coupon_expired');
    END IF;
    IF c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN
      RETURN jsonb_build_object('ok', false, 'error', 'coupon_max_uses');
    END IF;
    IF subtotal < COALESCE(c.min_cart_cents, 0) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'below_min_cart', 'min_cart_cents', c.min_cart_cents);
    END IF;
    IF c.applies_to_product_ids IS NOT NULL AND array_length(c.applies_to_product_ids, 1) IS NOT NULL THEN
      IF NOT (p_product_id = ANY (c.applies_to_product_ids)) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'product_not_eligible');
      END IF;
    END IF;
    IF c.discount_percent IS NOT NULL THEN
      disc := floor(subtotal * (c.discount_percent / 100.0))::integer;
    ELSE
      disc := LEAST(GREATEST(subtotal - 1, 0), c.discount_cents);
    END IF;
    IF disc < 0 THEN disc := 0; END IF;
    final_cents := subtotal - disc;
    IF final_cents < 1 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'discount_too_high');
    END IF;
    coupon_applied := c.code;
    coupon_row_id := c.id;
  END IF;

  SELECT shop_balance_cents, discord_username INTO cur, dun FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_profile');
  END IF;
  IF cur < final_cents THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'balance', cur, 'required', final_cents);
  END IF;

  UPDATE public.profiles SET shop_balance_cents = cur - final_cents WHERE id = uid;

  INSERT INTO public.purchases (
    user_id, product_id, product_name, category, price_eur, payment_method, discord_username, applied_coupon_code
  ) VALUES (
    uid, p_product_id, pname, pcat, (final_cents::numeric / 100.0), 'balance', dun, coupon_applied
  );

  IF coupon_row_id IS NOT NULL THEN
    UPDATE public.shop_coupons SET uses_count = uses_count + 1 WHERE id = coupon_row_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'new_balance', cur - final_cents, 'charged_cents', final_cents, 'subtotal_cents', subtotal);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_shop_coupon(text, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_product_with_balance(uuid, integer, text) TO authenticated;

COMMENT ON FUNCTION public.validate_shop_coupon IS 'Preview coupon discount; launch promo should already be in p_subtotal_cents.';
COMMENT ON FUNCTION public.purchase_product_with_balance IS 'Deduct balance with optional coupon; increments coupon uses on success.';
