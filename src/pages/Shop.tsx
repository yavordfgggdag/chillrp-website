import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Shield,
  Package,
  ArrowRight,
  ShoppingCart,
  Heart,
  Sparkles,
  Key,
  Box,
  Tag,
  Layers,
  Gift,
} from "lucide-react";
import {
  categories,
  type Category,
  type ShopItem,
  isDiscountActive,
  getDisplayPrice,
  mapDbProduct,
  formatPriceEur,
  itemMatchesShopFilter,
} from "@/lib/shopData";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { SITE_NAME } from "@/lib/config";

const iconMap: Record<string, React.ReactNode> = {
  all: <Package size={13} />,
  vip: <Shield size={13} />,
  donor: <Heart size={13} />,
  cosmetics: <Sparkles size={13} />,
  keys: <Key size={13} />,
  kits: <Box size={13} />,
  perks: <Tag size={13} />,
  bundles: <Layers size={13} />,
  seasonal: <Gift size={13} />,
  other: <ShoppingBag size={13} />,
};

export default function Shop() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, couponCode, setCouponCode, clearCoupon } = useCart();
  const logActivity = useActivityLogger();

  useEffect(() => {
    setLoading(true);
    supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setShopItems((data ?? []).map(mapDbProduct));
        setLoading(false);
      });
  }, []);

  const filtered =
    activeCategory === "all" ? shopItems : shopItems.filter((i) => itemMatchesShopFilter(i, activeCategory));

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(160_84%_39%/0.1)_0%,transparent_60%)]" />
        <div className="absolute inset-0 scanlines" />
        <div className="container mx-auto max-w-4xl relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-heading font-bold tracking-widest uppercase mb-5">
            <ShoppingBag size={13} /> Магазин
          </div>
          <h1 className="text-5xl md:text-7xl font-heading font-black tracking-widest uppercase mb-4">
            <span className="text-foreground">Магазин</span>{" "}
            <span className="text-primary text-glow-accent">{SITE_NAME}</span>
          </h1>
          <p className="text-xs text-muted-foreground/70 font-body max-w-md mx-auto">
            VIP, ключове, китове и козметика — каталогът се управлява от админ панела. Плащания и доставка се уточняват в Discord.
          </p>
          <div className="mt-6 mx-auto max-w-md rounded-xl border border-white/10 bg-black/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 text-left">
            <div className="flex items-center gap-2 text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground shrink-0">
              <Tag size={12} className="text-primary" />
              Купон
            </div>
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Код (баланс)"
              className="flex-1 min-w-0 rounded-lg border border-white/10 bg-background/60 px-2 py-1.5 text-xs font-mono"
              autoComplete="off"
            />
            <button type="button" onClick={() => clearCoupon()} className="text-[10px] font-heading text-muted-foreground hover:text-destructive shrink-0">
              Изчисти
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/80 font-body mt-2 max-w-md mx-auto">
            Промо от лансиране се прилага първо; купонът — върху тази цена при плащане от баланс на страницата на продукта.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 pb-24">
        {loading ? (
          <p className="text-center text-muted-foreground font-body py-20">Зареждане…</p>
        ) : shopItems.length === 0 ? (
          <div className="glass border border-white/10 rounded-2xl p-12 text-center max-w-lg mx-auto">
            <ShoppingBag className="h-12 w-12 text-primary/50 mx-auto mb-4" />
            <h2 className="font-heading font-black text-lg tracking-widest uppercase text-foreground mb-2">Няма продукти</h2>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              В магазина все още няма активни артикули. Провери по-късно или пиши в Discord за въпроси.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-10 justify-center">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    logActivity("category_filter", `Филтър: ${cat.label}`);
                  }}
                  className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border text-xs font-heading font-bold tracking-widest uppercase transition-all ${
                    activeCategory === cat.id
                      ? "border-primary/60 bg-primary/15 text-primary glow-accent"
                      : "border-white/8 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-white/15"
                  }`}
                >
                  {iconMap[cat.id]} {cat.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-2xl overflow-hidden border border-white/8 bg-background/80 hover:border-primary/40 transition-all duration-500 hover:translate-y-[-4px] hover:shadow-[0_12px_40px_rgba(16,185,129,0.14)] flex flex-col group animate-fade-in"
                  style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "both" }}
                >
                  <Link to={`/shop/${item.slug}`} className="relative overflow-hidden block" style={{ height: "200px" }}>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,hsl(160_84%_39%/0.18)_0%,transparent_70%)] group-hover:opacity-100 opacity-70 transition-opacity duration-500" />
                    {item.badge && (
                      <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-primary/25 border border-primary/50 text-primary text-[10px] font-heading font-black tracking-widest z-10 backdrop-blur-sm">
                        {item.badge}
                      </div>
                    )}
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
                    <div className="absolute bottom-2 left-0 right-0 text-center z-10">
                      <span className="text-[10px] font-heading font-bold tracking-[0.2em] text-muted-foreground/60 uppercase">
                        {item.subtitle}
                      </span>
                    </div>
                  </Link>

                  <div className="p-6 flex flex-col flex-1">
                    <Link to={`/shop/${item.slug}`}>
                      <h3 className="font-heading font-black text-xl text-foreground tracking-wide mb-2 leading-tight group-hover:text-primary transition-colors duration-300">
                        {item.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed flex-1 mb-5 line-clamp-2">{item.desc}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        {isDiscountActive() && (
                          <span className="text-xs font-heading text-muted-foreground/50 line-through leading-none mb-0.5">
                            {formatPriceEur(item.originalPrice)}
                          </span>
                        )}
                        <div className="font-heading font-black text-xl text-primary">{getDisplayPrice(item)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            addItem(item);
                            toast.success(`${item.name} добавен в количката!`);
                          }}
                          className="w-10 h-10 rounded-lg border border-primary/35 bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                          title="Добави в количката"
                        >
                          <ShoppingCart size={16} />
                        </button>
                        <Link
                          to={`/shop/${item.slug}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-heading font-black tracking-wider text-primary-foreground bg-gradient-to-br from-primary to-[hsl(160_58%_26%)] hover:opacity-90 transition-opacity group-hover:gap-2.5"
                        >
                          Виж <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && shopItems.length > 0 && (
              <p className="text-center text-muted-foreground font-body py-12">Няма продукти в тази категория.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
