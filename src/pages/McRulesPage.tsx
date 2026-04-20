import { useState, useEffect, useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Search, Shield } from "lucide-react";
import NoCopyWrapper from "@/components/NoCopyWrapper";
import { supabase } from "@/integrations/supabase/client";
import type { RuleSection } from "@/lib/rules-types";
import { MC_GENERAL_RULES } from "@/lib/mc-general-rules";
import { MC_CHAT_RULES } from "@/lib/mc-chat-rules";
import { MC_SMP_RULES } from "@/lib/mc-smp-rules";
import { MC_FACTIONS_RULES } from "@/lib/mc-factions-rules";
import { DISCORD_RULES } from "@/lib/discord-rules";
import { MC_ANTICHEAT_RULES } from "@/lib/mc-anticheat-rules";
import { MC_PUNISHMENT_RULES } from "@/lib/mc-punishment-rules";
import { MC_STAFF_RULES } from "@/lib/mc-staff-rules";

type SectionWithId = RuleSection & { id: string };

type RulePageConfig = {
  title: string;
  badge: string;
  /** Ако е зададено — зарежда се от rule_sections; иначе само статичният списък. */
  dbPage: string | null;
  staticSections: RuleSection[];
};

const RULE_PAGES: Record<string, RulePageConfig> = {
  general: {
    title: "Общи правила",
    badge: "Сървър",
    dbPage: "server",
    staticSections: MC_GENERAL_RULES,
  },
  chat: {
    title: "Правила за чат",
    badge: "Комуникация",
    dbPage: null,
    staticSections: MC_CHAT_RULES,
  },
  smp: {
    title: "SMP правила",
    badge: "Survival",
    dbPage: null,
    staticSections: MC_SMP_RULES,
  },
  factions: {
    title: "Factions правила",
    badge: "PvP",
    dbPage: null,
    staticSections: MC_FACTIONS_RULES,
  },
  discord: {
    title: "Discord правила",
    badge: "Discord",
    dbPage: "discord",
    staticSections: DISCORD_RULES,
  },
  anticheat: {
    title: "Anti-cheat политика",
    badge: "Сигурност",
    dbPage: null,
    staticSections: MC_ANTICHEAT_RULES,
  },
  punishments: {
    title: "Наказания и апелации",
    badge: "Модерация",
    dbPage: null,
    staticSections: MC_PUNISHMENT_RULES,
  },
  staff: {
    title: "Staff и Helper",
    badge: "Екип",
    dbPage: null,
    staticSections: MC_STAFF_RULES,
  },
};

function RuleCard({ section }: { section: SectionWithId }) {
  const [open, setOpen] = useState(false);
  const colorMap: Record<string, { border: string; text: string; bg: string }> = {
    red: { border: "border-primary/30", text: "text-primary", bg: "bg-primary/5" },
    cyan: { border: "border-neon-cyan/30", text: "text-neon-cyan", bg: "bg-neon-cyan/5" },
    yellow: { border: "border-neon-yellow/30", text: "text-neon-yellow", bg: "bg-neon-yellow/5" },
    accent: { border: "border-primary/30", text: "text-primary", bg: "bg-primary/5" },
    purple: { border: "border-primary/30", text: "text-primary", bg: "bg-primary/5" },
    green: { border: "border-neon-green/30", text: "text-neon-green", bg: "bg-neon-green/5" },
  };
  const c = colorMap[section.color] || colorMap.accent;
  return (
    <div className={`glass border ${c.border} rounded-xl overflow-hidden transition-colors hover:border-primary/25`}>
      <button type="button" className="w-full flex items-center gap-3 px-5 py-4 text-left" onClick={() => setOpen(!open)}>
        <span className="text-xl">{section.emoji}</span>
        <span className={`font-heading font-bold tracking-wider uppercase text-sm flex-1 ${c.text}`}>{section.title}</span>
        <span className="text-muted-foreground text-xs font-mono">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className={`px-5 pb-5 pt-1 border-t ${c.border} ${c.bg} space-y-2.5`}>
          {section.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm font-body text-foreground/80 leading-relaxed">
              <span className={`${c.text} font-bold shrink-0 text-xs mt-0.5`}>•</span>
              <span>{item}</span>
            </div>
          ))}
          {section.note && (
            <div className={`mt-3 pt-3 border-t ${c.border} text-xs font-body ${c.text} opacity-80 italic`}>✅ {section.note}</div>
          )}
        </div>
      )}
    </div>
  );
}

function toSectionsWithId(prefix: string, rules: RuleSection[]): SectionWithId[] {
  return rules.map((s, i) => ({ ...s, id: `${prefix}-${i}` }));
}

export default function McRulesPage() {
  const { section: raw } = useParams<{ section: string }>();
  const section = raw === "server" ? "general" : raw;
  const cfg = section ? RULE_PAGES[section] : undefined;

  const [sections, setSections] = useState<SectionWithId[]>(() =>
    cfg ? toSectionsWithId(section!, cfg.staticSections) : []
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!cfg) return;
    const staticMapped = toSectionsWithId(section!, cfg.staticSections);
    if (!cfg.dbPage) {
      setSections(staticMapped);
      return;
    }
    let cancelled = false;
    supabase
      .from("rule_sections")
      .select("id, page, emoji, title, color, items, note, sort_order")
      .eq("page", cfg.dbPage)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data && data.length > 0) {
          setSections(
            data.map((r) => ({
              id: r.id,
              emoji: r.emoji || "",
              title: r.title,
              color: r.color || "accent",
              items: r.items || [],
              note: r.note ?? null,
            }))
          );
        } else {
          setSections(staticMapped);
        }
        if (error) console.error("Rules load error:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [cfg, section]);

  if (!cfg) {
    return <Navigate to="/rules" replace />;
  }

  const filtered = useMemo(
    () =>
      sections.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.items.some((i) => i.toLowerCase().includes(search.toLowerCase()))
      ),
    [sections, search]
  );

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="relative py-14 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-primary/[0.04]" />
        <div className="container mx-auto max-w-3xl relative">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-heading font-semibold tracking-widest uppercase mb-5">
              <Shield size={13} /> {cfg.badge}
            </div>
            <h1 className="text-4xl md:text-6xl font-heading font-black tracking-widest uppercase mb-3">
              {(() => {
                const words = cfg.title.split(" ");
                const [first, ...rest] = words;
                return (
                  <>
                    <span className="text-foreground">{first}</span>
                    {rest.length > 0 ? (
                      <>
                        {" "}
                        <span className="text-primary text-glow-accent">{rest.join(" ")}</span>
                      </>
                    ) : null}
                  </>
                );
              })()}
            </h1>
            <p className="text-sm text-muted-foreground font-body max-w-lg mx-auto mb-6">
              Структурирани правила за Minecraft общността.{" "}
              <Link to="/rules" className="text-primary hover:underline">
                Всички раздели
              </Link>
            </p>
            <NoCopyWrapper>
              <div className="relative max-w-md mx-auto">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Търсене в правилата…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl glass border border-white/10 focus:border-primary/45 focus:outline-none text-sm font-body text-foreground placeholder:text-muted-foreground bg-transparent"
                />
              </div>
            </NoCopyWrapper>
          </div>

          <div className="space-y-3 pb-20">
            {filtered.map((s) => (
              <RuleCard key={s.id} section={s} />
            ))}
            {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm font-body">Няма съвпадения.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
