export type MediaUrlKind = "image" | "video" | "audio" | "youtube" | "unknown";

/** YouTube watch / shorts / youtu.be → embed URL за iframe. */
export function parseYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url.trim(), "https://example.com");
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0]?.replace(/[^0-9A-Za-z_-]/g, "") ?? "";
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (u.pathname.startsWith("/watch")) {
        const v = u.searchParams.get("v")?.replace(/[^0-9A-Za-z_-]/g, "") ?? "";
        return v ? `https://www.youtube.com/embed/${v}` : null;
      }
      if (u.pathname.startsWith("/embed/")) {
        return url.trim();
      }
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2]?.replace(/[^0-9A-Za-z_-]/g, "") ?? "";
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    }
  } catch {
    /* ignore */
  }
  if (/youtube\.com\/embed\//i.test(url) || /youtu\.be\//i.test(url)) {
    const embed = url.match(/youtube\.com\/embed\/([0-9A-Za-z_-]+)/i);
    if (embed) return `https://www.youtube.com/embed/${embed[1]}`;
  }
  return null;
}

const VIDEO_EXT = /\.(mp4|webm|mov|ogv|m4v|mkv)(\?|#|&|$)/i;
const AUDIO_EXT = /\.(mp3|m4a|wav|ogg|aac|flac|opus)(\?|#|&|$)/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?|#|&|$)/i;

/** Определя тип медия по URL (разширение навсякъде в низа — за Storage пътища с query). */
export function mediaKindFromUrl(url: string): MediaUrlKind {
  if (parseYouTubeEmbedUrl(url)) return "youtube";
  try {
    const path = new URL(url, "https://example.com").pathname.toLowerCase();
    if (AUDIO_EXT.test(path)) return "audio";
    if (VIDEO_EXT.test(path)) return "video";
    if (IMAGE_EXT.test(path)) return "image";
  } catch {
    const u = url.split("?")[0].toLowerCase();
    if (AUDIO_EXT.test(u)) return "audio";
    if (VIDEO_EXT.test(u)) return "video";
    if (IMAGE_EXT.test(u)) return "image";
  }
  const full = url.toLowerCase();
  if (VIDEO_EXT.test(full)) return "video";
  if (AUDIO_EXT.test(full)) return "audio";
  if (IMAGE_EXT.test(full)) return "image";
  return "unknown";
}
