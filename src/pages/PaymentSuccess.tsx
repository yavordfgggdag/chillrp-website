import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mapDbProduct } from "@/lib/shopData";
import { useAuth } from "@/hooks/useAuth";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const product = params.get("product") || "";
  const discord = params.get("discord") || "";
  const sessionId = params.get("session_id") || "";
  const notified = useRef(false);
  const { user } = useAuth();

  useEffect(() => {
    if (notified.current) return;
    notified.current = true;

    // Find product from DB
    supabase.from("products").select("*").eq("name", product).maybeSingle().then(({ data: dbProduct }) => {
      const item = dbProduct ? mapDbProduct(dbProduct) : null;
      const priceEur = item ? parseFloat(item.price.replace("€", "").replace(",", ".").replace(" EUR", "").replace(" / месец", "")) : null;

      // Save purchase to database
      supabase.from("purchases").insert({
        product_name: product || "Неизвестен продукт",
        category: item?.category || null,
        price_eur: priceEur,
        discord_username: discord || null,
        stripe_session_id: sessionId || null,
        user_id: user?.id || null,
      }).then(({ error }) => {
        if (error) console.warn("Failed to save purchase:", error);
      });

      // Discord notification
      supabase.functions.invoke("notify-discord-purchase", {
        body: {
          discord_username: discord || null,
          product_name: product || "Неизвестен продукт",
          price: item?.price || "—",
          category: item?.category || "—",
        },
      }).catch((e) => console.error("Notify грешка:", e));
    });
  }, [user]);

  return (
    <main className="min-h-screen pt-28 pb-20 px-4 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="glass border border-neon-green/30 rounded-2xl p-10 animate-fade-in">
          <CheckCircle2 size={56} className="text-neon-green mx-auto mb-5" />
          <h1 className="font-heading font-black text-2xl tracking-widest uppercase text-foreground mb-3">
            Плащането е успешно!
          </h1>
          {product && (
            <p className="text-muted-foreground font-body mb-2">
              Закупи: <span className="text-foreground font-semibold">{product}</span>
            </p>
          )}
          <p className="text-muted-foreground font-body text-sm mb-8">
            Пусни тикет в Discord и стафът ще активира покупката ти в рамките на <strong className="text-foreground">24 часа</strong>.
          </p>
          <div className="flex flex-col gap-3">
            <a href="https://discord.com/channels/1194685148099354685/1471238731624087669" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-heading font-black text-sm text-foreground glow-purple hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, hsl(300 80% 50%), hsl(271 76% 55%))" }}>
              <ExternalLink size={15} /> 🎫 Пусни тикет в Discord
            </a>
            <Link to="/shop" className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-muted-foreground font-heading font-semibold text-sm hover:border-neon-purple/40 hover:text-neon-purple transition-all">
              <ShoppingBag size={14} /> Обратно към магазина
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
