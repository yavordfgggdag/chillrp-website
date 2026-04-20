function isSupabaseProjectUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:" && u.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

/**
 * Base URL на Supabase проекта (без trailing slash).
 * Задай `VITE_SUPABASE_URL` в .env за всеки сайт/проект — няма вграден fallback към чужд проект.
 */
export function getSupabaseSiteUrl(): string {
  const raw = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  const candidate = raw.startsWith("http") ? raw : raw ? `https://${raw}` : "";
  if (candidate && isSupabaseProjectUrl(candidate)) {
    return candidate.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    console.warn(
      "[Supabase] Липсва или е невалиден VITE_SUPABASE_URL. Създай нов проект в supabase.com, копирай Project URL от Settings → API в .env.",
    );
  }
  return "";
}

/** false → OAuth ще отиде към placeholder host; поправи .env и (за preview) пусни отново build. */
export function isSupabaseConfiguredForAuth(): boolean {
  return getSupabaseSiteUrl().length > 0;
}
