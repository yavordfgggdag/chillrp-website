import { Link } from "react-router-dom";
import { BookOpen, MessageCircle, Trees, Swords, Shield, Ban, Gavel, ArrowRight, UserCog } from "lucide-react";

const pages = [
  {
    to: "/rules/general",
    title: "Общи правила",
    desc: "Уважение, акаунти, поведение в общността.",
    icon: BookOpen,
  },
  {
    to: "/rules/chat",
    title: "Чат",
    desc: "Текстови канали, spam, voice етикет.",
    icon: MessageCircle,
  },
  {
    to: "/rules/smp",
    title: "SMP",
    desc: "Survival, бази, икономика, евенти.",
    icon: Trees,
  },
  {
    to: "/rules/factions",
    title: "Factions",
    desc: "PvP, рейдове, територии, алианси.",
    icon: Swords,
  },
  {
    to: "/rules/discord",
    title: "Discord",
    desc: "Общността извън играта.",
    icon: Shield,
  },
  {
    to: "/rules/staff",
    title: "Staff / Helper",
    desc: "Очаквания към екипа и помощниците.",
    icon: UserCog,
  },
  {
    to: "/rules/anticheat",
    title: "Anti-cheat",
    desc: "Забранен софтуер и репорти.",
    icon: Ban,
  },
  {
    to: "/rules/punishments",
    title: "Наказания",
    desc: "Скала, апелации, санкции.",
    icon: Gavel,
  },
];

export default function RulesHub() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="relative py-16 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(160_84%_39%/0.12)_0%,transparent_55%)]" />
        <div className="container mx-auto max-w-4xl relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-heading font-bold tracking-widest uppercase mb-5">
              <BookOpen size={14} /> Правила
            </div>
            <h1 className="text-5xl md:text-7xl font-heading font-black tracking-widest uppercase mb-4">
              <span className="text-foreground">Наръчник на </span>
              <span className="text-primary text-glow-accent">сървъра</span>
            </h1>
            <p className="text-muted-foreground font-body max-w-xl mx-auto text-sm leading-relaxed">
              Ясни раздели за SMP и Factions. Прочети преди да влезеш — спестява време и конфликти.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pb-20">
            {pages.map(({ to, title, desc, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group glass border border-white/10 rounded-2xl p-6 hover:border-primary/35 hover:bg-primary/[0.04] transition-all duration-200 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Icon size={22} strokeWidth={1.75} />
                    </div>
                    <h2 className="font-heading font-black text-lg tracking-wider uppercase text-foreground truncate">{title}</h2>
                  </div>
                  <ArrowRight
                    size={18}
                    className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform shrink-0"
                    aria-hidden
                  />
                </div>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
