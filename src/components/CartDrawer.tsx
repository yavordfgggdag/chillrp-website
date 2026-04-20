import { ShoppingCart, X, Minus, Plus, Trash2, ExternalLink, Tag, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { formatPriceEur } from "@/lib/shopData";
import { DISCORD_SHOP_CHECKOUT_URL } from "@/lib/config";
import { toast } from "sonner";

export default function CartDrawer() {
  const {
    items,
    removeItem,
    updateQty,
    clearCart,
    totalItems,
    totalPrice,
    totalPriceCents,
    isOpen,
    setIsOpen,
    couponCode,
    setCouponCode,
    couponPreview,
    couponError,
    couponValidating,
    validateCouponForCheckout,
    clearCoupon,
  } = useCart();

  const singleProductId = items.length === 1 ? items[0].item.id : null;

  const handleCheckout = () => {
    const summary = items
      .map(({ item, qty }) => `${item.name}${qty > 1 ? ` ×${qty}` : ""}`)
      .join(", ");
    window.open(DISCORD_SHOP_CHECKOUT_URL, "_blank", "noopener,noreferrer");
    toast.success("Отвори се Discord — пусни тикет и изброи продуктите от количката.", {
      description: summary.length > 120 ? `${summary.slice(0, 117)}…` : summary,
    });
    clearCart();
    setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-sm animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md glass-strong border-l border-primary/30 animate-slide-in-right flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="font-heading font-black tracking-widest uppercase text-foreground flex items-center gap-2">
                <ShoppingCart size={18} className="text-primary" /> Количка
                {totalItems > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary">
                    {totalItems}
                  </span>
                )}
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

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
                    className="glass border border-white/8 rounded-xl p-3 flex gap-3 group hover:border-primary/25 transition-colors"
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
                        <div className="font-heading font-black text-sm text-primary">{formatPriceEur(item.price)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="self-start p-1 text-muted-foreground/40 hover:text-primary transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-white/8 px-5 py-4 space-y-3 shrink-0">
                <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground">
                    <Tag size={12} className="text-primary shrink-0" />
                    Купон
                  </div>
                  <div className="flex gap-1">
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Код"
                      className="flex-1 min-w-0 rounded-md border border-white/10 bg-background/50 px-2 py-1.5 text-[11px] font-mono"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      disabled={couponValidating || totalPriceCents <= 0}
                      onClick={() =>
                        void validateCouponForCheckout(singleProductId, totalPriceCents).then((r) => {
                          if (r.ok) toast.success("Купонът е валиден за тази количка.");
                          else if (couponCode.trim()) toast.error(r.error || "Невалиден купон.");
                        })
                      }
                      className="shrink-0 px-2 py-1.5 rounded-md border border-white/15 text-[10px] font-heading font-bold uppercase disabled:opacity-40"
                    >
                      {couponValidating ? <Loader2 className="animate-spin h-3 w-3" /> : "OK"}
                    </button>
                    <button
                      type="button"
                      onClick={() => clearCoupon()}
                      className="shrink-0 px-2 text-muted-foreground hover:text-destructive text-sm"
                      title="Изчисти"
                    >
                      ×
                    </button>
                  </div>
                  {couponError && <p className="text-[10px] text-destructive">{couponError}</p>}
                  {couponPreview && couponPreview.final_cents < couponPreview.subtotal_cents && (
                    <p className="text-[10px] text-neon-green">
                      С отстъпка: {(couponPreview.final_cents / 100).toFixed(2)} USD
                      <span className="text-muted-foreground line-through ml-1">
                        {(couponPreview.subtotal_cents / 100).toFixed(2)}
                      </span>
                    </p>
                  )}
                  {items.length > 1 && (
                    <p className="text-[9px] text-muted-foreground leading-snug">
                      Плащане от баланс е по продукт — за купон към конкретен артикул отвори страницата на продукта.
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-semibold tracking-wider uppercase text-muted-foreground">
                    Общо (ориентир)
                  </span>
                  <span className="font-heading font-black text-xl text-primary">{totalPrice.toFixed(2)} USD</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-heading font-black text-sm tracking-wider text-primary-foreground bg-gradient-to-br from-primary to-[hsl(0_58%_32%)] glow-accent hover:opacity-90 transition-all"
                >
                  <ExternalLink size={15} />
                  Продължи в Discord
                </button>
                <button
                  onClick={clearCart}
                  className="w-full py-2 text-xs font-heading tracking-wider text-muted-foreground/50 hover:text-primary transition-colors"
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
