-- Потребители, които са спрели DM към бота / не приемат съобщения — скриват се от админ „Съобщения“.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_dm_blocked_at timestamptz;
COMMENT ON COLUMN public.profiles.discord_dm_blocked_at IS 'Попълва се при Discord 50007 (затворени DM). Нулира се при успешен admin DM от send-discord-dm-admin.';
