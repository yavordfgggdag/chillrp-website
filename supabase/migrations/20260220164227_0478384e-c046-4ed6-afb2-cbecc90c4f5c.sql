-- Create purchases table (if not exists) with user_id from the start
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name text NOT NULL,
  category text,
  price_eur numeric(10,2),
  discord_username text,
  stripe_session_id text,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all purchases" ON public.purchases;
DROP POLICY IF EXISTS "Anyone can insert a purchase" ON public.purchases;
DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;

CREATE POLICY "Admins can view all purchases"
  ON public.purchases FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert a purchase"
  ON public.purchases FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Add user_id to gang_applications
ALTER TABLE public.gang_applications ADD COLUMN IF NOT EXISTS user_id uuid;

-- RLS for gang_applications: users see own
DROP POLICY IF EXISTS "Users can view own applications" ON public.gang_applications;
CREATE POLICY "Users can view own applications"
  ON public.gang_applications FOR SELECT
  USING (auth.uid() = user_id);