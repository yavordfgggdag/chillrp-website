import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageSquareWarning, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth, isDiscordOAuthSession } from "@/hooks/useAuth";
import { formatBalanceEur, useProfileWallet } from "@/hooks/useProfileWallet";

type SmsTier = {
  id: string;
  short_number: string;
  sms_body_template: string;
  display_price_eur: number;
  credit_cents: number;
  sort_order: number;
};

export default function WalletSms() {
  const { user, session } = useAuth();
  const { shopBalanceCents, minecraftUsername, refresh } = useProfileWallet();
  const [tiers, setTiers] = useState<SmsTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [tierId, setTierId] = useState<string>("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void supabase
      .from("sms_tiers")
      .select("id,short_number,sms_body_template,display_price_eur,credit_cents,sort_order")
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          const list = data as SmsTier[];
          setTiers(list);
          if (list.length) setTierId((prev) => prev || list[0].id);
        }
        setLoadingTiers(false);
      });
  }, []);

  const selected = tiers.find((t) => t.id === tierId);
  const usernameForSms =
    minecraftUsername?.trim() ||
    (typeof window !== "undefined" ? localStorage.getItem("tlr_mc_shop_ign")?.trim() : null) ||
    "USERNAME";

  const smsPreview = selected
    ? selected.sms_body_template.replace(/\{USERNAME\}/gi, usernameForSms)
    : "";

  const submit = async () => {
    if (!user?.id) {
      toast.error("Влез с Discord, за да подадеш заявка.");
      return;
    }
    if (!isDiscordOAuthSession(session)) {
      toast.error("Нужен е вход с Discord за споделения баланс.");
      return;
    }
    if (!tierId || !code.trim()) {
      toast.error("Избери ниво и въведи кода от SMS отговора.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("sms_deposit_requests").insert({
        user_id: user.id,
        tier_id: tierId,
        entered_code: code.trim(),
        minecraft_username: usernameForSms === "USERNAME" ? null : usernameForSms,
      });
      if (error) {
        toast.error(error.message || "Грешка при изпращане.");
        return;
      }
      toast.success("Заявката е изпратена. Staff ще я прегледа.");
      setCode("");
      void refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-heading font-black tracking-widest uppercase text-center mb-2">
          <span className="text-foreground">Баланс </span>
          <span className="text-primary text-glow-accent">и SMS</span>
        </h1>
        <p className="text-center text-sm text-muted-foreground font-body mb-10 max-w-xl mx-auto">
          Балансът е общ за акаунта ти (Discord) на всички сайтове към същия проект. Попълни заявка след изпратен SMS — екипът
          потвърждава вручно.
        </p>

        <div className="glass border border-primary/25 rounded-2xl p-6 mb-8 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
            <Smartphone size={24} />
          </div>
          <div>
            <div className="text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground">Текущ баланс</div>
            <div className="text-2xl font-heading font-black text-foreground">{formatBalanceEur(shopBalanceCents)}</div>
          </div>
        </div>

        <div className="rounded-xl border border-neon-yellow/30 bg-neon-yellow/5 px-4 py-3 text-xs text-neon-yellow font-body mb-8 flex gap-2">
          <MessageSquareWarning className="shrink-0 mt-0.5" size={16} />
          <span>
            Мобилният оператор може да начисли такса към номера за кратки съобщения. Провери цената при своя доставчик. Ние не
            валидираме автоматично SMS без договор с оператор — v1 е с ръчно одобрение от staff.
          </span>
        </div>

        {loadingTiers ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <h2 className="text-sm font-heading font-black tracking-widest uppercase text-muted-foreground mb-3">Нива</h2>
            <div className="grid sm:grid-cols-3 gap-3 mb-8">
              {tiers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTierId(t.id)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    tierId === t.id ? "border-primary bg-primary/10" : "border-white/10 bg-black/20 hover:border-white/20"
                  }`}
                >
                  <div className="text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">
                    Номер {t.short_number}
                  </div>
                  <div className="font-heading font-black text-lg text-primary">€{Number(t.display_price_eur).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Кредит: {formatBalanceEur(t.credit_cents)}</div>
                </button>
              ))}
            </div>

            {selected && (
              <div className="glass border border-white/10 rounded-xl p-4 mb-6 text-sm font-body text-muted-foreground">
                <span className="font-heading font-bold text-foreground uppercase text-xs tracking-widest block mb-2">
                  Текст на SMS
                </span>
                <code className="block font-mono text-primary break-all">{smsPreview}</code>
                <span className="block mt-2 text-xs">Изпрати към {selected.short_number}</span>
              </div>
            )}

            <label className="block text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1.5">
              Код / референция от отговора
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/30 text-foreground font-mono text-sm mb-4 focus:border-primary/50 focus:outline-none"
              placeholder="Въведи кода, който получи след SMS"
            />
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting || !user}
              className="w-full py-3.5 rounded-xl font-heading font-black text-sm tracking-widest uppercase bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40"
            >
              {submitting ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Изпрати заявка"}
            </button>
            {!user && (
              <p className="text-center text-xs text-muted-foreground mt-3">Влез с Discord, за да изпратиш заявка.</p>
            )}
          </>
        )}

        <div className="mt-10 text-center">
          <Link to="/shop" className="text-sm text-primary font-heading font-semibold uppercase tracking-widest hover:underline">
            Към магазина
          </Link>
        </div>
      </div>
    </div>
  );
}
