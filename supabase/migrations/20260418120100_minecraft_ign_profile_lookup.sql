-- Безопасно търсене по Minecraft име (без ILIKE wildcard проблем с _).
CREATE OR REPLACE FUNCTION public.get_profile_by_minecraft_ign(p_ign text)
RETURNS TABLE (id uuid, minecraft_username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.minecraft_username
  FROM public.profiles p
  WHERE p.minecraft_username IS NOT NULL
    AND lower(trim(p.minecraft_username)) = lower(trim(p_ign))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_profile_by_minecraft_ign(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_by_minecraft_ign(text) TO service_role;
