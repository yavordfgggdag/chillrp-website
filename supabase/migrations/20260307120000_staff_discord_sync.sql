-- Add columns for Discord-synced staff (sync-staff-from-discord)
ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS discord_id text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS emoji text;

COMMENT ON COLUMN public.staff_members.discord_id IS 'Discord user id when synced from Discord';
COMMENT ON COLUMN public.staff_members.source IS 'manual | discord_sync';
COMMENT ON COLUMN public.staff_members.emoji IS 'Emoji character for display (e.g. 🎫) when from Discord sync';
