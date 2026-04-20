import { normalizeStoragePublicUrl } from "@/lib/normalizeStorageUrl";

export type ShopItem = {
  id: string;
  slug: string;
  image: string;
  image_url?: string | null;
  /** Допълнителни снимки, видео, MP3 — от `product_media_urls` в базата */
  mediaGallery?: string[];
  name: string;
  subtitle: string;
  price: string;
  originalPrice: string;
  desc: string;
  longDesc: string;
  includes: string[];
  badge?: string | null;
  /** Произволна стойност от админ; филтрите „VIP/Коли/…“ хващат известни id, останалото е в „Други“. */
  category: string;
  stripePrice?: string | null;
  /** op-crime Season GC (автоматично или чрез redeem — виж админ продукта) */
  opcrimeGcAmount?: number | null;
  opcrimeUseRedeemCode?: boolean;
  /** Пари в сейфа на банда — изисква Gang ID при checkout */
  opcrimeOrgMoneyAmount?: number | null;
  opcrimeOrgMoneyAccount?: string;
  /** Персонализиран текст от админ: как да вземат наградата в игра */
  ingamePlayerHint?: string | null;
  /** Има ли непразен ingame_grants_json в базата — нужен е citizenid при checkout */
  ingameGrantsDeliver?: boolean;
  /** Шаблон за бележка при Revolut/PayPal ({{reference}}, {{product_name}}, …) */
  transferNoteTemplate?: string | null;
  /** Шаблон за основния текст в Discord DM след покупка */
  discordPurchaseDmTemplate?: string | null;
};

export function shopLineNeedsOpcrimeOrgId(item: ShopItem): boolean {
  return (item.opcrimeOrgMoneyAmount ?? 0) > 0;
}

function dbHasIngameGrantsJson(raw: unknown): boolean {
  return Array.isArray(raw) && raw.length > 0;
}

/** Продуктът носи награда в играта (GC, redeem, банда, JSON grants) — сайтът изисква citizenid + Discord login. */
export function shopItemNeedsCitizenidForDelivery(item: ShopItem): boolean {
  return (
    shopLineNeedsOpcrimeOrgId(item) ||
    (item.opcrimeGcAmount ?? 0) > 0 ||
    item.opcrimeUseRedeemCode === true ||
    item.ingameGrantsDeliver === true
  );
}

export const LAUNCH_DATE = new Date("2026-03-27T20:00:00+02:00");

/** Преди датата на старт се показва промо цена (`price`); след това — `originalPrice`. */
export function isDiscountActive(): boolean {
  return Date.now() < LAUNCH_DATE.getTime();
}

export function getDisplayPrice(item: ShopItem): string {
  const base = isDiscountActive() ? item.price : item.originalPrice;
  const value = parseFloat(String(base || "0")).toFixed(2);
  return `${value} USD`;
}

/** Единична цена (число), според промоцията — в магазина се показва USD. */
export function getUnitPriceEur(item: ShopItem): number {
  const base = isDiscountActive() ? item.price : item.originalPrice;
  const n = parseFloat(String(base || "0"));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** Цена в центове за Stripe (според активната ли е промоцията). */
export function getPriceCents(item: ShopItem): number {
  return Math.round(getUnitPriceEur(item) * 100);
}

export function formatPriceEur(price: string): string {
  return `${price} USD`;
}

/** Текст за SALE бадж при активна промоция (напр. SALE -20%). */
export function getSaleBadgeText(item: ShopItem): string | null {
  if (!isDiscountActive()) return null;
  const orig = parseFloat(String(item.originalPrice || "0"));
  const promo = parseFloat(String(item.price || "0"));
  if (!Number.isFinite(orig) || !Number.isFinite(promo) || orig <= 0) return "SALE";
  if (promo >= orig) return "SALE";
  const pct = Math.round((1 - promo / orig) * 100);
  return pct > 0 ? `SALE -${pct}%` : "SALE";
}

export type Category =
  | "all"
  | "vip"
  | "donor"
  | "cosmetics"
  | "keys"
  | "kits"
  | "perks"
  | "bundles"
  | "seasonal"
  | "other";

const PRIMARY_SHOP_CATEGORIES = new Set<string>([
  "vip",
  "donor",
  "cosmetics",
  "keys",
  "kits",
  "perks",
  "bundles",
  "seasonal",
]);

/** Филтър: „Други“ включва `other` и непознати категории. */
export function itemMatchesShopFilter(item: ShopItem, active: Category): boolean {
  if (active === "all") return true;
  const c = String(item.category || "other").toLowerCase().trim() || "other";
  if (active === "other") return c === "other" || !PRIMARY_SHOP_CATEGORIES.has(c);
  return c === active;
}

export const categories: { id: Category; label: string }[] = [
  { id: "all", label: "Всички" },
  { id: "vip", label: "VIP рангове" },
  { id: "donor", label: "Donor пакети" },
  { id: "cosmetics", label: "Козметика" },
  { id: "keys", label: "Crate keys" },
  { id: "kits", label: "Kits" },
  { id: "perks", label: "Тагове / perks" },
  { id: "bundles", label: "Bundles" },
  { id: "seasonal", label: "Сезонни" },
  { id: "other", label: "Други" },
];

// Map DB product to ShopItem
function normalizeMediaGallery(raw: unknown): string[] {
  let v: unknown = raw;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    try {
      v = JSON.parse(s) as unknown;
    } catch {
      return s
        .split(/[\n,]/)
        .map((x) => x.trim())
        .filter((x) => x.length > 0)
        .map((u) => normalizeStoragePublicUrl(u));
    }
  }
  if (!Array.isArray(v)) return [];
  return v
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    .map((u) => normalizeStoragePublicUrl(u));
}

