import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Users, AlertTriangle, CheckCircle, FileText, Shield, Zap, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { DISCORD_INVITE, SITE_NAME } from "@/lib/config";
import { Link } from "react-router-dom";
import { areGangApplicationsOpen } from "@/lib/gangApplicationsSettings";

interface SectionProps {
  emoji: string;
  title: string;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ emoji, title, color, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const colorMap: Record<string, { border: string; text: string; bg: string }> = {
    cyan: { border: "border-neon-cyan/30", text: "text-neon-cyan", bg: "bg-neon-cyan/8" },
    accent: { border: "border-primary/30", text: "text-primary", bg: "bg-primary/8" },
    purple: { border: "border-primary/30", text: "text-primary", bg: "bg-primary/8" },
    green: { border: "border-neon-green/30", text: "text-neon-green", bg: "bg-neon-green/8" },
    yellow: { border: "border-neon-yellow/30", text: "text-neon-yellow", bg: "bg-neon-yellow/8" },
    white: { border: "border-white/15", text: "text-foreground", bg: "bg-white/4" },
  };
  const c = colorMap[color] || colorMap.white;
  return (
    <div className={`glass border ${c.border} rounded-xl overflow-hidden`}>
      <button
        className={`w-full flex items-center gap-3 px-6 py-4 hover:opacity-90 transition-opacity`}
        onClick={() => setOpen(!open)}
      >
        <span className="text-xl">{emoji}</span>
        <span className={`font-heading font-bold tracking-wider uppercase text-base flex-1 ${c.text} text-left`}>
          {title}
        </span>
        {open ? <ChevronUp size={18} className={c.text} /> : <ChevronDown size={18} className={c.text} />}
      </button>
      {open && <div className="px-6 py-5 space-y-3 border-t border-white/5">{children}</div>}
    </div>
  );
}

function Bullet({ children, color = "accent" }: { children: React.ReactNode; color?: string }) {
  const c =
    color === "green"
      ? "text-neon-green"
      : color === "yellow"
        ? "text-neon-yellow"
        : color === "cyan"
          ? "text-neon-cyan"
          : "text-primary";
  return (
    <div className="flex items-start gap-2.5 text-sm font-body text-foreground/80 leading-relaxed">
      <span className={`${c} mt-0.5 shrink-0`}>•</span>
      <span>{children}</span>
    </div>
  );
}

const factionArchetypes = [
  { name: "Warband", emoji: "⚔️", color: "text-emerald-300", desc: "PvP фокус" },
  { name: "Traders", emoji: "💰", color: "text-amber-200", desc: "Икономика" },
  { name: "Builders", emoji: "🏛️", color: "text-sky-300", desc: "Територия / база" },
  { name: "Nomads", emoji: "🧭", color: "text-emerald-300", desc: "Мобилна игра" },
  { name: "Alliance", emoji: "🤝", color: "text-violet-300", desc: "Дипломация" },
];

const initialForm = {
  name: "",
  gang_type: "",
  leader: "",
  members: "",
  goal: "",
  history: "",
  rules: "",
  rp_examples: "",
  discord_username: "",
};

function TA({ label, name, value, onChange, rows = 3, required = true }: { label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; rows?: number; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1.5">
        {label}
        {required && " *"}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        required={required}
        className="w-full px-4 py-2.5 rounded-xl glass border border-white/8 focus:border-primary/50 focus:outline-none text-sm font-body text-foreground placeholder:text-muted-foreground bg-transparent resize-none"
      />
    </div>
  );
}

function FI({ label, name, value, onChange, placeholder = "", required = true }: { label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1.5">
        {label}
        {required && " *"}
      </label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-2.5 rounded-xl glass border border-white/8 focus:border-primary/50 focus:outline-none text-sm font-body text-foreground placeholder:text-muted-foreground bg-transparent"
      />
    </div>
  );
}

const isDev = typeof import.meta !== "undefined" && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

