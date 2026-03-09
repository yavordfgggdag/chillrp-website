import { ShoppingCart, X, Minus, Plus, Trash2, CreditCard, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { formatPriceEur } from "@/lib/shopData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export default function CartDrawer() {
  const { items, removeItem, updateQty, clearCart, totalItems, totalPrice, isOpen, setIsOpen } = useCart();
  const { user, discordUsername } = useAuth();
  const [sending, setSending] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      toast.info("Вход за плащане ще бъде наличен скоро.");
      return;
    }
    if (!discordUsername) {
      toast.info("Влез с Discord за да платиш.");
      return;
    }
    const buyableItems = items.filter((ci) => ci.item.stripePrice);
    if (buyableItems.length === 0) {
      toast.error("Няма продукти за плащане.");
      return;
    }
    setSending(true);
    try {
      const first = buyableItems[0];
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          priceId: first.item.stripePrice,
          productName: first.item.name,
          discordUsername: discordUsername,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Грешка при създаване на плащане.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Drawer overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-sm animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md glass-strong border-l border-neon-purple/30 animate-slide-in-right flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="font-heading font-black tracking-widest uppercase text-foreground flex items-center gap-2">
                <ShoppingCart size={18} className="text-neon-purple" /> Количка
                {totalItems > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neon-purple/20 border border-neon-purple/40 text-neon-purple">
                    {totalItems}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                  <ShoppingCart size={48} className="opacity-20" />
                  <p className="font-heading text-sm tracking-wider">Количката е празна</p>
                </div>
              ) : (
                items.map(({ item, qty }) => (
                  <div
                    key={item.id}
                    className="glass border border-white/8 rounded-xl p-3 flex gap-3 group hover:border-neon-purple/25 transition-colors"
                  >
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-sm text-foreground truncate">{item.name}</h3>
                      <p className="text-[10px] text-muted-foreground font-body mt-0.5">{item.subtitle}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQty(item.id, qty - 1)}
                            className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="text-xs font-heading font-bold w-6 text-center text-foreground">{qty}</span>
                          <button
                            onClick={() => updateQty(item.id, qty + 1)}
                            className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                        <div
                          className="font-heading font-black text-sm"
                          style={{
                            background: "linear-gradient(135deg, hsl(300 80% 65%), hsl(271 76% 65%))",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                          }}
                        >
                          {formatPriceEur(item.price)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="self-start p-1 text-muted-foreground/40 hover:text-neon-red transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-white/8 px-5 py-4 space-y-3 shrink-0">
                <div className="text-xs text-muted-foreground font-body mb-2 truncate">
                  Discord: <span className="text-neon-purple font-heading font-bold">{discordUsername || "— Влез с Discord"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-semibold tracking-wider uppercase text-muted-foreground">
                    Общо
                  </span>
                  <span
                    className="font-heading font-black text-xl"
                    style={{
                      background: "linear-gradient(135deg, hsl(300 80% 65%), hsl(271 76% 65%))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    €{totalPrice.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-heading font-black text-sm tracking-wider text-foreground glow-purple hover:opacity-90 transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, hsl(300 80% 50%), hsl(271 76% 55%))" }}
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                  {sending ? "Зареждане..." : "Плати"}
                </button>
                <button
                  onClick={clearCart}
                  className="w-full py-2 text-xs font-heading tracking-wider text-muted-foreground/50 hover:text-neon-red transition-colors"
                >
                  Изчисти количката
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
