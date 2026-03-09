import { useState, useEffect, useMemo } from "react";
import { Shield, Loader2, Search } from "lucide-react";
import NoCopyWrapper from "@/components/NoCopyWrapper";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePoliceHandbook } from "@/hooks/usePoliceHandbook";

const DISCORD_ICON = "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/discord.svg";

/** Наръчникът се показва само при роля „Полицай“ в Discord (проверка чрез check-police-role). */
const DISCORD_GATE_DISABLED = false;

function InsigniaCell({ insignia, detail }: { insignia: string; insigniaDetail?: number }) {
  if (insignia === "none") return <span className="text-muted-foreground/40">—</span>;
  if (insignia === "stars" && detail) {
    return (
      <span className="flex items-center gap-0.5 text-white/90">
        {Array.from({ length: detail }).map((_, i) => (
          <span key={i} className="text-lg leading-none">★</span>
        ))}
      </span>
    );
  }
  if (insignia === "bars" && detail) {
    return (
      <span className="flex items-center gap-1 text-slate-300 font-bold tracking-widest">
        {Array.from({ length: detail }).map((_, i) => (
          <span key={i}>|</span>
        ))}
      </span>
    );
  }
  if (insignia === "chevrons" && detail) {
    return (
      <span className="flex flex-col items-center gap-0 text-amber-200/90">
        {Array.from({ length: detail }).map((_, i) => (
          <span key={i} className="text-sm leading-none">⌃</span>
        ))}
      </span>
    );
  }
  if (insignia === "chevrons_rocker" && detail) {
    return (
      <span className="flex flex-col items-center gap-0 text-amber-200/90">
        {Array.from({ length: detail }).map((_, i) => (
          <span key={i} className="text-sm leading-none">⌃</span>
        ))}
        <span className="text-[10px] border-t border-amber-200/50 w-6 mt-0.5" />
      </span>
    );
  }
  if (insignia === "cadet") {
    return <span className="w-6 h-6 rounded-full border-2 border-white/50 flex items-center justify-center text-[10px] font-bold text-white/80">?</span>;
  }
  return null;
}

function RoleBadge({ role, roleType }: { role: string; roleType: string }) {
  const colors: Record<string, string> = {
    high_command: "text-amber-400",
    command: "text-sky-300",
    division_lead: "text-amber-400",
    shift_supervisor: "text-amber-400",
    training_officer: "text-emerald-400",
    regular_unit: "text-white/90",
    in_training: "text-white/70",
  };
  return <span className={colors[roleType] || "text-foreground"}>{role}</span>;
}

