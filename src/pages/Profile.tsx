import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { User, ShoppingBag, FileText, Clock, CheckCircle, XCircle, Euro, Gamepad2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

export default function Profile() {
  const { user, loading, discordUsername } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    Promise.all([
      supabase.from("purchases").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("gang_applications").select("id,name,gang_type,status,submitted_at,admin_note").eq("user_id", user.id).order("submitted_at", { ascending: false }),
    ]).then(([p, a]) => {
      if (p.data) setPurchases(p.data as Purchase[]);
      if (a.data) setApps(a.data as Application[]);
      setFetching(false);
    });
  }, [user]);

  const statusColor = (s: string) =>
    s === "pending" ? "text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10" :
    s === "approved" ? "text-neon-green border-neon-green/30 bg-neon-green/10" :
    "text-neon-red border-neon-red/30 bg-neon-red/10";
  const statusLabel = (s: string) =>
    s === "pending" ? "⏳ Изчакване" : s === "approved" ? "✅ Одобрено" : "❌ Отказано";
  const statusIcon = (s: string) =>
    s === "pending" ? <Clock size={14} /> : s === "approved" ? <CheckCircle size={14} /> : <XCircle size={14} />;

  if (loading) return (
    <div className="min-h-screen bg-background pt-28 flex items-center justify-center">
      <div className="text-muted-foreground font-body text-sm">Зарежда...</div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-background pt-28 flex items-center justify-center px-4">
      <div className="glass border border-white/10 rounded-2xl p-10 text-center max-w-sm w-full">
        <User size={40} className="text-neon-purple mx-auto mb-4" />
        <h1 className="font-heading font-black text-xl tracking-widest uppercase text-foreground mb-2">Моят Профил</h1>
        <p className="text-muted-foreground font-body text-sm">Вход в профила ще бъде наличен скоро.</p>
      </div>
    </div>
  );

  const totalSpent = purchases.reduce((s, p) => s + (p.price_eur || 0), 0);

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container mx-auto max-w-3xl px-4">

        {/* Header */}
        <div className="glass border border-neon-purple/25 rounded-2xl p-6 mb-8 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-neon-purple/15 border border-neon-purple/30 flex items-center justify-center shrink-0">
            <User size={24} className="text-neon-purple" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-heading font-black text-lg tracking-wider text-foreground truncate">
              {user.email?.split("@")[0]}
            </div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{user.email}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-neon-green font-heading font-bold uppercase tracking-widest">✓ Работи за профила</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Gamepad2 size={12} className="text-neon-purple" />
              {discordUsername ? (
                <span className="text-xs text-neon-purple font-heading font-bold">{discordUsername}</span>
              ) : (
                <span className="text-xs text-muted-foreground font-body">Влез с Discord за да се свърже профилът</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-heading font-black text-neon-green">€{totalSpent.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground font-heading tracking-widest uppercase">Общо похарчено</div>
          </div>
        </div>

        {fetching ? (
          <div className="text-center py-16 text-muted-foreground font-body text-sm">Зарежда данните...</div>
        ) : (
          <div className="space-y-8">

            {/* Purchases */}
            <section>
              <h2 className="flex items-center gap-2 text-sm font-heading font-black tracking-widest uppercase text-muted-foreground mb-3">
                <ShoppingBag size={14} /> Мои Покупки ({purchases.length})
              </h2>
              {purchases.length === 0 ? (
                <div className="glass border border-white/8 rounded-xl p-8 text-center text-muted-foreground font-body text-sm">
                  Нямаш покупки все още.{" "}
                  <Link to="/shop" className="text-neon-purple hover:underline">Разгледай магазина →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {purchases.map((p) => (
                    <div key={p.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0">
                        <ShoppingBag size={13} className="text-neon-purple" />
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
                  <Link to="/gangs" className="text-neon-purple hover:underline">Кандидатствай за генг →</Link>
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
