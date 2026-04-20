import { parseYouTubeEmbedUrl } from "@/lib/mediaUrlKind";

/**
 * Sneak peek клипове на началната страница — пълни YouTube линкове (watch, Shorts, youtu.be).
 * Допълва се от VITE_HOME_SNEAK_PEEK_URLS (.env, запетая) и от Admin → site_settings → sneak_peek_urls (по един линк на ред).
 */
export const HOME_SNEAK_PEEK_VIDEO_URLS: readonly string[] = [
  // Добави линкове тук, напр.:
  // "https://www.youtube.com/watch?v=XXXXXXXXXXX",
];

function urlsFromEnv(): string[] {
  const raw = (import.meta.env.VITE_HOME_SNEAK_PEEK_URLS as string | undefined)?.trim();
  if (!raw) return [];
  return raw.split(",").map((u) => u.trim()).filter(Boolean);
}

/** Връща уникални embed URL-и в подредбата: код → .env → настройки. */
export function collectSneakPeekEmbedUrls(settingsMultiline: string): string[] {
  const fromSettings = settingsMultiline
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...HOME_SNEAK_PEEK_VIDEO_URLS, ...urlsFromEnv(), ...fromSettings]) {
    const emb = parseYouTubeEmbedUrl(raw);
    if (emb && !seen.has(emb)) {
      seen.add(emb);
      out.push(emb);
    }
  }
  return out;
}
