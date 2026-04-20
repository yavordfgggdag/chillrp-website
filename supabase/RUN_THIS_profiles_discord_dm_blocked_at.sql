-- Пусни в Supabase SQL Editor, ако нямаш миграции за тази колона.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_dm_blocked_at timestamptz;
COMMENT ON COLUMN public.profiles.discord_dm_blocked_at IS 'Попълва се при Discord 50007 (затворени DM). Нулира се при успешен admin DM.';
