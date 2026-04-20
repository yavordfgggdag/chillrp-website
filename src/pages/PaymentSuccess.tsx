import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, Loader2, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mapDbProduct } from "@/lib/shopData";
import { useAuth } from "@/hooks/useAuth";

const TICKET_URL = "https://discord.com/channels/1194685148099354685/1471238731624087669";
const POLL_MS = 1000;
const POLL_MAX = 50;

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const product = params.get("product") || "";
  const discord = params.get("discord") || "";
  const sessionId = params.get("session_id") || "";
  const saved = useRef(false);
  const { user, loading: authLoading } = useAuth();
  const [redeemCode, setRedeemCode] = useState<string | null>(null);
  const [pollDone, setPollDone] = useState(false);
  const [productUsesRedeem, setProductUsesRedeem] = useState(false);
  const [ingameHint, setIngameHint] = useState<string | null>(null);

  useEffect(() => {
    if (!product) {
      setProductUsesRedeem(false);
      setIngameHint(null);
      return;
    }
    void supabase
      .from("products")
      .select("ingame_player_hint, opcrime_use_redeem_code")
      .eq("name", product)
      .maybeSingle()
      .then(({ data }) => {
        setProductUsesRedeem(Boolean(data?.opcrime_use_redeem_code));
        const h = data?.ingame_player_hint;
        setIngameHint(typeof h === "string" && h.trim() ? h.trim() : null);
      });
  }, [product]);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;

    supabase
      .from("products")
      .select("*")
      .eq("name", product)
      .maybeSingle()
      .then(({ data: dbProduct }) => {
        const item = dbProduct ? mapDbProduct(dbProduct) : null;
        const priceEur = item
          ? parseFloat(
              item.price
                .replace("€", "")
                .replace(",", ".")
                .replace(" EUR", "")
                .replace(" USD", "")
                .replace(" / месец", "")
            )
          : null;

        supabase
          .from("purchases")
          .insert({
            product_name: product || "Неизвестен продукт",
            category: item?.category || null,
            price_eur: priceEur,
            discord_username: discord || null,
            stripe_session_id: sessionId || null,
            user_id: user?.id || null,
          })
          .then(({ error }) => {
            if (error) console.warn("Failed to save purchase:", error);
          });
      });
  }, [user, product, discord, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setPollDone(true);
      return;
    }
    if (authLoading) return;
    if (!user?.id) {
      setPollDone(true);
      return;
    }

    setPollDone(false);
    let cancelled = false;
    let attempts = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let stopped = false;

    const pollOnce = async () => {
      const { data, error } = await supabase
        .from("store_redeem_codes")
        .select("code")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (error) console.warn("[PaymentSuccess] redeem poll", error.message);
      if (data?.code) {
        stopped = true;
        setRedeemCode(String(data.code));
        setPollDone(true);
        if (intervalId) clearInterval(intervalId);
        return;
      }
      attempts += 1;
      if (attempts >= POLL_MAX) {
        stopped = true;
        setPollDone(true);
        if (intervalId) clearInterval(intervalId);
      }
    };

    void (async () => {
      await pollOnce();
      if (cancelled || stopped) return;
      intervalId = setInterval(() => void pollOnce(), POLL_MS);
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [sessionId, user?.id, authLoading]);

  const defaultCommand = `/chillrp_redeem ${redeemCode || "КОД"}`;

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

          {sessionId && authLoading && (
            <p className="text-muted-foreground font-body text-sm mb-4 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" />
              Проверяваме акаунта…
            </p>
          )}

          {sessionId && !authLoading && !user?.id && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-6 text-left">
              <p className="text-sm text-foreground font-body">
                За да видиш кода за игра на тази страница, <strong>влез със същия Discord акаунт</strong>, с който си
                платил. След вход кодът се зарежда автоматично (до около минута след плащането).
              </p>
              <p className="text-xs text-muted-foreground font-body mt-2">
                Кодът и инструкциите са изпратени и в <strong className="text-foreground">Discord лично съобщение</strong>
                , ако ботът може да ти пише.
              </p>
              <Link
                to="/"
                className="inline-flex mt-3 text-sm font-heading font-semibold text-neon-cyan hover:underline"
              >
                Към началото — Вход с Discord
              </Link>
            </div>
          )}

          {sessionId && user?.id && !redeemCode && !pollDone && (
            <p className="text-muted-foreground font-body text-sm mb-4 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" />
              Зареждаме кода за игра…
            </p>
          )}

          {sessionId && user?.id && productUsesRedeem && pollDone && !redeemCode && (
            <p className="text-muted-foreground font-body text-sm mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              Кодът още не се вижда тук — webhook-ът може да закъснее с няколко секунди. Провери{" "}
              <strong className="text-foreground">Discord ЛС</strong> или опресни страницата след малко (оставай
              логнат).
            </p>
          )}

          {productUsesRedeem && (
            <div
              className={`rounded-xl p-4 mb-6 text-left ${
                redeemCode
                  ? "border border-neon-cyan/30 bg-neon-cyan/5"
                  : "border border-white/10 bg-white/[0.03]"
              }`}
            >
              <p
                className={`text-xs font-heading font-bold uppercase tracking-widest mb-2 ${
                  redeemCode ? "text-neon-cyan" : "text-muted-foreground"
                }`}
              >
                {redeemCode ? "Твоят код в играта" : "Активиране в играта"}
              </p>
              {ingameHint ? (
                <p className="text-sm text-foreground font-body whitespace-pre-wrap mb-3">{ingameHint}</p>
              ) : !redeemCode ? (
                <p className="text-sm text-muted-foreground font-body mb-3">
                  Влез в сървъра и използвай командата по-долу с твоя код (след като се появи тук или в Discord ЛС).
                </p>
              ) : null}
              {redeemCode ? (
                <p className="font-mono text-lg text-foreground break-all select-all mb-3">{redeemCode}</p>
              ) : null}
              <p className="text-xs text-muted-foreground font-body">
                В сървъра:{" "}
                <span className={`font-mono break-all ${redeemCode ? "text-foreground sm:text-sm" : "text-neon-cyan"}`}>
                  {defaultCommand}
                </span>
              </p>
            </div>
          )}

          <p className="text-muted-foreground font-body text-sm mb-8">
            Изпратихме ти обобщение и в <strong className="text-foreground">Discord лично съобщение</strong> (ако си в
            сървъра). При проблем с наградата или активиране —{" "}
            <strong className="text-foreground">пусни тикет</strong> и ще ти помогнем.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={TICKET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-heading font-black text-sm text-foreground glow-accent hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, #064e3b, #059669, #a7f3d0)" }}
            >
              <ExternalLink size={15} /> Пусни тикет в Discord
            </a>
            {user?.id && (
              <Link
                to="/profile"
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-muted-foreground font-heading font-semibold text-sm hover:border-neon-cyan/40 hover:text-neon-cyan transition-all"
              >
                Профил (citizenid за автоматичен GC)
              </Link>
            )}
            <Link
              to="/shop"
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-muted-foreground font-heading font-semibold text-sm hover:border-primary/40 hover:text-primary transition-all"
            >
              <ShoppingBag size={14} /> Към магазина
            </Link>
            <Link
              to="/"
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-muted-foreground font-heading font-semibold text-sm hover:border-white/20 hover:text-foreground transition-all"
            >
              Към началото
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
