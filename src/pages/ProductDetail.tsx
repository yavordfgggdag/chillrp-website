import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, CheckCircle2, ShoppingBag, X, CreditCard, Loader2 } from "lucide-react";
import { isDiscountActive, getDisplayPrice, mapDbProduct, mapSeedToShopItem, formatPriceEur, type ShopItem } from "@/lib/shopData";
import { shopSeedProducts } from "@/lib/shopSeedProducts";
import { DISCORD_INVITE } from "@/lib/config";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useAuth } from "@/hooks/useAuth";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { discordUsername: authDiscord } = useAuth();
  const [item, setItem] = useState<ShopItem | null>(null);
  const [related, setRelated] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [discordUsername, setDiscordUsername] = useState("");
  const [sending, setSending] = useState(false);
  const logActivity = useActivityLogger();
  const discordForPayment = authDiscord || discordUsername.trim();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("products")
      .select("*")
      .eq("slug", id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const mapped = mapDbProduct(data);
          setItem(mapped);
          supabase
            .from("products")
            .select("*")
            .eq("category", data.category)
            .eq("is_active", true)
            .neq("id", data.id)
            .order("sort_order", { ascending: true })
            .limit(3)
            .then(({ data: relData }) => {
              if (relData) setRelated(relData.map(mapDbProduct));
            });
        } else {
          const seed = shopSeedProducts.find((p) => p.slug === id);
          if (seed) {
            setItem(mapSeedToShopItem(seed));
            const relatedSeeds = shopSeedProducts
              .filter((p) => p.category === seed.category && p.slug !== id)
              .slice(0, 3)
              .map(mapSeedToShopItem);
            setRelated(relatedSeeds);
          } else {
            setItem(null);
          }
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-neon-purple" size={32} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground font-heading text-xl">Продуктът не е намерен.</p>
        <Link to="/shop" className="text-neon-purple underline font-heading text-sm">← Обратно към магазина</Link>
      </div>
    );
  }

  const handleBuy = () => {
    logActivity("checkout_start", `💳 Натисна "Купи": ${item.name} (${getDisplayPrice(item)})`);
    if (!item.stripePrice) {
      window.open(DISCORD_INVITE, "_blank");
      return;
    }
    setModalOpen(true);
  };

  const handleCheckout = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          priceId: item.stripePrice,
          productName: item.name,
          discordUsername: discordForPayment || undefined,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error("Грешка при създаване на плащане. Опитай отново.");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen pt-28 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <Link to="/shop" className="inline-flex items-center gap-2 text-muted-foreground hover:text-neon-purple font-heading text-xs tracking-widest uppercase mb-8 transition-colors">
          <ArrowLeft size={14} /> Обратно към магазина
        </Link>

        <div className="grid md:grid-cols-2 gap-10 mb-16">
          <div className="rounded-2xl overflow-hidden border border-white/8 bg-[hsl(271_50%_6%/0.95)] flex items-center justify-center p-8 relative min-h-[340px]">
            {item.badge && (
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-neon-purple/30 border border-neon-purple/50 text-neon-purple text-[10px] font-heading font-black tracking-widest">
                {item.badge}
              </div>
            )}
            <img src={item.image} alt={item.name} className="w-full h-64 object-cover rounded-xl drop-shadow-[0_0_30px_rgba(160,100,255,0.4)]" />
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <p className="text-xs font-heading font-bold tracking-[0.25em] text-muted-foreground/50 uppercase mb-2">{item.subtitle}</p>
              <h1 className="text-3xl md:text-4xl font-heading font-black text-foreground leading-tight mb-4">{item.name}.</h1>
              <p className="text-muted-foreground font-body leading-relaxed mb-6 text-sm">{item.longDesc}</p>

              <div className="glass border border-white/6 rounded-xl p-5 mb-6">
                <p className="text-xs font-heading font-bold tracking-widest uppercase text-neon-purple mb-4">Включва</p>
                <ul className="space-y-2.5">
                  {item.includes.map((inc, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-foreground/80 font-body">
                      <CheckCircle2 size={15} className="text-neon-purple shrink-0 mt-0.5" />
                      {inc}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex flex-col">
                {isDiscountActive() && (
                  <span className="text-sm font-heading text-muted-foreground/50 line-through leading-none mb-1">{formatPriceEur(item.originalPrice)}</span>
                )}
                <div className="font-heading font-black text-3xl" style={{ background: "linear-gradient(135deg, hsl(300 80% 65%), hsl(271 76% 65%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {getDisplayPrice(item)}
                </div>
              </div>
              <button onClick={handleBuy} className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-heading font-black tracking-wider text-foreground hover:opacity-90 transition-all glow-purple" style={{ background: "linear-gradient(135deg, hsl(300 80% 50%), hsl(271 76% 55%))" }}>
                <ExternalLink size={15} /> {item.stripePrice ? "Купи сега" : "Купи в Discord"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground/40 font-body mt-3">След покупка пусни тикет в Discord. Активиране в рамките на 24 часа.</p>
          </div>
        </div>

        {related.length > 0 && (
          <div>
            <div className="sep-purple mb-8" />
            <h2 className="font-heading font-black text-xl tracking-widest uppercase text-foreground mb-6">Подобни продукти</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {related.map((rel) => (
                <Link key={rel.id} to={`/shop/${rel.slug}`} className="rounded-xl overflow-hidden border border-white/8 bg-[hsl(271_40%_8%/0.8)] hover:border-neon-purple/40 transition-all duration-300 hover:translate-y-[-3px] group flex flex-col">
                  <div className="bg-[hsl(271_50%_6%/0.95)] p-5 flex items-center justify-center">
                    <img src={rel.image} alt={rel.name} className="h-28 w-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-heading font-bold text-sm text-foreground/90 group-hover:text-neon-purple transition-colors mb-1">{rel.name}</h3>
                    <p className="text-xs text-muted-foreground font-body leading-relaxed flex-1 line-clamp-2">{rel.desc}</p>
                    <div className="font-heading font-black text-base mt-3" style={{ background: "linear-gradient(135deg, hsl(300 80% 65%), hsl(271 76% 65%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                      {getDisplayPrice(rel)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link to="/shop" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-muted-foreground font-heading font-semibold tracking-widest uppercase text-sm hover:border-neon-purple/40 hover:text-neon-purple transition-all">
            <ShoppingBag size={14} /> Всички продукти
          </Link>
        </div>
      </div>

      {/* Buy Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in p-4" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="glass-strong border border-neon-purple/40 rounded-2xl max-w-md w-full animate-slide-in-up p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-black text-lg tracking-widest uppercase text-neon-purple">🛒 Купи — {item.name}</h2>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={20} /></button>
            </div>
            <div className="glass border border-white/6 rounded-xl p-4 mb-5 flex items-center gap-4">
              <img src={item.image} alt={item.name} className="h-14 w-14 object-cover rounded-lg shrink-0" />
              <div>
                <div className="font-heading font-bold text-foreground text-sm">{item.name}</div>
                <div className="text-xs text-muted-foreground font-body mt-0.5">{item.subtitle}</div>
                <div className="font-heading font-black text-base mt-1" style={{ background: "linear-gradient(135deg, hsl(300 80% 65%), hsl(271 76% 65%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {getDisplayPrice(item)}
                </div>
              </div>
            </div>
            <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-2">
              Discord {authDiscord ? "(от профила)" : ""} <span className="text-muted-foreground/40">(опционално)</span>
            </label>
            {authDiscord ? (
              <div className="w-full px-4 py-2.5 rounded-xl glass border border-white/10 text-sm font-body text-neon-purple font-heading font-bold mb-2">{authDiscord}</div>
            ) : (
              <input type="text" value={discordUsername} onChange={(e) => setDiscordUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCheckout()} placeholder="например: fraisbg"
                className="w-full px-4 py-2.5 rounded-xl glass border border-white/10 focus:border-neon-purple/50 focus:outline-none text-sm font-body text-foreground placeholder:text-muted-foreground bg-transparent mb-2" />
            )}
            <p className="text-xs text-muted-foreground/50 font-body mb-5">За да получиш потвърждение в Discord след активиране.</p>
            <div className="mb-2">
              <p className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground/50 mb-2">Начини за плащане</p>
              <div className="flex flex-wrap gap-1.5">
                {[{ icon: "💳", label: "Карта" }, { icon: "🅿️", label: "PayPal" }, { icon: "", label: "Apple Pay" }, { icon: "", label: "Google Pay" }, { icon: "🔗", label: "Link" }, { icon: "🇧🇪", label: "Bancontact" }, { icon: "🇵🇱", label: "BLIK" }, { icon: "🇦🇹", label: "EPS" }].map((m) => (
                  <div key={m.label} className="glass border border-white/8 rounded-lg px-2.5 py-1.5 text-center text-[10px] font-heading font-bold text-muted-foreground tracking-wider whitespace-nowrap">
                    {m.icon} {m.label}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/40 font-body mb-5">Stripe Checkout ще покаже наличните методи за твоята страна.</p>
            <div className="flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-muted-foreground font-heading font-semibold text-sm hover:border-white/20 transition-colors">Назад</button>
              <button onClick={handleCheckout} disabled={sending} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-heading font-black text-sm text-foreground glow-purple hover:opacity-90 transition-all disabled:opacity-50" style={{ background: "linear-gradient(135deg, hsl(300 80% 50%), hsl(271 76% 55%))" }}>
                {sending ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                {sending ? "Зареждане..." : "Плати"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
