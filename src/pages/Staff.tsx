import { Crown, Shield, Wrench, HeartHandshake } from "lucide-react";
import { SITE_NAME } from "@/lib/config";

type Member = {
  role: string;
  name: string;
  blurb: string;
  badge: "owner" | "admin" | "mod" | "helper";
};

/** Плейсхолдъри — замени с реални хора или вържи към admin/БД по-късно. */
const TEAM: Member[] = [
  {
    role: "Owner",
    name: "Екипът",
    blurb: "Визия, инфраструктура и посока на проекта.",
    badge: "owner",
  },
  {
    role: "Администратор",
    name: "—",
    blurb: "Технически решения, сигурност и правила.",
    badge: "admin",
  },
  {
    role: "Модератор",
    name: "—",
    blurb: "Поддръжка на чата, тикети и fair play.",
    badge: "mod",
  },
  {
    role: "Helper",
    name: "—",
    blurb: "Помощ на нови играчи и ориентация в общността.",
    badge: "helper",
  },
];

const badgeStyles: Record<Member["badge"], string> = {
  owner: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  admin: "border-primary/40 bg-primary/10 text-primary",
  mod: "border-sky-500/35 bg-sky-500/10 text-sky-200",
  helper: "border-emerald-600/35 bg-emerald-600/10 text-emerald-200",
};

const badgeIcons: Record<Member["badge"], React.ReactNode> = {
  owner: <Crown size={14} />,
  admin: <Shield size={14} />,
  mod: <Shield size={14} />,
  helper: <HeartHandshake size={14} />,
};

export default function Staff() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="relative py-16 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(160_84%_39%/0.1)_0%,transparent_50%)]" />
        <div className="container mx-auto max-w-4xl relative">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-heading font-bold tracking-widest uppercase mb-5">
              <Wrench size={14} /> Екип
            </div>
            <h1 className="text-5xl md:text-7xl font-heading font-black tracking-widest uppercase mb-4">
              <span className="text-foreground">Хората зад </span>
              <span className="text-primary text-glow-accent">{SITE_NAME}</span>
            </h1>
            <p className="text-muted-foreground font-body max-w-lg mx-auto text-sm">
              Модерацията е тук за fair play и за общността. За въпроси — Discord тикети.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 pb-20">
            {TEAM.map((m) => (
              <div
                key={m.role + m.name}
                className="glass border border-white/10 rounded-2xl p-6 hover:border-primary/25 transition-colors"
              >
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-heading font-black tracking-widest uppercase mb-4 ${badgeStyles[m.badge]}`}
                >
                  {badgeIcons[m.badge]}
                  {m.role}
                </div>
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/20 mb-4 flex items-center justify-center text-2xl font-heading font-black text-primary/80">
                  {m.name === "—" ? "?" : m.name.charAt(0)}
                </div>
                <h2 className="font-heading font-black text-xl tracking-wide uppercase text-foreground mb-2">{m.name}</h2>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{m.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