function PoliceLoginGate({
  onLogin,
  onLogout,
  error,
  loading,
  accessDeniedOnly,
}: {
  onLogin: () => void;
  onLogout?: () => void;
  error: string | null;
  loading: boolean;
  accessDeniedOnly?: boolean;
}) {
  if (accessDeniedOnly) {
    return (
      <div className="min-h-screen bg-background pt-28 flex items-center justify-center px-4">
        <div className="glass-strong border border-neon-red/30 rounded-2xl p-8 max-w-sm w-full text-center">
          <Shield size={36} className="text-neon-red mx-auto mb-3" />
          <h1 className="text-xl font-heading font-black tracking-widest uppercase text-neon-red">Достъп отказан</h1>
          {onLogout && (
            <button onClick={onLogout} className="mt-6 flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-neon-red hover:border-neon-red/40 text-sm font-heading font-semibold tracking-wider transition-colors">
              Изход
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background pt-28 flex items-center justify-center px-4">
      <div className="glass-strong border border-neon-purple/40 rounded-2xl max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-purple/40 bg-neon-purple/10 text-neon-purple text-xs font-heading font-semibold tracking-widest uppercase mb-5">
          <Shield size={13} /> Полиция
        </div>
        <h1 className="text-2xl font-heading font-black tracking-widest uppercase text-foreground mb-2">
          Наръчник на Полицията
        </h1>
        <p className="text-muted-foreground text-sm font-body mb-6">
          За достъп трябва да влезете с Discord и да имате ролята <strong className="text-neon-purple">Полицай</strong> в сървъра.
        </p>
        {error && (
          <div className="mb-6 rounded-xl bg-neon-red/10 border border-neon-red/30 text-neon-red text-sm px-4 py-3 font-body">
            Достъп отказан
          </div>
        )}
        <button
          onClick={onLogin}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-heading font-bold px-6 py-3.5 transition-colors disabled:opacity-50 w-full"
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <img src={DISCORD_ICON} alt="" className="w-5 h-5 invert" width={20} height={20} />
              Влез с Discord
            </>
          )}
        </button>
        <p className="text-muted-foreground/70 text-xs font-body mt-5">
          След влизане сайтът проверява дали имате ролята полицай в Discord сървъра ChillRP.
        </p>
      </div>
    </div>
  );
}

function HandbookContent({ handbook }: { handbook: ReturnType<typeof usePoliceHandbook>["data"] }) {
  const [search, setSearch] = useState("");

  const searchLower = search.trim().toLowerCase();
  const filteredIndex = handbook.handbookIndex.filter(
    (item) =>
      !searchLower ||
      item.title.toLowerCase().includes(searchLower) ||
      item.section.toLowerCase().includes(searchLower) ||
      item.keywords.some((k) => k.toLowerCase().includes(searchLower))
  );

  const images = {
    hero: "/police/hero.jpg",
    patrol: "/police/patrol.jpg",
    traffic: "/police/traffic.jpg",
    radio: "/police/radio.jpg",
  };

  const tenCodeItems = useMemo(
    () =>
      handbook.radioCodes.map((c, index) => (
        <div
          key={`ten-code-${index}-${c.code}`}
          role="listitem"
          className="glass border border-neon-cyan/20 rounded-lg px-3 py-2 flex justify-between items-center gap-2"
        >
          <span className="font-mono font-bold text-neon-cyan text-sm shrink-0">{c.code}</span>
          <span className="text-xs font-body text-foreground/80 truncate">{c.meaning}</span>
        </div>
      )),
    [handbook.radioCodes]
  );

  const PoliceImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
    const [error, setError] = useState(false);
    if (error) {
      return (
        <div className={`w-full h-full flex items-center justify-center min-h-[140px] bg-white/5 border border-white/10 text-muted-foreground/50 text-xs font-body text-center ${className || ""}`}>
          Сложи GTA 5 снимка в <code className="mx-1 px-1.5 py-0.5 rounded bg-white/10">public/police/{src.split("/").pop()}</code>
        </div>
      );
    }
    return (
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${className || ""}`}
        onError={() => setError(true)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="relative py-14 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-neon-cyan/3" />
        <div className="container mx-auto max-w-3xl relative">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-semibold tracking-widest uppercase mb-5">
              <Shield size={13} /> Полиция
            </div>
            <h1 className="text-5xl md:text-6xl font-heading font-black tracking-widest uppercase mb-3">
              <span className="gradient-text">Наръчник</span> <span className="text-foreground">на Полицията</span>
            </h1>
            <p className="text-muted-foreground font-body text-sm max-w-xl mx-auto">
              Официален наръчник за полицейския отдел — правила, процедури, рангове и стандарти.
            </p>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-neon-cyan/20 shadow-xl mb-8 aspect-[5/1] max-h-64">
            <PoliceImage src={images.hero} alt="GTA 5 — полиция" className="w-full h-full object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
          </div>

          <div className="relative mb-8">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Търси по заглавие или букви..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl glass border border-border focus:border-neon-cyan/50 focus:outline-none text-sm font-body text-foreground placeholder:text-muted-foreground bg-transparent"
            />
          </div>

          {search && (
            <div className="glass border border-neon-cyan/20 rounded-xl p-4 mb-8">
              <div className="text-xs font-heading font-bold tracking-widest uppercase text-neon-cyan mb-2">Преглед по секции</div>
              <div className="flex flex-wrap gap-2">
                {filteredIndex.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    className="text-xs font-body text-foreground/80 hover:text-neon-cyan border border-white/10 hover:border-neon-cyan/40 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {item.title}
                  </a>
                ))}
                {filteredIndex.length === 0 && (
                  <span className="text-muted-foreground text-sm">Няма съвпадения</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <NoCopyWrapper className="container mx-auto max-w-3xl px-4 pb-24 space-y-12">
        {/* Рангове — Chain of Command */}
        <section id="ranks" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-cyan mb-2 border-b border-neon-cyan/30 pb-2">
            Рангова система
          </h2>
          <p className="text-muted-foreground text-sm font-body mb-4">Chain of Command — Los Santos Police Department</p>
          <div className="rounded-xl overflow-hidden border border-neon-cyan/20 mb-6 aspect-[5/1] max-h-48">
            <PoliceImage src={images.patrol} alt="GTA 5 — патрул" className="w-full h-full" />
          </div>
          <div className="rounded-xl overflow-hidden border-2 border-neon-purple/40 bg-background/95 shadow-lg shadow-neon-purple/10">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-800/90 border-b border-neon-purple/30">
                  <th className="text-left py-3 px-4 text-xs font-heading font-bold tracking-widest uppercase text-white/90 w-24">Insignia</th>
                  <th className="text-left py-3 px-4 text-xs font-heading font-bold tracking-widest uppercase text-white/90">Rank</th>
                  <th className="text-left py-3 px-4 text-xs font-heading font-bold tracking-widest uppercase text-white/90 w-40">Role</th>
                  <th className="text-left py-3 px-4 text-xs font-heading font-bold tracking-widest uppercase text-white/90">Responsibility</th>
                </tr>
              </thead>
              <tbody>
                {handbook.chainOfCommandRanks.map((r, i) => (
                  <tr key={r.rank} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                    <td className="py-3 px-4 align-middle">
                      <InsigniaCell insignia={r.insignia} insigniaDetail={r.insigniaDetail} />
                    </td>
                    <td className="py-3 px-4 font-heading font-semibold text-white/95">{r.rank}</td>
                    <td className="py-3 px-4 text-sm">
                      <RoleBadge role={r.role} roleType={r.roleType} />
                    </td>
                    <td className="py-3 px-4 text-sm font-body text-foreground/85 leading-relaxed">{r.responsibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Златни правила */}
        <section id="golden-rules" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-amber-400 mb-4 border-b border-amber-400/30 pb-2">
            Двете златни правила на полицията
          </h2>
          <div className="space-y-4">
            {handbook.goldenRules.map((r, i) => (
              <div key={i} className="glass border border-amber-400/20 rounded-xl p-4">
                <div className="font-heading font-bold text-amber-400 text-sm mb-1">{r.title}</div>
                <p className="text-sm font-body text-foreground/85">{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Полицейска свобода и дискретност */}
        <section id="freedom-discretion" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-purple mb-4 border-b border-neon-purple/30 pb-2">
            Полицейска свобода и дискретност
          </h2>
          <div className="space-y-4">
            <p className="text-sm font-body text-foreground/85">{handbook.policeFreedomDiscretion.freedom}</p>
            <p className="text-sm font-body text-foreground/70 italic">{handbook.policeFreedomDiscretion.freedomExample}</p>
            <p className="text-sm font-body text-foreground/85">{handbook.policeFreedomDiscretion.discretion}</p>
            <p className="text-sm font-body text-foreground/70 italic">{handbook.policeFreedomDiscretion.discretionExample}</p>
          </div>
        </section>

        {/* Видове комуникации */}
        <section id="communication-types" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-cyan mb-4 border-b border-neon-cyan/30 pb-2">
            Видове комуникации
          </h2>
          <p className="text-sm font-body text-muted-foreground mb-4">Видовете комуникации дефинират контакта с цивилни и вашите права.</p>
          <div className="space-y-4">
            {handbook.communicationTypes.map((c, i) => (
              <div key={i} className="glass border border-neon-cyan/20 rounded-xl p-4">
                <div className="font-heading font-bold text-neon-cyan text-sm mb-1">{c.type}</div>
                <p className="text-sm font-body text-foreground/85">{c.summary}</p>
                <p className="text-sm font-body text-foreground/70 italic mt-2">{c.example}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Степени на опасност */}
        <section id="danger-levels" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase mb-4 border-b border-white/20 pb-2">
            Степени на опасност
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="glass border border-green-500/30 rounded-xl p-4">
              <div className="font-heading font-bold text-green-400 text-sm mb-1">Код зелено</div>
              <p className="text-sm font-body text-foreground/85">{handbook.dangerLevels.green}</p>
            </div>
            <div className="glass border border-yellow-500/30 rounded-xl p-4">
              <div className="font-heading font-bold text-yellow-400 text-sm mb-1">Код жълто</div>
              <p className="text-sm font-body text-foreground/85">{handbook.dangerLevels.yellow}</p>
            </div>
            <div className="glass border border-red-500/30 rounded-xl p-4">
              <div className="font-heading font-bold text-red-400 text-sm mb-1">Код червено</div>
              <p className="text-sm font-body text-foreground/85">{handbook.dangerLevels.red}</p>
            </div>
          </div>
          <div className="glass border border-amber-400/20 rounded-xl p-4">
            <div className="text-xs font-heading font-bold text-amber-400 uppercase mb-1">Важно</div>
            <p className="text-sm font-body text-foreground/85">{handbook.dangerLevels.important}</p>
            <p className="text-sm font-body text-foreground/70 mt-2">{handbook.dangerLevels.example}</p>
          </div>
        </section>

        {/* Арест и Миранда */}
        <section id="arrest-miranda" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-purple mb-4 border-b border-neon-purple/30 pb-2">
            Арест и задържане
          </h2>
          <p className="text-sm font-body text-foreground/80 mb-4">5-те стъпки на арест и Миранда предупреждение.</p>
          <ol className="space-y-2 mb-6">
            {handbook.arrestFiveSteps.map((step, i) => (
              <li key={i} className="glass border border-neon-purple/20 rounded-lg px-4 py-2 text-sm font-body text-foreground/85 flex gap-3">
                <span className="text-neon-purple font-heading font-black shrink-0">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="glass border border-neon-purple/20 rounded-xl p-4 mb-4">
            <div className="font-heading font-bold text-neon-purple text-sm mb-2">Миранда предупреждение</div>
            <p className="text-sm font-body text-foreground/80 mb-2">{handbook.mirandaWarning.definition}</p>
            <blockquote className="text-sm font-body text-foreground/90 border-l-2 border-neon-purple/50 pl-4 py-2 my-2">
              {handbook.mirandaWarning.text}
            </blockquote>
            <p className="text-sm font-body text-foreground/80">{handbook.mirandaWarning.after}</p>
          </div>
        </section>

        <section id="traffic" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-purple mb-4 border-b border-neon-purple/30 pb-2">
            Спиране на трафик (10-38)
          </h2>
          <div className="rounded-xl overflow-hidden border border-neon-purple/20 mb-6 bg-white/5 aspect-[5/1] max-h-[160px] flex items-center justify-center">
            <PoliceImage src={images.traffic} alt="GTA 5 — трафик" className="w-full h-full object-contain" />
          </div>
          <div className="space-y-3">
            {handbook.trafficStopSteps.map((s) => (
              <div key={s.step} className="glass border border-neon-purple/20 rounded-xl p-4 flex gap-4">
                <span className="text-neon-purple font-heading font-black text-lg shrink-0">{s.step}</span>
                <div>
                  <div className="font-heading font-bold text-foreground text-sm">{s.title}</div>
                  <p className="text-sm font-body text-foreground/80 mt-0.5">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Felony Stop (Код 5) */}
        <section id="felony-stop" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-red mb-4 border-b border-neon-red/30 pb-2">
            Felony Stop (Код 5)
          </h2>
          <p className="text-sm font-body text-foreground/80 mb-4">Процедура след спиране (10-38), когато водачът или пътник е издирван или МПС е свързано с престъпление. Цел: безопасност.</p>
          <div className="space-y-3">
            {handbook.felonyStopSteps.map((s) => (
              <div key={s.step} className="glass border border-neon-red/20 rounded-xl p-4 flex gap-4">
                <span className="text-neon-red font-heading font-black text-lg shrink-0">Стъпка {s.step}</span>
                <p className="text-sm font-body text-foreground/85">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Преследване */}
        <section id="pursuit" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-yellow mb-4 border-b border-neon-yellow/30 pb-2">
            Преследвания (10-80)
          </h2>
          <div className="glass border border-neon-red/20 rounded-xl px-4 py-2 mb-4 text-sm font-body text-neon-red/90">
            {handbook.pursuit10_80Important}
          </div>
          <div className="space-y-3 mb-4">
            {handbook.pursuit10_80Steps.map((s) => (
              <div key={s.step} className="glass border border-neon-yellow/20 rounded-xl p-4 flex gap-4">
                <span className="text-neon-yellow font-heading font-black shrink-0">Стъпка {s.step}</span>
                <p className="text-sm font-body text-foreground/85">{s.body}</p>
              </div>
            ))}
          </div>
          <h3 className="font-heading font-bold text-neon-yellow text-sm mb-2">Общи правила</h3>
          <div className="space-y-2">
            {handbook.pursuitRules.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 text-sm font-body rounded-lg px-3 py-2 ${
                  r.type === "forbidden" ? "bg-neon-red/10 border border-neon-red/20 text-neon-red/90" : "bg-neon-green/10 border border-neon-green/20 text-neon-green/90"
                }`}
              >
                <span>{r.type === "forbidden" ? "⛔" : "✅"}</span>
                <span>{r.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Роли на екипите в гонка */}
        <section id="chase-roles" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-yellow mb-4 border-b border-neon-yellow/30 pb-2">
            Роли на екипите в гонка
          </h2>
          <p className="text-sm font-body text-foreground/80 mb-4">Трите задължителни екипа при преследване: препоръчителен минимум.</p>
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="glass border border-neon-yellow/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-yellow text-sm mb-2">Първи екип</div>
              <p className="text-xs font-body text-foreground/80"><strong>Шофьор:</strong> {handbook.chaseTeamRoles.first.driver}</p>
              <p className="text-xs font-body text-foreground/80 mt-1"><strong>Пасажер:</strong> {handbook.chaseTeamRoles.first.passenger}</p>
            </div>
            <div className="glass border border-neon-yellow/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-yellow text-sm mb-2">Втори екип</div>
              <p className="text-xs font-body text-foreground/80"><strong>Шофьор:</strong> {handbook.chaseTeamRoles.second.driver}</p>
              <p className="text-xs font-body text-foreground/80 mt-1"><strong>Пасажер:</strong> {handbook.chaseTeamRoles.second.passenger}</p>
            </div>
            <div className="glass border border-neon-yellow/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-yellow text-sm mb-2">Трети екип</div>
              <p className="text-xs font-body text-foreground/80">{handbook.chaseTeamRoles.third}</p>
            </div>
          </div>
          <div className="space-y-2">
            {handbook.chaseTeamRoles.important.map((text, i) => (
              <div key={i} className="glass border border-neon-red/20 rounded-lg px-4 py-2 text-sm font-body text-neon-red/90">
                ⚠ {text}
              </div>
            ))}
          </div>
        </section>

        {/* PIT маневра */}
        <section id="pit" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-yellow mb-4 border-b border-neon-yellow/30 pb-2">
            PIT маневра
          </h2>
          <div className="space-y-4">
            <p className="text-sm font-body text-foreground/85">{handbook.pitManeuver.definition}</p>
            <div className="glass border border-amber-400/20 rounded-xl p-4">
              <div className="text-xs font-heading font-bold text-amber-400 uppercase mb-1">Кога се разрешава</div>
              <p className="text-sm font-body text-foreground/85">{handbook.pitManeuver.when}</p>
            </div>
            <p className="text-sm font-body text-foreground/85"><strong>Цел:</strong> {handbook.pitManeuver.purpose}</p>
            <p className="text-sm font-body text-foreground/85"><strong>Как:</strong> {handbook.pitManeuver.how}</p>
            <div className="glass border border-neon-red/20 rounded-xl px-4 py-2 text-sm font-body text-neon-red/90">
              {handbook.pitManeuver.note}
            </div>
          </div>
        </section>

        {/* Употреба на сила */}
        <section id="force" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-red mb-4 border-b border-neon-red/30 pb-2">
            Употреба на сила
          </h2>
          <div className="space-y-2">
            {handbook.useOfForceLevels.map((l) => (
              <div key={l.level} className="glass border border-neon-red/20 rounded-xl p-3 flex gap-3">
                <span className="text-neon-red font-heading font-black shrink-0">{l.level}</span>
                <div>
                  <span className="font-heading font-bold text-foreground text-sm">{l.name}</span>
                  <span className="text-foreground/80 text-sm font-body"> — {l.description}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="glass border border-amber-400/20 rounded-xl p-4 mt-4">
            <div className="text-xs font-heading font-bold text-amber-400 uppercase mb-1">Важно</div>
            <p className="text-sm font-body text-foreground/85">{handbook.weaponsWarning}</p>
          </div>
        </section>

        {/* Претърсвания */}
        <section id="search" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-cyan mb-4 border-b border-neon-cyan/30 pb-2">
            Претърсвания на хора и имущество
          </h2>
          <div className="space-y-4 mb-4">
            <div className="glass border border-neon-cyan/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-cyan text-sm mb-1">Щателно претърсване</div>
              <p className="text-sm font-body text-foreground/85">{handbook.searchPeople.thorough}</p>
            </div>
            <div className="glass border border-neon-cyan/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-cyan text-sm mb-1">Нещателно претърсване</div>
              <p className="text-sm font-body text-foreground/85">{handbook.searchPeople.nonThorough}</p>
            </div>
            <p className="text-sm font-body text-foreground/85">{handbook.searchPeople.atStation}</p>
            <p className="text-sm font-body text-foreground/85">{handbook.searchPeople.shooting}</p>
          </div>
          <h3 className="font-heading font-bold text-neon-cyan text-sm mb-2">Кога се претърсва движимо/недвижимо имущество</h3>
          <ul className="space-y-1 mb-2">
            {handbook.searchProperty.when.map((w, i) => (
              <li key={i} className="text-sm font-body text-foreground/85">• {w}</li>
            ))}
          </ul>
          <div className="glass border border-neon-red/20 rounded-xl p-4">
            <div className="text-xs font-heading font-bold text-neon-red uppercase mb-1">Важно</div>
            <p className="text-sm font-body text-foreground/85">{handbook.searchProperty.important}</p>
            <p className="text-sm font-body text-foreground/85 mt-2">{handbook.searchProperty.vehicles}</p>
          </div>
        </section>

        {/* Издирване */}
        <section id="wanted" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-purple mb-4 border-b border-neon-purple/30 pb-2">
            Издирване
          </h2>
          <p className="text-sm font-body text-foreground/80 mb-4">Три вида издирване.</p>
          <div className="space-y-3">
            {handbook.wantedTypes.map((w, i) => (
              <div key={i} className="glass border border-neon-purple/20 rounded-xl p-4">
                <div className="font-heading font-bold text-neon-purple text-sm mb-1">{w.type}</div>
                <p className="text-sm font-body text-foreground/85">{w.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Радио */}
        <section id="radio" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-cyan mb-4 border-b border-neon-cyan/30 pb-2">
            Радио комуникация
          </h2>
          <div className="rounded-xl overflow-hidden border border-neon-cyan/20 mb-6 aspect-[5/1] max-h-48">
            <PoliceImage src={images.radio} alt="GTA 5 — радио" className="w-full h-full" />
          </div>
          <div className="space-y-4 mb-4">
            <div className="glass border border-amber-400/20 rounded-xl p-4">
              <div className="text-xs font-heading font-bold text-amber-400 uppercase mb-1">Задължително</div>
              <p className="text-sm font-body text-foreground/85">{handbook.tenCodeMandatory.mandatory}</p>
              <p className="text-sm font-body text-foreground/80 mt-2">{handbook.tenCodeMandatory.format}</p>
              <p className="text-sm font-body text-neon-red/90 mt-2">{handbook.tenCodeMandatory.noClutter}</p>
              <p className="text-sm font-body text-neon-red/90">{handbook.tenCodeMandatory.civiliansForbidden}</p>
            </div>
          </div>
          <div className="space-y-4 mb-6">
            {handbook.radioRequirements.map((r, i) => (
              <div key={i} className="glass border border-neon-cyan/20 rounded-xl p-4">
                <div className="font-heading font-bold text-neon-cyan text-sm">{r.title}</div>
                <div className="text-foreground/90 text-sm font-body mt-1">{r.keyword}</div>
                <p className="text-foreground/70 text-xs mt-1">{r.description}</p>
              </div>
            ))}
          </div>
          <p className="text-sm font-body text-foreground/80 mb-4">{handbook.radioCleanliness[0]}</p>
          <p className="text-sm font-body text-foreground/80 italic text-muted-foreground">{handbook.radioCleanliness[1]}</p>
        </section>

        {/* Доклад и доказателства */}
        <section id="report" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-cyan mb-4 border-b border-neon-cyan/30 pb-2">
            Примерен полицейски доклад и доказателства
          </h2>
          <p className="text-sm font-body text-foreground/80 mb-2"><strong>Полета:</strong> {handbook.policeReport.fields}</p>
          <p className="text-sm font-body text-foreground/80 mb-4">{handbook.policeReport.example}</p>
          <div className="glass border border-amber-400/20 rounded-xl p-4 mb-4">
            <div className="text-xs font-heading font-bold text-amber-400 uppercase mb-1">Ключова информация</div>
            <p className="text-sm font-body text-foreground/85">{handbook.policeReport.keyInfo}</p>
            <p className="text-sm font-body text-foreground/85 mt-2">{handbook.policeReport.identity}</p>
            <p className="text-sm font-body text-foreground/85 mt-2">{handbook.policeReport.evidence}</p>
          </div>
          <div className="mb-4">
            <div className="text-xs font-heading font-bold text-neon-cyan uppercase mb-2">Примери за снимков материал (доказателства)</div>
            <ul className="space-y-1.5 text-sm font-body text-foreground/85">
              {handbook.evidencePhotoExamples.map((item, i) => (
                <li key={i} className="flex gap-2 rounded-lg px-3 py-1.5 bg-white/5 border border-white/10">
                  <span className="text-neon-cyan shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass border border-neon-red/20 rounded-xl p-4">
            <div className="text-xs font-heading font-bold text-neon-red uppercase mb-1">Важно</div>
            <p className="text-sm font-body text-foreground/85">{handbook.evidenceScreenshotsImportant}</p>
          </div>
        </section>

        {/* 10 кодове */}
        <section id="ten-codes" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-cyan mb-4 border-b border-neon-cyan/30 pb-2">
            Десетични кодове (10-codes)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" role="list">
            {tenCodeItems}
          </div>
        </section>

        {/* Улици / карта */}
        <section id="streets" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-cyan mb-4 border-b border-neon-cyan/30 pb-2">
            Улици / карта
          </h2>
          <p className="text-sm font-body text-foreground/80 mb-4">
            Референция за основни локации и улици в града — използвайте при доклади по радиото (10-20) и при ориентиране.
          </p>
          <div className="rounded-xl overflow-hidden max-w-4xl">
            <img
              src="/police/street.jpg"
              alt="Карта на улиците — локации за радиодоклади"
              className="w-full h-auto max-h-[70vh] block object-contain"
            />
          </div>
        </section>

        {/* 10-13 */}
        <section id="code10-13">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-red mb-4 border-b border-neon-red/30 pb-2">
            Сигнал 10-13
          </h2>
          <p className="text-sm font-body text-foreground/80 mb-4">{handbook.code1013.definition}</p>
          <div className="space-y-4">
            <div className="glass border border-neon-red/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-red text-sm">{handbook.code1013.ordinary.title}</div>
              <p className="text-sm font-body text-foreground/80 mt-1">{handbook.code1013.ordinary.text}</p>
            </div>
            <div className="glass border border-neon-red/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-red text-sm">{handbook.code1013.priorityA.title}</div>
              <p className="text-sm font-body text-foreground/80 mt-1">{handbook.code1013.priorityA.text}</p>
            </div>
            <div className="glass border border-neon-red/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-red text-sm">{handbook.code1013.nonPriorityB.title}</div>
              <p className="text-sm font-body text-foreground/80 mt-1">{handbook.code1013.nonPriorityB.text}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div className="glass border border-neon-green/20 rounded-xl p-4">
              <div className="text-xs font-heading font-bold text-neon-green mb-2">ПРАВИЛНО</div>
              <ul className="text-sm font-body text-foreground/80 space-y-1">
                {handbook.code1013.dos.map((d, i) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </div>
            <div className="glass border border-neon-red/20 rounded-xl p-4">
              <div className="text-xs font-heading font-bold text-neon-red mb-2">ЗАБРАНЕНО</div>
              <ul className="text-sm font-body text-foreground/80 space-y-1">
                {handbook.code1013.donts.map((d, i) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Вътрешно поведение */}
        <section id="conduct">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-purple mb-4 border-b border-neon-purple/30 pb-2">
            Вътрешно поведение
          </h2>
          <ul className="space-y-2">
            {handbook.conductRules.map((rule, i) => (
              <li key={i} className="glass border border-neon-purple/20 rounded-lg px-4 py-2 text-sm font-body text-foreground/80 flex gap-2">
                <span className="text-neon-purple">•</span>
                {rule}
              </li>
            ))}
          </ul>
        </section>

        {/* Правилник на Police Department */}
        <section id="regulations-pd" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-amber-500 mb-4 border-b border-amber-500/30 pb-2">
            Правилник на Police Department
          </h2>
          <ul className="space-y-2 mb-8">
            {handbook.regulationsPd.general.map((rule, i) => (
              <li key={i} className="glass border border-amber-500/20 rounded-lg px-4 py-2 text-sm font-body text-foreground/85 flex gap-2">
                <span className="text-amber-500 shrink-0">•</span>
                {rule}
              </li>
            ))}
          </ul>
          <div className="space-y-6">
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-amber-500/20 bg-amber-500/10">
                <span className="font-heading font-bold text-amber-500 tracking-wide">{handbook.regulationsPd.boostingTitle}</span>
              </div>
              <ul className="divide-y divide-amber-500/10">
                {handbook.regulationsPd.boosting.map((b, i) => (
                  <li key={i} className="px-4 py-3 flex items-baseline gap-2">
                    <span className="font-medium text-foreground/95 text-sm shrink-0">{b.name}</span>
                    <span className="text-amber-500 shrink-0">—</span>
                    <span className="text-sm text-foreground/75">{b.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 shadow-sm">
              <div className="font-heading font-bold text-amber-500 text-sm mb-2 tracking-wide">{handbook.regulationsPd.helicopterTitle}</div>
              <p className="text-sm font-body text-foreground/85 leading-relaxed">{handbook.regulationsPd.helicopter}</p>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-amber-500/20 bg-amber-500/10">
                <span className="font-heading font-bold text-amber-500 tracking-wide">Бройки за обири</span>
              </div>
              <p className="px-4 pt-3 text-sm font-body text-foreground/80">{handbook.regulationsPd.robberiesIntro}</p>
              <ul className="px-4 pb-4 divide-y divide-amber-500/10">
                {handbook.regulationsPd.robberies.map((r, i) => (
                  <li key={i} className="py-3 flex items-baseline gap-2 first:pt-3">
                    <span className="font-medium text-foreground/95 text-sm shrink-0">{r.name}</span>
                    <span className="text-amber-500 shrink-0">—</span>
                    <span className="text-sm text-foreground/75">{r.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Вътрешни политики на отдела */}
        <section id="internal-policies" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-purple mb-4 border-b border-neon-purple/30 pb-2">
            1.0 — Вътрешни политики на отдела
          </h2>
          <div className="space-y-6">
            <div className="glass border border-neon-purple/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-purple text-sm mb-2">{handbook.internalPolicies.absence.title}</div>
              <ul className="text-sm font-body text-foreground/85 space-y-1">
                {handbook.internalPolicies.absence.points.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>
            <div className="glass border border-neon-purple/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-purple text-sm mb-2">{handbook.internalPolicies.resignation.title}</div>
              <ul className="text-sm font-body text-foreground/85 space-y-1">
                {handbook.internalPolicies.resignation.points.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>
            <div className="glass border border-neon-purple/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-purple text-sm mb-2">{handbook.internalPolicies.disciplinary.title}</div>
              <ul className="text-sm font-body text-foreground/85 space-y-1">
                {handbook.internalPolicies.disciplinary.points.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>
            <div className="glass border border-neon-purple/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-purple text-sm mb-2">{handbook.internalPolicies.penaltyPoints.title}</div>
              <ul className="text-sm font-body text-foreground/85 space-y-1">
                {handbook.internalPolicies.penaltyPoints.points.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Задължения по време на служба и униформи */}
        <section id="duties-uniforms" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-cyan mb-4 border-b border-neon-cyan/30 pb-2">
            1.1 — Задължения по време на служба & 1.2 — Униформи
          </h2>
          <div className="space-y-4">
            <p className="text-sm font-body text-foreground/85">{handbook.dutiesDuringService.minActivity}</p>
            <p className="text-sm font-body text-foreground/85">{handbook.dutiesDuringService.keyRole}</p>
            <p className="text-sm font-body text-foreground/85">{handbook.dutiesDuringService.cadets}</p>
            <p className="text-sm font-body text-foreground/85">{handbook.dutiesDuringService.physicalCondition}</p>
            <p className="text-sm font-body text-foreground/85">{handbook.dutiesDuringService.offDuty}</p>
            <p className="text-sm font-body text-foreground/85">{handbook.dutiesDuringService.reportCriminals}</p>
            <p className="text-sm font-body text-foreground/85">{handbook.dutiesDuringService.civiliansInCar}</p>
            <div className="glass border border-neon-cyan/20 rounded-xl p-4 mt-4">
              <div className="font-heading font-bold text-neon-cyan text-sm mb-1">1.2 Униформи</div>
              <p className="text-sm font-body text-foreground/85">{handbook.uniformsPolicy.general}</p>
              <p className="text-sm font-body text-neon-red/90 mt-2">{handbook.uniformsPolicy.noSwatPatrol}</p>
            </div>
          </div>
        </section>

        {/* Екипировка по ранг */}
        <section id="equipment" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-yellow mb-4 border-b border-neon-yellow/30 pb-2">
            1.3 — Екипировка по ранг
          </h2>
          <div className="space-y-2">
            {handbook.equipmentByRank.map((e, i) => (
              <div key={i} className="glass border border-neon-yellow/20 rounded-lg px-4 py-3 flex justify-between items-center gap-4">
                <span className="font-heading font-bold text-neon-yellow text-sm">{e.rank}</span>
                <span className="text-sm font-body text-foreground/85 text-right">{e.items}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Превозни средства */}
        <section id="vehicle-use" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-yellow mb-4 border-b border-neon-yellow/30 pb-2">
            1.4 — Използване на превозни средства
          </h2>
          <ul className="space-y-2">
            {handbook.vehicleUsePolicy.map((p, i) => (
              <li key={i} className="glass border border-neon-yellow/20 rounded-lg px-4 py-2 text-sm font-body text-foreground/85 flex gap-2">
                <span className="text-neon-yellow">•</span>
                {p}
              </li>
            ))}
          </ul>
        </section>

        {/* Отговор на обаждания */}
        <section id="response-calls" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-cyan mb-4 border-b border-neon-cyan/30 pb-2">
            1.6 — Отговор на обаждания
          </h2>
          <p className="text-sm font-body text-foreground/85 mb-4">{handbook.responseToCalls.startShift}</p>
          <div className="space-y-4">
            <div className="glass border border-neon-cyan/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-cyan text-sm mb-1">{handbook.responseToCalls.lowRisk.title}</div>
              <p className="text-xs text-muted-foreground mb-1">{handbook.responseToCalls.lowRisk.examples}</p>
              <p className="text-sm font-body text-foreground/85">{handbook.responseToCalls.lowRisk.response}</p>
            </div>
            <div className="glass border border-neon-cyan/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-cyan text-sm mb-1">{handbook.responseToCalls.shotsFired.title}</div>
              <p className="text-xs text-muted-foreground mb-1">{handbook.responseToCalls.shotsFired.context}</p>
              <p className="text-sm font-body text-foreground/85">{handbook.responseToCalls.shotsFired.response}</p>
            </div>
            <div className="glass border border-neon-cyan/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-cyan text-sm mb-1">{handbook.responseToCalls.storeAtm.title}</div>
              <p className="text-sm font-body text-foreground/85">{handbook.responseToCalls.storeAtm.response}</p>
            </div>
            <div className="glass border border-neon-cyan/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-cyan text-sm mb-1">{handbook.responseToCalls.bankJewelry.title}</div>
              <p className="text-sm font-body text-foreground/85">{handbook.responseToCalls.bankJewelry.response}</p>
            </div>
            <div className="glass border border-neon-cyan/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-cyan text-sm mb-1">{handbook.responseToCalls.gangConflict.title}</div>
              <p className="text-sm font-body text-foreground/85">{handbook.responseToCalls.gangConflict.response}</p>
            </div>
          </div>
        </section>

        {/* Примери разумно съмнение / вероятна причина */}
        <section id="suspicion-examples" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-cyan mb-4 border-b border-neon-cyan/30 pb-2">
            2.0 — Примери: разумно съмнение и вероятна причина
          </h2>
          <p className="text-sm font-body text-foreground/85 mb-2">{handbook.suspicionProbableCauseExamples.suspicion}</p>
          <p className="text-sm font-body text-foreground/85 mb-2">{handbook.suspicionProbableCauseExamples.probableCause}</p>
          <p className="text-sm font-body text-foreground/80 italic">{handbook.suspicionProbableCauseExamples.chronology}</p>
        </section>

        {/* Ескалация на сила — Статус 0–5 */}
        <section id="escalation-status" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-red mb-4 border-b border-neon-red/30 pb-2">
            3.1 — Ескалация на сила (Статус 0–5)
          </h2>
          <div className="space-y-3">
            {handbook.escalationStatus.map((s) => (
              <div key={s.status} className="glass border border-neon-red/20 rounded-xl p-4 flex gap-4">
                <span className="text-neon-red font-heading font-black shrink-0">Статус {s.status}</span>
                <div>
                  <div className="font-heading font-bold text-foreground text-sm">{s.name}</div>
                  <p className="text-sm font-body text-foreground/85 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Подразделения и отдели */}
        <section id="departments" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-cyan mb-4 border-b border-neon-cyan/30 pb-2">
            Отдели и сертификати
          </h2>
          <p className="text-sm font-body text-foreground/80 mb-4">
            Полицията на Лос Сантос предлага различни форми на професионално развитие. Текущи отдели:
          </p>
          <div className="space-y-4">
            {handbook.departmentsCertifications.map((d, i) => (
              <div key={i} className="glass border border-neon-cyan/20 rounded-xl p-4">
                <div className="font-heading font-bold text-neon-cyan text-sm mb-1">{d.name}</div>
                <p className="text-sm font-body text-foreground/85">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="qualifications" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-purple mb-4 border-b border-neon-purple/30 pb-2">
            Професионална квалификация
          </h2>
          <div className="space-y-4">
            {handbook.professionalQualifications.map((q) => (
              <div
                key={q.id}
                className={`glass border rounded-xl p-4 ${
                  q.border === "purple" ? "border-neon-purple/30" : "border-neon-cyan/30"
                }`}
              >
                <div className={`font-heading font-bold text-sm mb-2 ${q.border === "purple" ? "text-neon-purple" : "text-neon-cyan"}`}>
                  {q.title}
                </div>
                <ul className="text-sm font-body text-foreground/80 space-y-1">
                  {q.points.map((p, i) => (
                    <li key={i}>• {p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Impound */}
        <section id="impound">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-yellow mb-4 border-b border-neon-yellow/30 pb-2">
            Процедура при Impound
          </h2>
          <div className="space-y-4">
            <div className="glass border border-neon-yellow/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-yellow text-sm">{handbook.impoundProcedure.improperParking.title}</div>
              <p className="text-sm font-body text-foreground/80 mt-1">{handbook.impoundProcedure.improperParking.description}</p>
              <ul className="text-sm font-body text-foreground/80 mt-2 space-y-1">
                {handbook.impoundProcedure.improperParking.conditions.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>
            </div>
            <div className="glass border border-neon-yellow/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-yellow text-sm">{handbook.impoundProcedure.crime.title}</div>
              <p className="text-sm font-body text-foreground/80 mt-1">{handbook.impoundProcedure.crime.description}</p>
              <ul className="text-sm font-body text-foreground/80 mt-2 space-y-1">
                {handbook.impoundProcedure.crime.conditions.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>
            </div>
            <div className="glass border border-neon-yellow/20 rounded-xl p-4">
              <div className="font-heading font-bold text-neon-yellow text-sm">{handbook.impoundProcedure.general.title}</div>
              <ul className="text-sm font-body text-foreground/80 mt-2 space-y-1">
                {handbook.impoundProcedure.general.conditions.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Breach & Clear */}
        <section id="breach-clear">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-red mb-4 border-b border-neon-red/30 pb-2">
            Breach & Clear
          </h2>
          <p className="text-sm font-body text-foreground/80 mb-4">{handbook.breachClear.intro}</p>
          <div className="font-heading font-bold text-neon-red text-sm mb-2">{handbook.breachClear.considerationsTitle}</div>
          <ul className="space-y-2 mb-4">
            {handbook.breachClear.considerations.map((c, i) => (
              <li
                key={i}
                className={`text-sm font-body rounded-lg px-3 py-2 ${
                  c.critical ? "bg-neon-red/15 border border-neon-red/30" : c.quote ? "bg-white/5 border border-white/10 italic" : "glass border border-white/10"
                }`}
              >
                {c.text}
              </li>
            ))}
          </ul>
          <p className="text-sm font-body text-foreground/80 italic">{handbook.breachClear.slicingThePie}</p>
        </section>

        {/* 4.7 Нахлуване и почистване на сграда */}
        <section id="building-entry" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-red mb-4 border-b border-neon-red/30 pb-2">
            4.7 — Нахлуване и почистване на сграда
          </h2>
          <p className="text-sm font-body text-foreground/80 mb-4">{handbook.buildingEntryClear.intro}</p>
          <ol className="space-y-3 list-decimal list-inside">
            {handbook.buildingEntryClear.steps.map((step, i) => (
              <li key={i} className="text-sm font-body text-foreground/85 pl-2">
                {step}
              </li>
            ))}
          </ol>
        </section>

        {/* 4.8 Ситуации с заложници */}
        <section id="hostage" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-amber-400 mb-4 border-b border-amber-400/30 pb-2">
            4.8 — Ситуации с взети заложници
          </h2>
          <div className="glass border border-amber-400/20 rounded-xl p-4 mb-4">
            <p className="text-sm font-body text-foreground/90 font-medium">{handbook.hostageSituations.priority}</p>
          </div>
          <ul className="space-y-2">
            {handbook.hostageSituations.points.map((p, i) => (
              <li key={i} className="glass border border-amber-400/20 rounded-lg px-4 py-2 text-sm font-body text-foreground/85 flex gap-2">
                <span className="text-amber-400">•</span>
                {p}
              </li>
            ))}
          </ul>
        </section>

        {/* 4.9 Медицински спешни случаи */}
        <section id="medical" className="scroll-mt-24">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-cyan mb-4 border-b border-neon-cyan/30 pb-2">
            4.9 — Медицински спешни случаи
          </h2>
          <p className="text-sm font-body text-foreground/85 mb-4">{handbook.medicalEmergencies.emsCommand}</p>
          <div className="font-heading font-bold text-neon-cyan text-sm mb-2">Заподозрен с нужда от медицинска помощ</div>
          <ul className="space-y-2 mb-4">
            {handbook.medicalEmergencies.suspectNeedsMedical.map((p, i) => (
              <li key={i} className="text-sm font-body text-foreground/85 flex gap-2">
                <span className="text-neon-cyan shrink-0">•</span>
                {p}
              </li>
            ))}
          </ul>
        </section>

        {/* Санкции */}
        <section id="sanctions">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-red mb-4 border-b border-neon-red/30 pb-2">
            Санкции и наказания
          </h2>
          <div className="space-y-2">
            {handbook.sanctionsList.map((s, i) => (
              <div key={i} className="glass border border-neon-red/20 rounded-xl p-3 flex gap-3">
                <span className="font-heading font-bold text-neon-red text-sm shrink-0">{s.level}</span>
                <span className="text-sm font-body text-foreground/80">{s.description}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Често задавани въпроси */}
        <section id="faq">
          <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-cyan mb-4 border-b border-neon-cyan/30 pb-2">
            Често задавани въпроси
          </h2>
          <div className="space-y-3">
            {handbook.faqItems.map((item, i) => (
              <div key={i} className="glass border border-neon-cyan/20 rounded-xl p-4">
                <div className="font-heading font-bold text-foreground text-sm mb-1">{item.q}</div>
                <p className="text-sm font-body text-foreground/80">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </NoCopyWrapper>
    </div>
  );
}

export default function Police() {
  const { session, loading: authLoading, signOut } = useAuth();
  const [checkLoading, setCheckLoading] = useState(true);
  const [hasPoliceRole, setHasPoliceRole] = useState<boolean | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [discordLoginLoading, setDiscordLoginLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get("error");
    if (e === "no_role") setGateError("Нямате ролята „Полицай“ в Discord сървъра.");
    else if (e === "invalid_state") setGateError("Невалидна сесия. Опитайте отново.");
    else if (e === "token" || e === "user") setGateError("Грешка при връзка с Discord.");
    else if (e === "config") setGateError("Сървърът не е конфигуриран за вход.");
    else if (e) setGateError("Възникна грешка. Опитайте отново.");
  }, []);

  useEffect(() => {
    if (authLoading || !session) {
      setCheckLoading(authLoading);
      setHasPoliceRole(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        const token = s?.access_token;
        if (!token || cancelled) {
          if (!cancelled) setCheckLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke("check-police-role", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) return;
        if (error) {
          setHasPoliceRole(false);
          setCheckLoading(false);
          const msg = (data as { error?: string })?.error;
          if (msg === "discord_bot_not_configured") setGateError("Задай DISCORD_BOT_TOKEN в Supabase → Edge Functions → Secrets.");
          else if (msg === "server_error" || msg === "server_config") setGateError("Грешка в сървърната проверка. Провери логовете на check-police-role в Supabase Dashboard.");
          else setGateError("Проверката за роля не успя. Уверете се, че функцията check-police-role е деплойната и DISCORD_BOT_TOKEN е зададен.");
          return;
        }
        setHasPoliceRole(data?.hasRole === true);
        if (data?.hasRole !== true) {
          if (data?.error === "not_discord") setGateError("За тази страница е нужен вход с Discord.");
          else if (data?.error === "not_in_guild") setGateError("Не сте член на Discord сървъра ChillRP.");
          else if (data?.error === "missing_auth" || data?.error === "invalid_session") setGateError("Сесията изтече. Влезте отново с Discord.");
          else if (data?.error === "discord_bot_not_configured") setGateError("Сървърът не е конфигуриран. Задай DISCORD_BOT_TOKEN в Supabase Edge Function secrets.");
          else setGateError("Нямате ролята „Полицай“ в Discord сървъра.");
        } else {
          setGateError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setHasPoliceRole(false);
          setGateError("Грешка при проверка. Опитайте отново.");
        }
      } finally {
        if (!cancelled) setCheckLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [session, authLoading]);

  const handbook = usePoliceHandbook();

  const handleDiscordLogin = async () => {
    setDiscordLoginLoading(true);
    setGateError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/police`,
          scopes: "identify email",
        },
      });
      if (error) {
        setGateError("Грешка при вход с Discord.");
        setDiscordLoginLoading(false);
      }
    } catch {
      setGateError("Грешка при вход с Discord.");
      setDiscordLoginLoading(false);
    }
  };

  const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";
  const isDiscordSession =
    session?.user?.app_metadata?.provider === "discord" ||
    (session?.user as { identities?: { provider: string }[] })?.identities?.some((i) => i.provider === "discord");

  if (authLoading || (session && checkLoading)) {
    return (
      <div className="min-h-screen bg-background pt-28 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-neon-purple" />
      </div>
    );
  }

  if (!DISCORD_GATE_DISABLED && (!session || (hasPoliceRole !== true && !(isLocalhost && isDiscordSession)))) {
    return (
      <PoliceLoginGate
        onLogin={handleDiscordLogin}
        onLogout={signOut}
        error={gateError}
        loading={discordLoginLoading}
        accessDeniedOnly={!!session && hasPoliceRole === false}
      />
    );
  }

  if (handbook.loading) {
    return (
      <div className="min-h-screen bg-background pt-28 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-neon-purple" />
      </div>
    );
  }

  return <HandbookContent handbook={handbook.data} />;
}
