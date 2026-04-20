import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { User, ShoppingBag, FileText, Clock, CheckCircle, XCircle, Euro, Gamepad2, BadgeCheck, RefreshCw, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRefetchOnVisible } from "@/hooks/useRefetchOnVisible";
import { toast } from "sonner";
import { formatBalanceEur, useProfileWallet } from "@/hooks/useProfileWallet";

type Purchase = {
  id: string;
  product_name: string;
  category: string | null;
  price_eur: number | null;
  discord_username: string | null;
  created_at: string;
};

type Application = {
  id: string;
  name: string;
  gang_type: string;
  status: string;
  submitted_at: string;
  admin_note: string | null;
};

type RevolutOrderRow = {
  id: string;
  reference: string;
  amount_eur: number;
  summary: string;
  status: string;
  created_at: string;
  payment_method?: string | null;
};

export default function Profile() {
  const { user, loading, discordUsername, siteRole, siteRoleLoading, siteRoleError, refreshSiteRole } = useAuth();
  const { shopBalanceCents } = useProfileWallet();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [fetching, setFetching] = useState(false);
  const [roleRefreshBusy, setRoleRefreshBusy] = useState(false);
  const [qbCitizenId, setQbCitizenId] = useState("");
  const [qbCitizenSaving, setQbCitizenSaving] = useState(false);
  const [revolutOrders, setRevolutOrders] = useState<RevolutOrderRow[]>([]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    Promise.all([
      supabase.from("purchases").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("gang_applications").select("id,name,gang_type,status,submitted_at,admin_note").eq("user_id", user.id).order("submitted_at", { ascending: false }),
      supabase.from("profiles").select("qb_citizenid").eq("id", user.id).maybeSingle(),
      supabase
        .from("pending_revolut_payments")
        .select("id,reference,amount_eur,summary,status,created_at,payment_method")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]).then(([p, a, prof, rev]) => {
      if (p.data) setPurchases(p.data as Purchase[]);
      if (a.data) setApps(a.data as Application[]);
      const row = prof.data as { qb_citizenid?: string | null } | null;
      if (row?.qb_citizenid) setQbCitizenId(row.qb_citizenid);
      if (rev.data && !rev.error) setRevolutOrders(rev.data as RevolutOrderRow[]);
      setFetching(false);
    });
  }, [user?.id]);

  useRefetchOnVisible(
    () => {
      void refreshSiteRole();
    },
    !!user,
    { minIntervalMs: 120_000 },
  );

  const statusColor = (s: string) =>
    s === "pending" ? "text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10" :
    s === "approved" ? "text-neon-green border-neon-green/30 bg-neon-green/10" :
    "text-destructive border-destructive/30 bg-destructive/10";
  const statusLabel = (s: string) =>
    s === "pending" ? "⏳ Изчакване" : s === "approved" ? "✅ Одобрено" : "❌ Отказано";
  const statusIcon = (s: string) =>
    s === "pending" ? <Clock size={14} /> : s === "approved" ? <CheckCircle size={14} /> : <XCircle size={14} />;

  const revolutStatusClass = (s: string) =>
    s === "awaiting_transfer"
      ? "text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10"
      : s === "completed"
        ? "text-neon-green border-neon-green/30 bg-neon-green/10"
        : "text-muted-foreground border-white/15 bg-white/5";
  const revolutStatusLabel = (s: string) =>
    s === "awaiting_transfer" ? "⏳ Чака превод" : s === "completed" ? "✅ Потвърдено" : s === "cancelled" ? "Отказано" : s;

  if (loading) return (
    <div className="min-h-screen bg-background pt-28 flex items-center justify-center">
      <div className="text-muted-foreground font-body text-sm">Зарежда...</div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-background pt-28 flex items-center justify-center px-4">
      <div className="glass border border-white/10 rounded-2xl p-10 text-center max-w-sm w-full">
        <User size={40} className="text-primary mx-auto mb-4" />
        <h1 className="font-heading font-black text-xl tracking-widest uppercase text-foreground mb-2">Моят Профил</h1>
        <p className="text-muted-foreground font-body text-sm">Вход в профила ще бъде наличен скоро.</p>
      </div>
    </div>
  );

  const totalSpent = purchases.reduce((s, p) => s + (p.price_eur || 0), 0);

  async function saveQbCitizenId() {
    if (!user) return;
    const v = qbCitizenId.trim();
    if (v.length < 3 || v.length > 16 || /\s/.test(v)) {
      toast.error("Citizen ID трябва да е 3–16 символа без интервали (като в QB).");
      return;
    }
    setQbCitizenSaving(true);
    const { error } = await supabase.from("profiles").update({ qb_citizenid: v }).eq("id", user.id);
    setQbCitizenSaving(false);
    if (error) {
      toast.error("Неуспешен запис: " + error.message);
      return;
    }
    toast.success("Citizen ID е запазен.");
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container mx-auto max-w-3xl px-4">
        <Link
          to="/wallet"
          className="glass border border-emerald-500/25 rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 hover:border-emerald-400/45 transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Wallet size={20} />
            </div>
            <div>
              <div className="text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground">Магазин баланс</div>
              <div className="text-xl font-heading font-black text-foreground">{formatBalanceEur(shopBalanceCents)}</div>
              <p className="text-[11px] text-muted-foreground font-body mt-0.5">SMS зареждане и история — отвори страницата.</p>
            </div>
          </div>
          <span className="text-xs font-heading font-bold text-primary uppercase tracking-widest shrink-0 group-hover:underline">
            Управление
          </span>
        </Link>

        {/* Header */}
        <div className="glass border border-primary/25 rounded-2xl p-6 mb-8 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <User size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-heading font-black text-lg tracking-wider text-foreground truncate">
              {user.email?.split("@")[0]}
            </div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{user.email}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <Gamepad2 size={12} className="text-primary" />
              {discordUsername ? (
                <span className="text-xs text-primary font-heading font-bold">{discordUsername}</span>
              ) : (
                <span className="text-xs text-muted-foreground font-body">Влез с Discord за да се свърже профилът</span>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <BadgeCheck size={12} className="text-primary" />
                  <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-muted-foreground">Discord роли (сайт)</span>
                </div>
                <button
                  type="button"
                  disabled={roleRefreshBusy || siteRoleLoading || !user}
                  onClick={async () => {
                    setRoleRefreshBusy(true);
                    try {
                      await refreshSiteRole();
                    } finally {
                      setRoleRefreshBusy(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-white/25 disabled:opacity-40"
                >
                  <RefreshCw size={10} className={roleRefreshBusy ? "animate-spin" : ""} />
                  Обнови от Discord
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/80 font-body mb-1.5">Staff / Administrator за достъп до админ инструменти на сайта.</p>
              {siteRoleLoading ? (
                <div className="text-[10px] text-muted-foreground font-body">Зареждане...</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {siteRole === "administrator" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/15 border border-primary/30 text-[10px] font-heading font-bold text-primary uppercase tracking-wider">
                      Администратор
                    </span>
                  )}
                  {siteRole === "staff" && siteRole !== "administrator" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neon-yellow/15 border border-neon-yellow/30 text-[10px] font-heading font-bold text-neon-yellow uppercase tracking-wider">
                      Staff
                    </span>
                  )}
                  {siteRole !== "staff" && siteRole !== "administrator" && (
                    <span className="text-[10px] text-muted-foreground font-body">
                      {siteRoleError === "not_in_guild"
                        ? "Не си член на Discord сървъра. Влез в сървъра и опитай отново."
                        : siteRoleError === "no_matching_role"
                          ? "Няма разпозната staff роля в Discord за този сайт. Виж настройките на check-site-role в Supabase."
                          : siteRoleError === "not_discord"
                            ? "Влез с Discord за да виждаш ролите си."
                            : siteRoleError === "server_config" || siteRoleError === "discord_api_error"
                              ? "Проверката на роли е временно недостъпна. Провери Supabase Secrets."
                              : "Нямаш staff роля за сайта"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-heading font-black text-neon-green">€{totalSpent.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground font-heading tracking-widest uppercase">Общо похарчено</div>
          </div>
        </div>

        {/* QB citizenid — автоматично GC след Stripe (виж STRIPE_SETUP.md) */}
        <div className="glass border border-neon-cyan/20 rounded-2xl p-5 mb-8">
          <h2 className="text-xs font-heading font-black tracking-widest uppercase text-neon-cyan mb-1">
            In-game идентификатор (QB)
          </h2>
          <p className="text-[11px] text-muted-foreground font-body mb-3">
            Въведи <strong className="text-foreground/90">citizenid</strong> на твоя персонаж (QB — както в <code className="text-[10px] bg-white/5 px-1 rounded">players</code>).
            Полезно е за награди в играта, ако ползваш плащания, свързани с акаунта ти — влез с{" "}
            <strong className="text-foreground/90">Discord</strong> и попълни тук или го запиши от сървъра (виж{" "}
            <code className="text-[10px] bg-white/5 px-1 rounded">docs/CITIZENID_FROM_GAME.md</code>).
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={qbCitizenId}
              onChange={(e) => setQbCitizenId(e.target.value.replace(/\s/g, ""))}
              placeholder="напр. ABC12345"
              className="flex-1 rounded-xl border border-white/10 bg-background/60 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50"
              maxLength={16}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={saveQbCitizenId}
              disabled={qbCitizenSaving}
              className="shrink-0 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 text-xs font-heading font-bold uppercase tracking-wider text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-50"
            >
              {qbCitizenSaving ? "Запис…" : "Запази"}
            </button>
          </div>
        </div>

        {fetching ? (
          <div className="text-center py-16 text-muted-foreground font-body text-sm">Зарежда данните...</div>
        ) : (
          <div className="space-y-8">

            {/* Revolut / PayPal (ръчни поръчки) */}
            <section>
              <h2 className="flex items-center gap-2 text-sm font-heading font-black tracking-widest uppercase text-muted-foreground mb-3">
                <Landmark size={14} /> Revolut / PayPal
              </h2>
              {revolutOrders.length === 0 ? (
                <div className="glass border border-white/8 rounded-xl p-6 text-center text-muted-foreground font-body text-sm">
                  Нямаш записани ръчни поръчки. При плащане с Revolut / PayPal през сайта референцията и детайлите се пазят тук.
                </div>
              ) : (
                <div className="space-y-2">
                  {revolutOrders.map((r) => (
                    <div key={r.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-neon-cyan">{r.reference}</span>
                          {r.payment_method === "paypal" ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-heading font-bold">PayPal</span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-heading font-bold">Revolut</span>
                          )}
                        </div>
                        <div className="text-xs text-foreground/90 font-body mt-1">{r.summary}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {new Date(r.created_at).toLocaleString("bg-BG")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-heading font-black text-neon-green">€{Number(r.amount_eur).toFixed(2)}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-heading font-bold tracking-wider ${revolutStatusClass(r.status)}`}
                        >
                          {revolutStatusLabel(r.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Purchases */}
            <section>
              <h2 className="flex items-center gap-2 text-sm font-heading font-black tracking-widest uppercase text-muted-foreground mb-3">
                <ShoppingBag size={14} /> Мои Покупки ({purchases.length})
              </h2>
              {purchases.length === 0 ? (
                <div className="glass border border-white/8 rounded-xl p-8 text-center text-muted-foreground font-body text-sm">
                  Нямаш записани покупки.{" "}
                  <Link to="/shop" className="text-primary hover:underline">
                    Виж магазина →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {purchases.map((p) => (
                    <div key={p.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <ShoppingBag size={13} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-semibold text-sm text-foreground truncate">{p.product_name}</div>
                        <div className="text-xs text-muted-foreground font-body mt-0.5">
                          {p.category || "—"} • {new Date(p.created_at).toLocaleDateString("bg-BG")}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1 text-neon-green font-heading font-black text-sm">
                        <Euro size={11} />
                        {p.price_eur != null ? p.price_eur.toFixed(2) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Gang Applications */}
            <section>
              <h2 className="flex items-center gap-2 text-sm font-heading font-black tracking-widest uppercase text-muted-foreground mb-3">
                <FileText size={14} /> Мои Кандидатури ({apps.length})
              </h2>
              {apps.length === 0 ? (
                <div className="glass border border-white/8 rounded-xl p-8 text-center text-muted-foreground font-body text-sm">
                  Нямаш подадени кандидатури.{" "}
                  <Link to="/applications" className="text-primary hover:underline">Кандидатства за екип / фракция →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {apps.map((a) => (
                    <div key={a.id} className="glass border border-white/8 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-heading font-bold tracking-wider text-foreground text-sm">{a.name}</div>
                          <div className="text-xs text-muted-foreground font-body">{a.gang_type} • {new Date(a.submitted_at).toLocaleDateString("bg-BG")}</div>
                        </div>
                        <span className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-heading font-bold tracking-wider ${statusColor(a.status)}`}>
                          {statusIcon(a.status)} {statusLabel(a.status)}
                        </span>
                      </div>
                      {a.admin_note && (
                        <div className="mt-2 px-3 py-2 rounded-lg glass border border-white/5 text-xs font-body text-foreground/70">
                          <span className="text-muted-foreground font-heading font-semibold uppercase text-[10px] tracking-widest">Бележка: </span>
                          {a.admin_note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
