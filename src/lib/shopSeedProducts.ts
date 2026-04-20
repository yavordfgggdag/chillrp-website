/**
 * Seed продукти за Minecraft магазина. Синхрон: Админ панел → Продукти → „Синхронизирай seed“.
 */
export type SeedProduct = {
  slug: string;
  name: string;
  subtitle: string;
  price: string;
  original_price: string;
  description: string;
  long_description: string;
  includes: string[];
  badge: string | null;
  category: string;
  image_url: string | null;
  product_media_urls?: string[] | null;
  sort_order: number;
  is_active: boolean;
  stripe_price: string | null;
};

const PLACEHOLDER_IMG: string | null = null;

function seed(
  sort_order: number,
  slug: string,
  name: string,
  price: string,
  category: string,
  includes: string[],
  opts?: { subtitle?: string; description?: string; long_description?: string; badge?: string | null }
): SeedProduct {
  const description = opts?.description ?? name;
  return {
    slug,
    name,
    subtitle: opts?.subtitle ?? "",
    price,
    original_price: price,
    description,
    long_description: opts?.long_description ?? description,
    includes,
    badge: opts?.badge ?? null,
    category,
    image_url: PLACEHOLDER_IMG,
    product_media_urls: null,
    sort_order,
    is_active: true,
    stripe_price: null,
  };
}

export const shopSeedProducts: SeedProduct[] = [
  seed(10, "rank-coal", "Coal", "4.99", "vip", ["Цветно име в таба", "1 /sethome", "Discord роля"], {
    subtitle: "Стартов VIP ранг",
    description: "Лек подкрепящ ранг без P2W предимства.",
  }),
  seed(11, "rank-iron", "Iron", "9.99", "vip", ["Всичко от Coal", "2 homes", "Емотикони в чат"], {
    subtitle: "VIP ранг",
  }),
  seed(12, "rank-emerald", "Emerald", "19.99", "vip", ["Всичко от Iron", "3 homes", "Екстра слотове за /pv"], {
    subtitle: "VIP ранг",
    badge: "POPULAR",
  }),
  seed(13, "rank-netherite", "Netherite", "39.99", "vip", ["Пълен пакет perks", "Приоритетна опашка", "Ексклузивни козметики"], {
    subtitle: "Топ VIP",
    badge: "TOP",
  }),

  seed(20, "crate-keys-5", "5× Crate keys", "7.99", "keys", ["5 ключа за избран crate в играта"], {
    subtitle: "Crate keys",
  }),
  seed(21, "crate-keys-15", "15× Crate keys", "19.99", "keys", ["15 ключа — по-добра цена на брой"], {
    subtitle: "Crate keys",
  }),

  seed(30, "kit-starter", "Starter kit", "12.99", "kits", ["Храна, инструменти, базови блокове за нов играч"], {
    subtitle: "Kit",
  }),
  seed(31, "kit-builder", "Builder kit", "16.99", "kits", ["Блокове и инструменти за строеж"], {
    subtitle: "Kit",
  }),

  seed(40, "cosmetic-particles", "Particle trail", "6.99", "cosmetics", ["Визуален ефект — без бойни бонуси"], {
    subtitle: "Козметика",
  }),
  seed(41, "cosmetic-prefix", "Custom prefix", "8.99", "cosmetics", ["Префикс в чат и таб (в рамките на правилата)"], {
    subtitle: "Козметика",
  }),

  seed(50, "faction-extra-member", "+1 член фракция", "14.99", "bundles", ["Допълнителен слот за член във фракцията (по правилата на сървъра)"], {
    subtitle: "Factions",
  }),
  seed(51, "faction-claim-boost", "Claim boost", "24.99", "bundles", ["Разширяване на територия — след одобрение от екипа"], {
    subtitle: "Factions",
  }),

  seed(60, "donor-supporter", "Supporter", "9.99", "donor", ["Подкрепа на сървъра", "Discord роля Supporter", "Благодарност в /list"], {
    subtitle: "Donor",
    badge: "♥",
  }),
  seed(61, "seasonal-bundle", "Сезонен bundle", "29.99", "seasonal", ["Ограничени козметики + keys за сезона"], {
    subtitle: "Сезонно",
    badge: "LIMITED",
  }),

  seed(90, "priority-queue-30d", "Priority 30 дни", "12.99", "perks", ["По-бързо влизане при пълен сървър", "Не дава предимства в PvP"], {
    subtitle: "Perk",
  }),
];
