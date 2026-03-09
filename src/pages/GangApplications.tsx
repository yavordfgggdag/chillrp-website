import { useState } from "react";
import { ChevronDown, ChevronUp, Users, AlertTriangle, CheckCircle, FileText, Shield, Zap, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLogger } from "@/hooks/useActivityLogger";

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
    purple: { border: "border-neon-purple/30", text: "text-neon-purple", bg: "bg-neon-purple/8" },
    red: { border: "border-neon-red/30", text: "text-neon-red", bg: "bg-neon-red/8" },
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

function Bullet({ children, color = "purple" }: { children: React.ReactNode; color?: string }) {
  const c =
    color === "red"
      ? "text-neon-red"
      : color === "green"
        ? "text-neon-green"
        : color === "yellow"
          ? "text-neon-yellow"
          : "text-neon-purple";
  return (
    <div className="flex items-start gap-2.5 text-sm font-body text-foreground/80 leading-relaxed">
      <span className={`${c} mt-0.5 shrink-0`}>•</span>
      <span>{children}</span>
    </div>
  );
}

const gangTypes = [
  { name: "Ballas", emoji: "🟣", color: "text-neon-purple", desc: "Street" },
  { name: "Vagos", emoji: "🟡", color: "text-neon-yellow", desc: "Street" },
  { name: "The Families", emoji: "🟢", color: "text-neon-green", desc: "Grove" },
  { name: "Marabunta Grande", emoji: "🔵", color: "text-neon-cyan", desc: "Street" },
  { name: "The Lost MC", emoji: "⚫", color: "text-muted-foreground", desc: "Biker" },
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

function TA({ label, name, value, onChange, rows = 3, required = true }: any) {
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
        className="w-full px-4 py-2.5 rounded-xl glass border border-white/8 focus:border-neon-purple/50 focus:outline-none text-sm font-body text-foreground placeholder:text-muted-foreground bg-transparent resize-none"
      />
    </div>
  );
}

function FI({ label, name, value, onChange, placeholder = "", required = true }: any) {
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
        className="w-full px-4 py-2.5 rounded-xl glass border border-white/8 focus:border-neon-purple/50 focus:outline-none text-sm font-body text-foreground placeholder:text-muted-foreground bg-transparent"
      />
    </div>
  );
}

