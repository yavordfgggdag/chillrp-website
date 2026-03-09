
-- Add discord_username to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_username text;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_discord_username ON public.profiles(discord_username);
