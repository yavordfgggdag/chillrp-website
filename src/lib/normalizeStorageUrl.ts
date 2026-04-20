import { getSupabaseSiteUrl } from "@/lib/supabaseSiteUrl";

/**
 * Поправя записани в базата URL-и към Storage:
 * - `//host/...` → `https://host/...`
 * - `http://` → `https://`
 * - ако е `*.supabase.co/.../storage/v1/object/public/...` — пренасочва origin към текущия проект (оправя грешно копиран ref / typo в поддомейна)
 */
export function normalizeStoragePublicUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  let u = trimmed;
  if (u.startsWith("//")) u = `https:${u}`;
  if (u.startsWith("http://")) u = `https://${u.slice(7)}`;
  // Линк без схема: project.supabase.co/storage/...
  if (!/^https?:\/\//i.test(u) && /^[a-z0-9-]+\.supabase\.co\//i.test(u)) {
    u = `https://${u}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return u;
  }

  if (!parsed.hostname.endsWith(".supabase.co")) return u;
  if (!parsed.pathname.includes("/storage/v1/object/public/")) return u;

  let base: URL;
  try {
    base = new URL(getSupabaseSiteUrl());
  } catch {
    return u;
  }

  return `${base.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
}
