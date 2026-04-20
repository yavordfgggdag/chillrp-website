// Central config — override с VITE_* в .env (хостинг / CI)
const envDiscord = (import.meta.env.VITE_DISCORD_INVITE as string | undefined)?.trim();
export const DISCORD_INVITE = envDiscord || "https://discord.gg/uqAdjz6SbQ";

/**
 * Магазин: „Купи“ / количка отварят този линк (канал за тикети или покана).
 */
const envShopDiscord = (import.meta.env.VITE_DISCORD_SHOP_CHECKOUT_URL as string | undefined)?.trim();
export const DISCORD_SHOP_CHECKOUT_URL = envShopDiscord || DISCORD_INVITE;

/** Публично име на проекта (hero, meta — може VITE_SITE_NAME). */
export const SITE_NAME =
  (import.meta.env.VITE_SITE_NAME as string | undefined)?.trim() || "TLR RP";

/** Адрес за свързване в Minecraft (Java). Показва се на сайта + копиране. */
export const MINECRAFT_SERVER_ADDRESS =
  (import.meta.env.VITE_MINECRAFT_SERVER_ADDRESS as string | undefined)?.trim() || "play.example.net";

/** Версия за показване (напр. 1.21.x). */
export const MINECRAFT_VERSION =
  (import.meta.env.VITE_MINECRAFT_VERSION as string | undefined)?.trim() || "1.21+";

/**
 * @deprecated Legacy FiveM — запазено за стари ключове в site_settings.
 * Не се използва в публичния UI; ползвай MINECRAFT_SERVER_ADDRESS.
 */
export const FIVEM_CFX_JOIN_URL =
  (import.meta.env.VITE_FIVEM_CFX_JOIN_URL as string | undefined)?.trim() || "";

export type ProductSocialEntry = { label: string; href: string; tone: "youtube" | "tiktok" | "gitbook" | "discord" };

export function getProductPageSocialLinks(): ProductSocialEntry[] {
  const yt = (import.meta.env.VITE_SOCIAL_YOUTUBE_URL as string | undefined)?.trim();
  const tt = (import.meta.env.VITE_SOCIAL_TIKTOK_URL as string | undefined)?.trim();
  const gb = (import.meta.env.VITE_SOCIAL_GITBOOK_URL as string | undefined)?.trim();
  const out: ProductSocialEntry[] = [];
  if (yt) out.push({ label: "YouTube", href: yt, tone: "youtube" });
  if (tt) out.push({ label: "TikTok", href: tt, tone: "tiktok" });
  if (gb) out.push({ label: "GitBook", href: gb, tone: "gitbook" });
  out.push({ label: "Discord", href: DISCORD_INVITE, tone: "discord" });
  return out;
}