export function mapDbProduct(p: Record<string, unknown>): ShopItem {
  const rawImg = typeof p.image_url === "string" && p.image_url.trim() ? normalizeStoragePublicUrl(p.image_url) : null;
  return {
    id: String(p.id ?? ""),
    slug: String(p.slug ?? ""),
    image: rawImg || "/placeholder.svg",
    image_url: rawImg,
    mediaGallery: normalizeMediaGallery(p.product_media_urls),
    name: String(p.name ?? ""),
    subtitle: String(p.subtitle ?? ""),
    price: String(p.price ?? ""),
    originalPrice: String(p.original_price ?? ""),
    desc: String(p.description ?? ""),
    longDesc: String(p.long_description ?? ""),
    includes: Array.isArray(p.includes) ? (p.includes as string[]) : [],
    badge: (p.badge as string | null) ?? null,
    category: typeof p.category === "string" && p.category.trim() ? p.category.trim().toLowerCase() : "other",
    stripePrice: (p.stripe_price as string | null) ?? null,
    opcrimeGcAmount: typeof p.opcrime_gc_amount === "number" ? p.opcrime_gc_amount : null,
    opcrimeUseRedeemCode: Boolean(p.opcrime_use_redeem_code),
    opcrimeOrgMoneyAmount: typeof p.opcrime_org_money_amount === "number" ? p.opcrime_org_money_amount : null,
    opcrimeOrgMoneyAccount:
      typeof p.opcrime_org_money_account === "string" && p.opcrime_org_money_account.trim()
        ? String(p.opcrime_org_money_account).trim()
        : "balance",
    ingamePlayerHint:
      typeof p.ingame_player_hint === "string" && p.ingame_player_hint.trim()
        ? p.ingame_player_hint.trim()
        : null,
    ingameGrantsDeliver: dbHasIngameGrantsJson(p.ingame_grants_json),
    transferNoteTemplate:
      typeof p.transfer_note_template === "string" && p.transfer_note_template.trim()
        ? p.transfer_note_template.trim()
        : null,
    discordPurchaseDmTemplate:
      typeof p.discord_purchase_dm_template === "string" && p.discord_purchase_dm_template.trim()
        ? p.discord_purchase_dm_template.trim()
        : null,
  };
}

/** Map seed product (без id) към ShopItem — за резервно показване в магазина */
export function mapSeedToShopItem(p: {
  slug: string;
  name: string;
  subtitle: string;
  price: string;
  original_price: string;
  description: string;
  long_description: string;
  includes: string[];
  badge?: string | null;
  category: string;
  image_url?: string | null;
  product_media_urls?: string[] | null;
}): ShopItem {
  const seedImg = p.image_url?.trim() ? normalizeStoragePublicUrl(p.image_url) : null;
  return {
    id: `seed-${p.slug}`,
    slug: p.slug,
    image: seedImg || "/placeholder.svg",
    image_url: seedImg,
    mediaGallery: normalizeMediaGallery(p.product_media_urls),
    name: p.name,
    subtitle: p.subtitle || "",
    price: p.price,
    originalPrice: p.original_price,
    desc: p.description || "",
    longDesc: p.long_description || "",
    includes: p.includes || [],
    badge: p.badge ?? null,
    category: p.category,
    stripePrice: null,
    ingameGrantsDeliver: false,
    transferNoteTemplate: null,
    discordPurchaseDmTemplate: null,
  };
}
