export type ShopItem = {
  id: string;
  slug: string;
  image: string;
  image_url?: string | null;
  name: string;
  subtitle: string;
  price: string;
  originalPrice: string;
  desc: string;
  longDesc: string;
  includes: string[];
  badge?: string | null;
  category: "vip" | "cars" | "businesses" | "gang" | "other";
  stripePrice?: string | null;
};

export const LAUNCH_DATE = new Date("2026-03-20T20:00:00+02:00");

export function isDiscountActive(): boolean {
  return Date.now() < LAUNCH_DATE.getTime();
}

export function getDisplayPrice(item: ShopItem): string {
  const value = isDiscountActive() ? item.price : item.originalPrice;
  return `${value} EUR`;
}

export function formatPriceEur(price: string): string {
  return `${price} EUR`;
}

export type Category = "all" | "vip" | "cars" | "businesses" | "gang" | "other";

export const categories: { id: Category; label: string }[] = [
  { id: "all", label: "Всички" },
  { id: "vip", label: "VIP" },
  { id: "cars", label: "Коли" },
  { id: "businesses", label: "Бизнеси" },
  { id: "gang", label: "Генг" },
  { id: "other", label: "Други" },
];

// Map DB product to ShopItem
export function mapDbProduct(p: any): ShopItem {
  return {
    id: p.id,
    slug: p.slug,
    image: p.image_url || "/placeholder.svg",
    image_url: p.image_url,
    name: p.name,
    subtitle: p.subtitle || "",
    price: p.price,
    originalPrice: p.original_price,
    desc: p.description || "",
    longDesc: p.long_description || "",
    includes: p.includes || [],
    badge: p.badge,
    category: p.category as ShopItem["category"],
    stripePrice: p.stripe_price,
  };
}

/** Map seed product (без id) към ShopItem — за резервно показване в магазина */
export function mapSeedToShopItem(p: { slug: string; name: string; subtitle: string; price: string; original_price: string; description: string; long_description: string; includes: string[]; badge?: string | null; category: ShopItem["category"]; image_url?: string | null }): ShopItem {
  return {
    id: `seed-${p.slug}`,
    slug: p.slug,
    image: p.image_url || "/placeholder.svg",
    image_url: p.image_url || null,
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
  };
}
