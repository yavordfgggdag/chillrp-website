import { Link } from "react-router-dom";
import { Trees, Swords, ArrowRight, Users, Coins, Hammer, Calendar, Sparkles, Target, Castle, UsersRound } from "lucide-react";
import { DISCORD_INVITE } from "@/lib/config";

export default function GameModes() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,hsl(160_84%_39%/0.14)_0%,transparent_50%)]" />
        <div className="container mx-auto max-w-5xl relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-heading font-bold tracking-widest uppercase mb-5">
              Сървъри
            </div>
            <h1 className="text-5xl md:text-7xl font-heading font-black tracking-widest uppercase mb-4">
              <span className="text-foreground">SMP </span>
              <span className="text-primary/50">·</span>
              <span className="text-primary text-glow-accent"> Factions</span>
            </h1>
            <p className="text-muted-foreground font-body max-w-2xl mx-auto">
              Един сървър, два характера: спокоен community survival и конкурентен PvP свят. Избери къде да играеш — или и двете.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 pb-12">
            <article className="glass border border-emerald-500/20 rounded-2xl overflow-hidden flex flex-col">
              <div className="p-8 border-b border-white/8 bg-emerald-950/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/15 border border-primary/35 flex items-center justify-center text-primary">
                    <Trees size={28} strokeWidth={1.75} />
                  </div>
                  <h2 className="font-heading font-black text-3xl tracking-wider uppercase text-foreground">SMP</h2>
                </div>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  Survival multiplayer с фокус върху общността, икономика и строене — без напрежение от постоянен raid.
                </p>
              </div>
              <ul className="p-8 space-y-4 flex-1">
                {[
                  { icon: Users, t: "Активна общност", d: "Играй с приятели, търговия и съвместни проекти." },
                  { icon: Coins, t: "Икономика", d: "Балансирани пазари и награди за активност." },
                  { icon: Hammer, t: "Строене", d: "Покажи бази и креативност — уважение към чуждия труд." },
                  { icon: Sparkles, t: "Прогресия", d: "Цели, евенти и награди, които държат играта свежа." },
                  { icon: Calendar, t: "Евенти", d: "Редовни събития от екипа и общността." },
                ].map(({ icon: I, t, d }) => (
                  <li key={t} className="flex gap-3">
                    <I size={18} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="font-heading font-bold text-sm tracking-wide uppercase text-foreground">{t}</div>
                      <div className="text-sm text-muted-foreground font-body">{d}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="p-6 border-t border-white/8">
                <Link
                  to="/rules/smp"
                  className="inline-flex items-center gap-2 text-primary font-heading font-bold text-xs tracking-widest uppercase hover:underline"
                >
                  SMP правила <ArrowRight size={14} />
                </Link>
              </div>
            </article>

            <article className="glass border border-primary/25 rounded-2xl overflow-hidden flex flex-col">
              <div className="p-8 border-b border-white/8 bg-primary/[0.06]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                    <Swords size={28} strokeWidth={1.75} />
                  </div>
                  <h2 className="font-heading font-black text-3xl tracking-wider uppercase text-foreground">Factions</h2>
                </div>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  PvP, рейдове и контрол над територии. Стратегия, екипна игра и ясни правила за честна конкуренция.
                </p>
              </div>
              <ul className="p-8 space-y-4 flex-1">
                {[
                  { icon: Target, t: "PvP", d: "Бой в рамките на режима — без combat logging." },
                  { icon: Castle, t: "Рейдове", d: "Атакувай и защитавай бази според конфигурацията на сървъра." },
                  { icon: UsersRound, t: "Територии", d: "Клеймове, алианси и контрол върху ресурси." },
                  { icon: Swords, t: "Отборна игра", d: "Координация, роли и лидерство във фракцията." },
                  { icon: Sparkles, t: "Мета", d: "Стратегия извън битката — дипломация и подготовка." },
                ].map(({ icon: I, t, d }) => (
                  <li key={t} className="flex gap-3">
                    <I size={18} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="font-heading font-bold text-sm tracking-wide uppercase text-foreground">{t}</div>
                      <div className="text-sm text-muted-foreground font-body">{d}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="p-6 border-t border-white/8 flex flex-wrap gap-4">
                <Link
                  to="/rules/factions"
                  className="inline-flex items-center gap-2 text-primary font-heading font-bold text-xs tracking-widest uppercase hover:underline"
                >
                  Factions правила <ArrowRight size={14} />
                </Link>
                <Link
                  to="/applications#faction"
                  className="inline-flex items-center gap-2 text-muted-foreground font-heading font-bold text-xs tracking-widest uppercase hover:text-primary"
                >
                  Регистрация на фракция <ArrowRight size={14} />
                </Link>
              </div>
            </article>
          </div>

          <div className="text-center glass border border-white/10 rounded-2xl p-8">
            <p className="text-muted-foreground font-body text-sm mb-4">Имаш въпроси за режимите?</p>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl border border-primary/50 bg-primary/12 text-primary font-heading font-bold tracking-widest uppercase text-sm hover:bg-primary/20 glow-accent transition-all"
            >
              Питай в Discord
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