export default function GangApplications() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const { user, discordUsername } = useAuth();
  const logActivity = useActivityLogger();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      },
    ]);
    if (error) {
      toast.error("Грешка при изпращане. Опитай отново.");
      console.error(error);
    } else {
      // Discord нотификация
      try {
        await supabase.functions.invoke("notify-discord-gang", {
          body: {
            name: form.name,
            leader: form.leader,
            gang_type: form.gang_type,
            members: form.members,
            discord_username: form.discord_username,
          },
        });
      } catch (err) {
        console.warn("Discord нотификацията не беше изпратена:", err);
      }
      setSubmitted(true);
      logActivity("gang_submit", `📨 Кандидатура: "${form.name}" | Тип: ${form.gang_type} | Лидер: ${form.leader} | Discord: ${form.discord_username}`);
      toast.success("✅ Заявката е изпратена! Ще се свържем с теб.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Header */}
      <div className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(271_76%_53%/0.08)_0%,transparent_60%)]" />
        <div className="absolute inset-0 scanlines" />
        <div className="container mx-auto max-w-4xl relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-purple/40 bg-neon-purple/10 text-neon-purple text-xs font-heading font-bold tracking-widest uppercase mb-6">
            🧿 FREE GANG
          </div>
          <h1 className="text-5xl md:text-7xl font-heading font-black tracking-widest uppercase mb-4">
            <span className="text-foreground">ChillRP •</span> <span className="gradient-text-purple">Gang</span>
            <br />
            <span className="text-foreground">Applications</span>
          </h1>
          <p className="text-muted-foreground font-body text-lg max-w-2xl mx-auto">
            Безплатна банда чрез кандидатура. Само качество. Само RP.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 pb-20 space-y-4">
        {/* Info */}
        <Section emoji="🧿" title="FREE GANG • Как да получиш безплатен генг" color="purple" defaultOpen>
          <div className="glass border border-neon-purple/20 rounded-lg p-4 space-y-3 text-sm font-body text-foreground/80">
            <p>
              <span className="text-neon-purple font-bold">📌 Условие:</span> Отваряш тикет или попълваш формата по-долу
              с добра, оригинална концепция.
            </p>
            <div className="sep-purple" />
            <div className="text-xs font-heading font-bold tracking-widest uppercase text-neon-green mb-2">
              🎁 Какво получаваш при одобрение:
            </div>
            <Bullet color="green">Boss Menu (управление на членове/рангове)</Bullet>
            <Bullet color="green">Възможност за реализация като организация</Bullet>
            <Bullet color="green">Участие в официалната gang система</Bullet>
          </div>
        </Section>

        <Section emoji="①" title="Минимални изисквания" color="yellow">
          <Bullet color="yellow">Име на бандата от GTA5</Bullet>
          <Bullet color="yellow">Лидер + 2–3 човека ядро</Bullet>
          <Bullet color="yellow">Ясна тема (street / biker )</Bullet>
          <Bullet color="yellow">RP фокус и план за развитие</Bullet>
          <div className="mt-2 text-xs text-neon-red font-body glass border border-neon-red/20 rounded-lg px-3 py-2">
            ⚠️ Без активност на лидера Gang-a може да бъде отнет.
          </div>
        </Section>

        <Section emoji="②" title="Какво трябва да има концепцията" color="purple">
          {["История / произход", "Цел в града", "Кодекс / поведение", "RP ситуации", "План за развитие"].map((i) => (
            <Bullet key={i}>{i}</Bullet>
          ))}
          <div className="mt-2 glass border border-neon-purple/20 rounded-lg px-3 py-2 text-sm text-neon-purple font-semibold">
            ✍️ Дай минимум 2 RP сцени.
          </div>
        </Section>

        <Section emoji="③" title="Gang лимити" color="red">
          <Bullet color="red">Максимум 6 члена</Bullet>
          <Bullet color="red">4-Man Rule (макс 4 в crime ситуация)</Bullet>
          <Bullet color="red">Макс 2 коли в престрелка</Bullet>
          <Bullet color="red">Един човек = една организация</Bullet>
          <Bullet color="red">Без mass recruit</Bullet>
        </Section>

        {/* Gang types */}
        <div className="glass border border-white/8 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <span className="text-xl">④</span>
            <h3 className="font-heading font-bold tracking-wider uppercase text-base text-foreground">
              Налични GTA V Gang типове
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gangTypes.map((g) => (
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

        <Section emoji="⑤" title="Реализация като организация" color="white">
          <Bullet>Очаква се структура, дисциплина и вътрешен ред</Bullet>
          <Bullet>Активно RP: срещи, вербуване, конфликти, влияние</Bullet>
          <Bullet>Репутация, съюзи и врагове</Bullet>
          <div className="mt-2 glass border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground/60 font-heading font-semibold tracking-wider">
            Организация ≠ GANG WARS и се наказва изключително строго!.
          </div>
        </Section>

        <Section emoji="⑥" title="Какво НЕ приемаме" color="red">
          <Bullet color="red">"Искам генг да стрелям"</Bullet>
          <Bullet color="red">Копирани концепции</Bullet>
          <Bullet color="red">Без история / логика</Bullet>
          <Bullet color="red">Токсична или farm насоченост</Bullet>
        </Section>

        {/* APPLICATION FORM */}
        <div className="glass border border-neon-purple/30 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-neon-purple/10 border-b border-neon-purple/20 flex items-center gap-3">
            <span className="text-xl">⑦</span>
            <h3 className="font-heading font-bold tracking-wider uppercase text-base text-neon-purple flex items-center gap-2">
              <FileText size={18} /> Формат на кандидатурата
            </h3>
          </div>

          {submitted ? (
            <div className="p-10 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-2xl font-heading font-black tracking-widest uppercase text-neon-green mb-2">
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
                  placeholder="Например: От GTA5 ако не се сещате изберете от ТИП организация"
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
                    className="w-full px-4 py-2.5 rounded-xl glass border border-white/8 focus:border-neon-purple/50 focus:outline-none text-sm font-body text-foreground bg-background"
                  >
                    <option value="">Избери...</option>
                    {gangTypes.map((g) => (
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
                <div className="text-sm font-heading font-bold text-neon-purple">
                  {discordUsername || <span className="text-muted-foreground">Влез с Discord за да кандидатстваш</span>}
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
                label="7. RP примери (минимум 2 сцени)"
                name="rp_examples"
                value={form.rp_examples}
                onChange={onChange}
                placeholder="идеята е да видим дали можете да roleplay - вате"
                rows={5}
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border border-neon-purple/60 bg-neon-purple/18 text-foreground font-heading font-black tracking-widest uppercase hover:bg-neon-purple/30 glow-purple transition-all disabled:opacity-50"
              >
                <Send size={16} /> {submitting ? "Изпращане..." : "Изпрати кандидатурата"}
              </button>
            </form>
          )}
        </div>

        {/* Warning */}
        <div className="glass border border-neon-red/30 rounded-xl p-6 flex items-start gap-4">
          <AlertTriangle size={24} className="text-neon-red shrink-0 mt-0.5" />
          <div>
            <h4 className="font-heading font-bold tracking-wider uppercase text-neon-red mb-2">⚠️ Важно!</h4>
            <p className="text-sm font-body text-foreground/80 leading-relaxed">
              Одобрението зависи от <strong className="text-foreground">качество + поведение + активност</strong>.
              Злоупотреба → отнемане на ГЕНГА без предупреждение.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