export default function GangApplications() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [testDmLoading, setTestDmLoading] = useState(false);
  const [applicationsOpen, setApplicationsOpen] = useState(true);
  const [gangSettingsLoading, setGangSettingsLoading] = useState(true);
  const [closedMessageCustom, setClosedMessageCustom] = useState("");

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["gang_applications_open", "gang_applications_closed_message"])
      .then(({ data }) => {
        if (cancelled) return;
        const row = (k: string) => data?.find((x) => x.key === k)?.value;
        setApplicationsOpen(areGangApplicationsOpen(row("gang_applications_open")));
        setClosedMessageCustom((row("gang_applications_closed_message") || "").trim());
        setGangSettingsLoading(false);
      })
      .catch(() => {
        if (!cancelled) setGangSettingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const { user, discordUsername, discordId } = useAuth();
  const logActivity = useActivityLogger();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationsOpen) {
      toast.error("В момента не приемаме нови кандидатури за фракции.");
      return;
    }
    if (!user) {
      toast.error("Трябва да влезеш в акаунта си!");
      return;
    }
    if (!discordUsername) {
      toast.info("Влез с Discord за да кандидатстваш.");
      return;
    }
    if (
      !form.name ||
      !form.gang_type ||
      !form.leader ||
      !form.members ||
      !form.goal ||
      !form.history ||
      !form.rules ||
      !form.rp_examples
    ) {
      toast.error("Попълни всички задължителни полета!");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("gang_applications").insert([
      {
        ...form,
        discord_username: discordUsername,
        status: "pending",
        user_id: user?.id || null,
        submitted_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      toast.error("Грешка при изпращане. Опитай отново.");
      console.error(error);
    } else {
      // Discord нотификация (само извън localhost, за да няма CORS)
      const isLocalhost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.origin.startsWith("http://127.0.0.1"));
      if (!isLocalhost) {
        const discordForNotify = discordUsername || form.discord_username || "";
        try {
          await supabase.functions.invoke("notify-discord-gang", {
            body: {
              name: form.name,
              leader: form.leader,
              gang_type: form.gang_type,
              members: form.members,
              discord_username: discordForNotify,
            },
          });
        } catch (err) {
          console.warn("Discord нотификацията не беше изпратена:", err);
        }
        if (discordForNotify || discordId) {
          try {
            // Let supabase-js fetchWithAuth set Authorization (session JWT or anon key fallback).
            await supabase.functions.invoke("notify-discord-dm", {
              body: {
                discord_username: discordForNotify,
                discord_id: discordId,
                gang_name: form.name,
                status: "submitted",
              },
            });
          } catch (err) {
            console.warn("Discord DM до кандидата не беше изпратен:", err);
          }
        }
      }
      setSubmitted(true);
      logActivity("gang_submit", `📨 Кандидатура: "${form.name}" | Тип: ${form.gang_type} | Лидер: ${form.leader} | Discord: ${form.discord_username}`);
      toast.success("✅ Заявката е изпратена! Ще се свържем с теб.");
    }
    setSubmitting(false);
  };

  const sendTestDm = async () => {
    if (!discordUsername && !discordId) {
      toast.error("Няма Discord потребител за тест.");
      return;
    }
    if (!user) {
      toast.error("Влез в акаунта си за тест ЛС.");
      return;
    }
    setTestDmLoading(true);
    try {
      await supabase.auth.refreshSession();
      const { data, error } = await supabase.functions.invoke("notify-discord-dm", {
        body: {
          discord_username: discordUsername,
          discord_id: discordId,
          gang_name: `Тест (${SITE_NAME})`,
          status: "submitted",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Тестовото ЛС е изпратено! Провери личните съобщения в Discord.");
    } catch (err) {
      const response =
        err && typeof err === "object" && "context" in err
          ? (err as { context?: Response }).context
          : undefined;
      const status = typeof response?.status === "number" ? response.status : undefined;
      const msg = err instanceof Error ? err.message : String(err);
      const is401 = status === 401;
      if (is401) {
        toast.error(
          "401: Supabase блокира заявката (JWT). В Dashboard → Edge Functions → notify-discord-dm → Details изключи „Verify JWT with legacy secret“, Save. Или деплойни с актуален supabase/config.toml (notify-discord-dm: verify_jwt = false)."
        );
        return;
      }
      const isNon2xx = typeof msg === "string" && msg.includes("non-2xx");
      if (isNon2xx) {
        toast.error(
          "Тест ЛС не успя: функцията върна грешка. Провери дали си в Discord сървъра TLR, дали ботът има „Message Content“/DM права, и Secrets: DISCORD_BOT_TOKEN, DISCORD_GUILD_ID. Ако виждаш 401 — виж съобщението за Verify JWT по-горе."
        );
      } else {
        toast.error("Тест ЛС не успя: " + msg);
      }
    } finally {
      setTestDmLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(160_84%_39%/0.1)_0%,transparent_60%)]" />
        <div className="container mx-auto max-w-4xl relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-heading font-bold tracking-widest uppercase mb-6">
            Кандидатури
          </div>
          <h1 className="text-4xl md:text-6xl font-heading font-black tracking-widest uppercase mb-4">
            <span className="text-foreground">{SITE_NAME}</span>
            <br />
            <span className="gradient-text-accent">Присъедини се</span>
          </h1>
          <p className="text-muted-foreground font-body text-base max-w-2xl mx-auto">
            Екип, билдъри, whitelist и фракции — по-долу е формата за регистрация на фракция. За останалите роли отвори тикет в Discord.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 pb-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { t: "Staff", d: "Модерация и поддръжка на общността.", href: DISCORD_INVITE, external: true },
            { t: "Builder", d: "Официална форма за Builder кандидатура.", href: "/applications/builder", external: false },
            { t: "Helper", d: "Официална форма за Helper кандидатура.", href: "/applications/helper", external: false },
            { t: "Whitelist", d: "Достъп при затворен сървър.", href: DISCORD_INVITE, external: true },
            { t: "Creator / Partner", d: "Съдържание и колаборации.", href: DISCORD_INVITE, external: true },
          ].map((c) =>
            c.external ? (
              <a
                key={c.t}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="glass border border-white/10 rounded-xl p-4 text-left hover:border-primary/30 transition-colors block"
              >
                <div className="font-heading font-black text-sm tracking-widest uppercase text-foreground mb-1">{c.t}</div>
                <p className="text-xs text-muted-foreground font-body">{c.d}</p>
                <span className="text-[10px] font-heading text-primary mt-2 inline-block tracking-widest uppercase">Discord →</span>
              </a>
            ) : (
              <Link
                key={c.t}
                to={c.href}
                className="glass border border-white/10 rounded-xl p-4 text-left hover:border-primary/30 transition-colors block"
              >
                <div className="font-heading font-black text-sm tracking-widest uppercase text-foreground mb-1">{c.t}</div>
                <p className="text-xs text-muted-foreground font-body">{c.d}</p>
                <span className="text-[10px] font-heading text-primary mt-2 inline-block tracking-widest uppercase">Форма →</span>
              </Link>
            ),
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground font-body">
          Формата по-долу е за <Link to="/applications#faction" className="text-primary hover:underline">Faction registration</Link>.
        </p>
      </div>

      <div className="container mx-auto max-w-4xl px-4 pb-20 space-y-4">
        {/* Info */}
        <Section emoji="⚔️" title="Faction registration" color="accent" defaultOpen>
          <div className="glass border border-primary/20 rounded-lg p-4 space-y-3 text-sm font-body text-foreground/80">
            <p>
              <span className="text-primary font-bold">📌 Условие:</span> Попълни формата с ясна концепция за фракцията
              във Factions режима. Одобрение след преглед от екипа.
            </p>
            <div className="sep-accent" />
            <div className="text-xs font-heading font-bold tracking-widest uppercase text-neon-green mb-2">
              🎁 При одобрение
            </div>
            <Bullet color="green">Слот във Factions мета (според конфигурацията на сървъра)</Bullet>
            <Bullet color="green">Достъп до фракционни канали в Discord (ако се ползват)</Bullet>
            <Bullet color="green">Участие в рейдове и територии по правилата</Bullet>
          </div>
        </Section>

        <Section emoji="①" title="Минимални изисквания" color="yellow">
          <Bullet color="yellow">Уникално име на фракцията в играта</Bullet>
          <Bullet color="yellow">Лидер + ядро от играчи (брой по правилата на сезона)</Bullet>
          <Bullet color="yellow">Ясна тема: PvP, търговия, строителство и т.н.</Bullet>
          <Bullet color="yellow">Съгласие с Factions и общите правила</Bullet>
          <div className="mt-2 text-xs text-primary font-body glass border border-primary/20 rounded-lg px-3 py-2">
            ⚠️ Без активност фракцията може да бъде архивирана.
          </div>
        </Section>

        <Section emoji="②" title="Какво да опишеш" color="accent">
          {["История / мотивация", "Цели в PvP и/или икономика", "Вътрешни правила", "Примерни ситуации в играта", "План за първите седмици"].map((i) => (
            <Bullet key={i}>{i}</Bullet>
          ))}
          <div className="mt-2 glass border border-primary/20 rounded-lg px-3 py-2 text-sm text-primary font-semibold">
            ✍️ Добави поне 2 примера как играете заедно.
          </div>
        </Section>

        <Section emoji="③" title="Лимити (ориентир)" color="accent">
          <Bullet color="accent">Един основен акаунт = една лидерска роля (освен ако екипът не каже друго)</Bullet>
          <Bullet color="accent">Без токсичност и meta-gaming извън правилата</Bullet>
          <Bullet color="accent">Съюзи и наемници — според сезонните лимити</Bullet>
        </Section>

        <div className="glass border border-white/8 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <span className="text-xl">④</span>
            <h3 className="font-heading font-bold tracking-wider uppercase text-base text-foreground">
              Примери за архетипи (не са задължителни)
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {factionArchetypes.map((g) => (
              <div key={g.name} className="glass border border-white/8 rounded-xl p-4 flex items-center gap-3">
                <span className="text-xl">{g.emoji}</span>
                <div>
                  <div className={`font-heading font-bold tracking-wider text-sm ${g.color}`}>{g.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{g.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Section emoji="⑤" title="Очаквания от екипа" color="white">
          <Bullet>Активна комуникация в Discord при промени</Bullet>
          <Bullet>Участие в евенти и сезонни цели</Bullet>
          <Bullet>Уважение към противници и правилата на рейда</Bullet>
        </Section>

        <Section emoji="⑥" title="Какво НЕ приемаме" color="accent">
          <Bullet color="accent">„Искам фракция само за токсичност“</Bullet>
          <Bullet color="accent">Копирани концепции от други сървъри без адаптация</Bullet>
          <Bullet color="accent">Празни форми без детайли</Bullet>
        </Section>

        <div id="faction" className="glass border border-primary/30 rounded-xl overflow-hidden scroll-mt-28">
          <div className="px-6 py-4 bg-primary/10 border-b border-primary/20 flex items-center gap-3">
            <span className="text-xl">⑦</span>
            <h3 className="font-heading font-bold tracking-wider uppercase text-base text-primary flex items-center gap-2">
              <FileText size={18} /> Формат на кандидатурата
            </h3>
          </div>

          {gangSettingsLoading ? (
            <div className="p-10 text-center text-muted-foreground font-body text-sm">Зареждане...</div>
          ) : !applicationsOpen ? (
            <div className="p-8 sm:p-10 space-y-4">
              <div className="flex items-start gap-4 rounded-xl border border-neon-yellow/35 bg-neon-yellow/10 p-5">
                <AlertTriangle className="text-neon-yellow shrink-0 mt-0.5" size={28} />
                <div className="text-left space-y-2">
                  <h3 className="text-lg font-heading font-black tracking-wider uppercase text-foreground">
                    Кандидатурите за фракции са затворени
                  </h3>
                  {closedMessageCustom ? (
                    <p className="text-sm font-body text-foreground/85 whitespace-pre-wrap leading-relaxed">{closedMessageCustom}</p>
                  ) : (
                    <p className="text-sm font-body text-foreground/85 leading-relaxed">
                      В момента не приемаме нови кандидатури за фракции. Следете{" "}
                      <a
                        href={DISCORD_INVITE}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-semibold underline underline-offset-2 hover:text-primary/90"
                      >
                        Discord на {SITE_NAME}
                      </a>
                      — ще обявим, когато отворим отново места.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : submitted ? (
            <div className="p-10 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-2xl font-heading font-black tracking-widest uppercase text-emerald-400 mb-2">
                Заявката е изпратена!
              </h3>
              <p className="text-muted-foreground font-body">Ще разгледаме концепцията ти и ще се свържем в Discord.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <FI
                  label="1. Име на организацията"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder="Име на фракцията в играта"
                />
                <div>
                  <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1.5">
                    Тип организация *
                  </label>
                  <select
                    name="gang_type"
                    value={form.gang_type}
                    onChange={onChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl glass border border-white/8 focus:border-primary/50 focus:outline-none text-sm font-body text-foreground bg-background"
                  >
                    <option value="">Избери...</option>
                    {factionArchetypes.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <FI label="3. Имена на Лидера" name="leader" value={form.leader} onChange={onChange} />
                <FI label="4. Имена на Членовете" name="members" value={form.members} onChange={onChange} />
              </div>
              <div className="glass border border-white/8 rounded-xl px-4 py-3">
                <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">
                  Discord Username
                </label>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-heading font-bold text-primary">
                    {discordUsername || <span className="text-muted-foreground">Влез с Discord за да кандидатстваш</span>}
                  </span>
                  {isDev && discordUsername && (
                    <button
                      type="button"
                      onClick={sendTestDm}
                      disabled={testDmLoading}
                      className="px-3 py-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 text-amber-400 text-xs font-heading font-bold hover:bg-amber-500/25 disabled:opacity-50"
                    >
                      {testDmLoading ? "Изпращане..." : "🧪 Тест ЛС"}
                    </button>
                  )}
                </div>
              </div>
              <TA label="2. Цел на организацията" name="goal" value={form.goal} onChange={onChange} rows={2} />
              <TA
                label="5. История на организацията"
                name="history"
                value={form.history}
                onChange={onChange}
                rows={4}
              />
              <TA
                label="6. Правила вътре в организацията"
                name="rules"
                value={form.rules}
                onChange={onChange}
                rows={3}
              />
              <TA
                label="7. Примери от играта (минимум 2 ситуации)"
                name="rp_examples"
                value={form.rp_examples}
                onChange={onChange}
                placeholder="Опиши как играете заедно: рейд, база, дипломация…"
                rows={5}
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border border-primary/60 bg-primary/18 text-foreground font-heading font-black tracking-widest uppercase hover:bg-primary/30 glow-accent transition-all disabled:opacity-50"
              >
                <Send size={16} /> {submitting ? "Изпращане..." : "Изпрати кандидатурата"}
              </button>
            </form>
          )}
        </div>

        {/* Warning */}
        <div className="glass border border-primary/30 rounded-xl p-6 flex items-start gap-4">
          <AlertTriangle size={24} className="text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="font-heading font-bold tracking-wider uppercase text-primary mb-2">⚠️ Важно!</h4>
            <p className="text-sm font-body text-foreground/80 leading-relaxed">
              Одобрението зависи от <strong className="text-foreground">качество + поведение + активност</strong>.
              Злоупотреба → отнемане на фракцията без предупреждение.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
