import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Shield, Car, Briefcase, Package, ArrowRight, Swords, ShoppingCart } from "lucide-react";
import { categories, type Category, type ShopItem, isDiscountActive, getDisplayPrice, mapDbProduct, mapSeedToShopItem, formatPriceEur } from "@/lib/shopData";
import { shopSeedProducts } from "@/lib/shopSeedProducts";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";

const iconMap: Record<string, React.ReactNode> = {
  all: <Package size={13} />,
  vip: <Shield size={13} />,
  cars: <Car size={13} />,
  businesses: <Briefcase size={13} />,
  gang: <Swords size={13} />,
  other: <ShoppingBag size={13} />,
};

export default function Shop() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const { addItem } = useCart();
  const logActivity = useActivityLogger();

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setShopItems(data.map(mapDbProduct));
        } else {
          setShopItems(shopSeedProducts.map(mapSeedToShopItem));
        }
      });
  }, []);

  const filtered = activeCategory === "all"
    ? shopItems
    : shopItems.filter((i) => i.category === activeCategory);

  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Header */}
      <div className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(271_76%_53%/0.07)_0%,transparent_60%)]" />
        <div className="absolute inset-0 scanlines" />
        <div className="container mx-auto max-w-4xl relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-purple/40 bg-neon-purple/10 text-neon-purple text-xs font-heading font-bold tracking-widest uppercase mb-5">
            <ShoppingBag size={13} /> Магазин
          </div>
          <h1 className="text-5xl md:text-7xl font-heading font-black tracking-widest uppercase mb-4">
            <span className="text-foreground">ChillRP</span>{" "}
            <span className="gradient-text-purple">Магазин</span>
          </h1>
          <p className="text-xs text-muted-foreground/50 font-body">
            След покупка пуснете тикет в Discord за активиране в рамките на 24 часа.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 pb-24">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); logActivity("category_filter", `🏷️ Филтър: ${cat.label}`); }}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border text-xs font-heading font-bold tracking-widest uppercase transition-all ${
                activeCategory === cat.id
                  ? "border-neon-purple/60 bg-neon-purple/20 text-neon-purple glow-purple"
                  : "border-white/8 bg-white/3 text-muted-foreground hover:text-foreground hover:border-white/15"
              }`}
            >
              {iconMap[cat.id]} {cat.label}
            </button>
          ))}
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-2xl overflow-hidden border border-white/8 bg-[hsl(271_40%_8%/0.8)] hover:border-neon-purple/50 transition-all duration-500 hover:translate-y-[-6px] hover:shadow-[0_12px_50px_hsl(271_76%_65%/0.22)] flex flex-col group animate-fade-in"
              style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "both" }}
            >
              <Link to={`/shop/${item.slug}`} className="relative overflow-hidden block" style={{ height: "200px" }}>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,hsl(271_76%_53%/0.18)_0%,transparent_70%)] group-hover:opacity-100 opacity-60 transition-opacity duration-500" />
                <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/8 to-transparent skew-x-12 z-20 pointer-events-none" />
                {item.badge && (
                  <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-neon-purple/30 border border-neon-purple/50 text-neon-purple text-[10px] font-heading font-black tracking-widest z-10 backdrop-blur-sm">
                    {item.badge}
                  </div>
                )}
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[hsl(271_40%_8%)] to-transparent" />
                <div className="absolute bottom-2 left-0 right-0 text-center z-10">
                  <span className="text-[10px] font-heading font-bold tracking-[0.2em] text-muted-foreground/60 uppercase">{item.subtitle}</span>
                </div>
              </Link>

              <div className="p-6 flex flex-col flex-1">
                <Link to={`/shop/${item.slug}`}>
                  <h3 className="font-heading font-black text-xl text-foreground tracking-wide mb-2 leading-tight group-hover:text-neon-purple transition-colors duration-300">
                    {item.name}.
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground font-body leading-relaxed flex-1 mb-5 line-clamp-2">
                  {item.desc}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    {isDiscountActive() && (
                      <span className="text-xs font-heading text-muted-foreground/50 line-through leading-none mb-0.5">
                        {formatPriceEur(item.originalPrice)}
                      </span>
                    )}
                    <div
                      className="font-heading font-black text-xl"
                      style={{ background: "linear-gradient(135deg, hsl(300 80% 65%), hsl(271 76% 65%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
                    >
                      {getDisplayPrice(item)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        addItem(item);
                        toast.success(`${item.name} добавен в количката!`);
                      }}
                      className="w-10 h-10 rounded-lg border border-neon-purple/30 bg-neon-purple/10 flex items-center justify-center text-neon-purple hover:bg-neon-purple/25 transition-colors"
                      title="Добави в количката"
                    >
                      <ShoppingCart size={16} />
                    </button>
                    <Link
                      to={`/shop/${item.slug}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-heading font-black tracking-wider text-foreground transition-all duration-300 group-hover:gap-2.5 group-hover:pr-3"
                      style={{ background: "linear-gradient(135deg, hsl(300 80% 50%), hsl(271 76% 55%))" }}
                    >
                      Виж <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
