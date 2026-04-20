import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Heart,
  Home,
  Loader2,
  Shield,
  ShoppingCart,
  Zap,
} from "lucide-react";
import {
  isDiscountActive,
  getDisplayPrice,
  mapDbProduct,
  formatPriceEur,
  getSaleBadgeText,
  getPriceCents,
  type ShopItem,
} from "@/lib/shopData";
import { DISCORD_INVITE, DISCORD_SHOP_CHECKOUT_URL, getProductPageSocialLinks } from "@/lib/config";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useAuth, isDiscordOAuthSession } from "@/hooks/useAuth";
import { getDiscordOAuthSignInOptions } from "@/lib/discordOAuth";
import { isSupabaseConfiguredForAuth } from "@/lib/supabaseSiteUrl";
import DiscordBrandIcon from "@/components/DiscordBrandIcon";
import { formatBalanceEur, useProfileWallet } from "@/hooks/useProfileWallet";
import { useCart } from "@/hooks/useCart";

type CheckoutPhase = "browse" | "discord_gate" | "ready" | "code";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function socialButtonClass(tone: "youtube" | "tiktok" | "gitbook" | "discord"): string {
  const base =
    "flex-1 min-w-[6.5rem] flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-heading font-bold tracking-wider uppercase transition-all border ";
  switch (tone) {
    case "youtube":
      return `${base} bg-emerald-950/60 border-emerald-800/50 text-emerald-200 hover:bg-emerald-900/50`;
    case "tiktok":
      return `${base} bg-orange-950/50 border-orange-800/40 text-orange-100 hover:bg-orange-900/40`;
    case "gitbook":
      return `${base} bg-zinc-800/80 border-zinc-600/40 text-zinc-200 hover:bg-zinc-700/80`;
    case "discord":
      return `${base} bg-[#5865F2]/25 border-[#5865F2]/50 text-[#aab4ff] hover:bg-[#5865F2]/35`;
    default:
      return base;
  }
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ShopItem | null>(null);
  const [related, setRelated] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<CheckoutPhase>("browse");
  const [wishlisted, setWishlisted] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [balancePayLoading, setBalancePayLoading] = useState(false);

  const { user, session, discordUsername, loading: authLoading } = useAuth();
  const { shopBalanceCents, refresh: refreshWallet } = useProfileWallet();
  const {
    couponCode,
    setCouponCode,
    couponPreview,
    couponError,
    couponValidating,
    validateCouponForCheckout,
    clearCoupon,
  } = useCart();
  const logActivity = useActivityLogger();

  const gallery = useMemo(() => {
    if (!item) return [];
    const g = item.mediaGallery?.filter(Boolean) ?? [];
    return g.length ? g : [item.image];
  }, [item]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setPhase("browse");
    setTicketCode(null);
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
          setMediaIdx(0);
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
          setItem(null);
          setRelated([]);
        }
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!item) return;
    const cents = getPriceCents(item);
    if (!couponCode.trim()) return;
    void validateCouponForCheckout(item.id, cents);
  }, [item?.id, couponCode, validateCouponForCheckout]);

  useEffect(() => {
    if (session && isDiscordOAuthSession(session) && phase === "discord_gate") {
      setPhase("ready");
    }
  }, [session, phase]);

  const handleDiscordLink = async () => {
    if (!isSupabaseConfiguredForAuth()) {
      toast.error(
        "Липсва VITE_SUPABASE_URL в .env. За preview: попълни .env и пусни отново npm run build.",
      );
      return;
    }
    setDiscordLoading(true);
    try {
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      if (currentPath && currentPath !== "/auth/callback") {
        localStorage.setItem("chillrp_post_auth_path", currentPath);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: getDiscordOAuthSignInOptions(),
      });
      if (error) {
        toast.error("Грешка при вход с Discord.");
        console.error(error);
      }
    } catch (e) {
      toast.error("Грешка при вход с Discord.");
      console.error(e);
    } finally {
      setDiscordLoading(false);
    }
  };

  const startCheckout = () => {
    if (!item) return;
    logActivity("shop_ticket_flow_start", `Тикет поръчка: ${item.name}`);
    if (!isDiscordOAuthSession(session)) {
      setPhase("discord_gate");
      return;
    }
    setPhase("ready");
  };

  const generateTicketCode = async () => {
    if (!item || !user?.id) return;
    if (!UUID_RE.test(item.id)) {
      toast.error("Продуктът няма валиден запис в базата — синхронизирай seed от админа.");
      return;
    }
    setGenLoading(true);
    try {
      const { data, error } = await supabase
        .from("shop_ticket_checkouts")
        .insert({
          user_id: user.id,
          product_id: item.id,
          product_slug: item.slug,
          product_name: item.name,
          amount_display: getDisplayPrice(item),
          quantity: 1,
          discord_username: discordUsername,
        })
        .select("id, ticket_code")
        .single();

      if (error) {
        const errAny = error as { code?: string; message?: string };
        const missing =
          errAny.code === "PGRST205" ||
          /shop_ticket_checkouts/i.test(errAny.message || "") ||
          /schema cache/i.test(errAny.message || "");
        if (missing) {
          toast.error(
            "Таблицата за тикет кодове липсва. Изпълни supabase/RUN_THIS_shop_ticket_checkouts.sql в SQL Editor.",
            { duration: 8000 },
          );
        } else {
          toast.error(error.message || "Неуспешно генериране на код.");
        }
        return;
      }
      if (data?.ticket_code) {
        setTicketCode(data.ticket_code);
        setPhase("code");
        logActivity("shop_ticket_code_created", `Код ${data.ticket_code} · ${item.slug}`);

        const { data: sess } = await supabase.auth.getSession();
        const tok = sess.session?.access_token;
        if (tok && data.id) {
          const { data: nData, error: nErr } = await supabase.functions.invoke("notify-shop-ticket-code", {
            body: {
              checkout_id: data.id,
              ticket_button_url: DISCORD_SHOP_CHECKOUT_URL,
              discord_invite_url: DISCORD_INVITE,
            },
            headers: { Authorization: `Bearer ${tok}` },
          });
          if (nErr) {
            toast.success("Кодът е записан.", {
              description: "Известие в Discord не се изпрати — деплой notify-shop-ticket-code и secrets (виж .env.example).",
            });
          } else if (nData && typeof nData === "object" && (nData as { dm?: boolean }).dm === true) {
            toast.success("Кодът е готов — изпратихме ти лично съобщение в Discord.");
          } else {
            const reason = (nData as { dm_reason?: string } | null)?.dm_reason;
            toast.success("Кодът е готов.", {
              description:
                reason === "not_in_guild" || reason === "no_discord_identity"
                  ? "Не успяхме да ти пратим ЛС (не си в сървъра или липсва Discord). Копирай кода оттук и го изпрати в тикет."
                  : "Ако нямаш ЛС от бота — използвай кода на екрана; staff го вижда в админ панела.",
            });
          }
        } else {
          toast.success("Кодът е готов — пусни тикет в Discord.");
        }
      }
    } finally {
      setGenLoading(false);
    }
  };

  const copyCode = async () => {
    if (!ticketCode) return;
    try {
      await navigator.clipboard.writeText(ticketCode);
      toast.success("Кодът е копиран.");
    } catch {
      toast.error("Копирането не успя.");
    }
  };

  const skipDiscord = () => {
    setPhase("browse");
    window.open(DISCORD_SHOP_CHECKOUT_URL, "_blank", "noopener,noreferrer");
    toast.info("Отвори се Discord", {
      description: "Без код — опиши поръчката ръчно в тикет.",
    });
  };

  const payWithBalance = async () => {
    if (!item || !user?.id) return;
    if (!isDiscordOAuthSession(session)) {
      toast.error("Влез с Discord, за да платиш от баланс.");
      return;
    }
    if (!UUID_RE.test(item.id)) {
      toast.error("Продуктът няма валиден UUID в базата.");
      return;
    }
    const cents = getPriceCents(item);
    if (cents <= 0) {
      toast.error("Невалидна цена за плащане от баланс.");
      return;
    }
    let chargeCents = cents;
    if (couponCode.trim()) {
      const v = await validateCouponForCheckout(item.id, cents);
      if (!v.ok) {
        toast.error(v.error || "Купонът не е валиден за тази поръчка.");
        return;
      }
      chargeCents = v.finalCents ?? cents;
    }
    if ((shopBalanceCents ?? 0) < chargeCents) {
      toast.error("Недостатъчен баланс.", { description: `Имаш ${formatBalanceEur(shopBalanceCents)}.` });
      return;
    }
    setBalancePayLoading(true);
    try {
      const { data, error } = await supabase.rpc("purchase_product_with_balance", {
        p_product_id: item.id,
        p_price_cents: cents,
        p_coupon_code: couponCode.trim() || null,
      });
      if (error) {
        toast.error(error.message || "RPC грешка.");
        return;
      }
      const payload = data as { ok?: boolean; error?: string; new_balance?: number } | null;
      if (!payload?.ok) {
        toast.error(payload?.error || "Плащането не мина.");
        return;
      }
      toast.success("Поръчката е платена от баланс.");
      void refreshWallet();
      logActivity("shop_balance_purchase", `${item.slug} · ${cents}c`);
    } finally {
      setBalancePayLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground font-heading text-xl">Продуктът не е намерен.</p>
        <Link to="/shop" className="text-primary underline font-heading text-sm">
          ← Обратно към магазина
        </Link>
      </div>
    );
  }

  const saleBadge = getSaleBadgeText(item);
  const socialLinks = getProductPageSocialLinks();
  const discordLinked = isDiscordOAuthSession(session);

  const purchaseAside = (
    <div className="rounded-2xl border border-white/[0.08] bg-[#121212]/90 backdrop-blur-sm p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
      {phase === "discord_gate" && (
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#5865F2]/20 ring-2 ring-[#5865F2]/40 shadow-[0_0_24px_rgba(88,101,242,0.35)]">
            <DiscordBrandIcon size={36} />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">
            Идентифицирай се с <span className="text-[#aab4ff]">Discord</span>
          </h2>
          <p className="text-sm text-muted-foreground font-body mb-6 leading-relaxed">
            Свържи Discord акаунта си, за да получиш уникален код за тикет и по-бърза обработка от екипа.
          </p>
          <button
            type="button"
            onClick={handleDiscordLink}
            disabled={discordLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-heading font-black text-sm tracking-widest uppercase text-white bg-[#5865F2] hover:bg-[#4752c4] shadow-[0_8px_28px_rgba(88,101,242,0.35)] transition-colors disabled:opacity-60"
          >
            {discordLoading ? <Loader2 className="animate-spin" size={18} /> : <DiscordBrandIcon size={20} />}
            Свържи Discord
          </button>
          <button
            type="button"
            onClick={skipDiscord}
            className="mt-4 text-xs text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-2"
          >
            Пропусни и отвори Discord
          </button>
          <button
            type="button"
            onClick={() => setPhase("browse")}
            className="mt-3 block w-full text-xs text-muted-foreground hover:text-foreground"
          >
            ← Назад към продукта
          </button>
        </div>
      )}

      {phase === "ready" && (
        <div className="text-center">
          <p className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-4">
            Добавяне към поръчка
          </p>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#5865F2]/15 ring-1 ring-[#5865F2]/30">
            <DiscordBrandIcon size={32} />
          </div>
          <h2 className="text-base font-bold text-foreground mb-4">
            Идентифициран с <span className="text-[#aab4ff]">Discord</span>
          </h2>
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/20 px-4 py-3 text-left mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 size={14} />
              </span>
              <span className="text-[10px] font-heading font-black tracking-widest text-emerald-400 uppercase">
                Потвърден акаунт
              </span>
            </div>
            <p className="font-heading font-bold text-foreground truncate">
              {discordUsername || user?.email || "—"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mb-5">Готово за генериране на код за тикет.</p>
          <button
            type="button"
            onClick={generateTicketCode}
            disabled={genLoading || authLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-heading font-black text-sm tracking-widest uppercase text-white bg-emerald-600 hover:bg-emerald-500 shadow-[0_8px_28px_rgba(16,185,129,0.25)] transition-colors disabled:opacity-60"
          >
            {genLoading ? <Loader2 className="animate-spin" size={18} /> : null}
            Генерирай код за тикет
            {!genLoading ? <ArrowRight size={18} /> : null}
          </button>
          <button type="button" onClick={() => setPhase("browse")} className="mt-4 text-xs text-muted-foreground hover:text-foreground">
            ← Назад
          </button>
        </div>
      )}

      {phase === "code" && ticketCode && (
        <div>
          <p className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-3">
            Твоят код
          </p>
          <div className="rounded-xl border border-primary/30 bg-black/40 p-4 mb-4">
            <p className="font-mono text-xl font-black text-center text-primary break-all select-all">{ticketCode}</p>
            <button
              type="button"
              onClick={copyCode}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-white/10 text-sm font-heading font-semibold hover:bg-white/5"
            >
              <Copy size={16} /> Копирай кода
            </button>
          </div>
          <ol className="text-xs text-muted-foreground font-body space-y-2 mb-5 list-decimal list-inside">
            <li>Отвори канала за тикети в Discord.</li>
            <li>Пусни тикет и изпрати кода по-горе.</li>
            <li>Екипът ще ти изпрати линк/инструкции за плащане.</li>
            <li>След плащането staff маркира поръчката като платена.</li>
          </ol>
          <button
            type="button"
            onClick={() => window.open(DISCORD_SHOP_CHECKOUT_URL, "_blank", "noopener,noreferrer")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-heading font-bold text-sm text-white bg-[#5865F2] hover:bg-[#4752c4] mb-3"
          >
            <ExternalLink size={16} /> Отвори Discord
          </button>
          <button
            type="button"
            onClick={() => {
              setPhase("browse");
              setTicketCode(null);
            }}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-2"
          >
            Затвори
          </button>
        </div>
      )}

      {phase === "browse" && (
        <>
          <p className="text-[10px] font-heading font-black tracking-[0.2em] text-muted-foreground/60 uppercase mb-4">
            Поръчка
          </p>
          <div className="mb-4">
            {isDiscountActive() && (
              <span className="text-sm text-muted-foreground line-through block mb-1">
                {formatPriceEur(item.originalPrice)}
              </span>
            )}
            <div className="text-3xl font-black text-primary font-heading tracking-tight">{getDisplayPrice(item)}</div>
          </div>
          <button
            type="button"
            onClick={startCheckout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-heading font-black text-sm tracking-widest uppercase text-white bg-emerald-600 hover:bg-emerald-500 shadow-[0_8px_28px_rgba(16,185,129,0.25)] transition-colors mb-5"
          >
            <ShoppingCart size={18} /> Поръчай с тикет
          </button>
          {discordLinked && user && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 px-3 py-3 mb-5 space-y-2">
              <p className="text-[10px] font-heading font-bold tracking-widest uppercase text-emerald-400/90">
                Баланс: {formatBalanceEur(shopBalanceCents)}
              </p>
              {couponPreview && couponPreview.final_cents < couponPreview.subtotal_cents && (
                <p className="text-[10px] text-neon-green font-body">
                  С купон: {(couponPreview.final_cents / 100).toFixed(2)} USD
                  <span className="text-muted-foreground line-through ml-2">
                    {(couponPreview.subtotal_cents / 100).toFixed(2)} USD
                  </span>
                </p>
              )}
              <div className="flex gap-1">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Купон (опционално)"
                  className="flex-1 min-w-0 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[10px] font-mono text-foreground"
                  autoComplete="off"
                />
                <button
                  type="button"
                  disabled={!item || couponValidating}
                  onClick={() => item && void validateCouponForCheckout(item.id, getPriceCents(item))}
                  className="shrink-0 px-2 py-1.5 rounded-lg border border-white/15 text-[10px] font-heading font-bold uppercase text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => clearCoupon()}
                  className="shrink-0 px-2 py-1.5 text-[10px] text-muted-foreground hover:text-destructive"
                  title="Изчисти купон"
                >
                  ×
                </button>
              </div>
              {couponValidating && <p className="text-[10px] text-muted-foreground">Проверка на купон…</p>}
              {couponError && <p className="text-[10px] text-destructive">{couponError}</p>}
              <button
                type="button"
                onClick={() => void payWithBalance()}
                disabled={balancePayLoading || authLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-heading font-bold text-xs tracking-widest uppercase border border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
              >
                {balancePayLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                Плати директно от баланс
              </button>
              <p className="text-[10px] text-muted-foreground font-body leading-relaxed">
                Удържа се сумата по промоционалната цена и се записва покупка — без Discord тикет.
                {/* TODO: при Stripe checkout подай същия p_coupon_code към create-payment, когато се поддържа там. */}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground mb-6">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-primary shrink-0" />
              <span>Сигурно плащане</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-primary shrink-0" />
              <span>След плащане — активиране</span>
            </div>
          </div>
          <p className="text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground/50 mb-2">
            Начини за плащане
          </p>
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            Карта, PayPal, Revolut и др. — конкретният линк идва от екипа в Discord след тикета.
          </p>
        </>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 px-4 text-foreground">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary font-heading text-xs tracking-widest uppercase mb-8 transition-colors"
        >
          <ArrowLeft size={14} /> Магазин
        </Link>

        <h1 className="text-center text-3xl md:text-4xl font-black font-heading text-foreground mb-10 md:mb-12 leading-tight">
          {item.name}
        </h1>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-12 items-start">
          <div>
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#121212] flex items-center justify-center min-h-[140px] max-h-[240px] sm:max-h-[260px] md:max-h-[280px] py-4">
              {saleBadge && (
                <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-heading font-black tracking-wider uppercase shadow-lg">
                  {saleBadge}
                </div>
              )}
              <button
                type="button"
                aria-label="Любими"
                onClick={() => setWishlisted((w) => !w)}
                className="absolute top-4 left-4 z-10 h-10 w-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <Heart
                  size={18}
                  className={wishlisted ? "fill-primary text-primary" : "text-white/70"}
                />
              </button>
              <img
                src={gallery[mediaIdx] || item.image}
                alt={item.name}
                className="w-full max-h-[200px] sm:max-h-[220px] md:max-h-[260px] object-contain object-center"
              />
              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Предишна"
                    onClick={() => setMediaIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    type="button"
                    aria-label="Следваща"
                    onClick={() => setMediaIdx((i) => (i + 1) % gallery.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <ChevronRight size={22} />
                  </button>
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {gallery.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Слайд ${i + 1}`}
                        onClick={() => setMediaIdx(i)}
                        className={`h-2 rounded-full transition-all ${
                          i === mediaIdx ? "w-6 bg-primary" : "w-2 bg-white/30 hover:bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={socialButtonClass(s.tone)}
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            )}

            <div className="mt-10 rounded-2xl border border-white/[0.06] bg-[#121212]/60 p-6">
              {item.subtitle ? (
                <p className="text-[10px] font-heading font-bold tracking-[0.25em] text-muted-foreground/50 uppercase mb-2">
                  {item.subtitle}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground font-body leading-relaxed mb-6">{item.longDesc}</p>
              {item.includes.length > 0 && (
                <div>
                  <p className="text-xs font-heading font-bold tracking-widest uppercase text-primary mb-3">Включва</p>
                  <ul className="space-y-2">
                    {item.includes.map((inc, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/85 font-body">
                        <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
                        {inc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-28">{purchaseAside}</div>
        </div>

        {related.length > 0 && phase === "browse" && (
          <div className="mt-16">
            <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-8" />
            <h2 className="font-heading font-black text-lg tracking-widest uppercase text-foreground mb-6">
              Подобни продукти
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/shop/${rel.slug}`}
                  className="rounded-xl overflow-hidden border border-white/8 bg-[#121212]/80 hover:border-primary/40 transition-all duration-300 hover:-translate-y-0.5 group flex flex-col"
                >
                  <div className="bg-white/[0.03] p-5 flex items-center justify-center">
                    <img
                      src={rel.image}
                      alt={rel.name}
                      className="h-28 w-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-heading font-bold text-sm text-foreground/90 group-hover:text-primary transition-colors mb-1">
                      {rel.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-body leading-relaxed flex-1 line-clamp-2">
                      {rel.desc}
                    </p>
                    <div className="font-heading font-black text-base mt-3 text-primary">{getDisplayPrice(rel)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-14 flex justify-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-muted-foreground font-heading font-semibold tracking-widest uppercase text-xs hover:border-primary/40 hover:text-primary transition-all bg-[#121212]/50"
          >
            <Home size={14} /> Начало магазин
          </Link>
        </div>
      </div>
    </main>
  );
}
