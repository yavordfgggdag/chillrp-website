-- Add Discord user ID (snowflake) to profiles for DM from admin panel.
-- Run once in Supabase SQL Editor.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_id text;
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON public.profiles(discord_id) WHERE discord_id IS NOT NULL;
COMMENT ON COLUMN public.profiles.discord_id IS 'Discord user ID (snowflake) from OAuth; used to send DMs from admin Messages.';
