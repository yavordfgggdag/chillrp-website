import { useState, useEffect } from "react";
import { Search, Crosshair } from "lucide-react";
import NoCopyWrapper from "@/components/NoCopyWrapper";
import { supabase } from "@/integrations/supabase/client";
import { CRIME_RULES } from "@/lib/crime-rules";
import type { RuleSection } from "@/lib/rules-types";

type SectionWithId = RuleSection & { id: string };

function RuleCard({ section }: { section: SectionWithId }) {
  const [open, setOpen] = useState(false);
  const colorMap: Record<string, { border: string; text: string; bg: string }> = {
    red: { border: "border-neon-red/30", text: "text-neon-red", bg: "bg-neon-red/5" },
    cyan: { border: "border-neon-cyan/30", text: "text-neon-cyan", bg: "bg-neon-cyan/5" },
    yellow: { border: "border-neon-yellow/30", text: "text-neon-yellow", bg: "bg-neon-yellow/5" },
    purple: { border: "border-neon-purple/30", text: "text-neon-purple", bg: "bg-neon-purple/5" },
    green: { border: "border-neon-green/30", text: "text-neon-green", bg: "bg-neon-green/5" },
  };
  const c = colorMap[section.color] || colorMap.purple;
  return (
    <div className={`glass border ${c.border} rounded-xl overflow-hidden`}>
      <button className="w-full flex items-center gap-3 px-5 py-4 text-left" onClick={() => setOpen(!open)}>
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
            <div className={`mt-3 pt-3 border-t ${c.border} text-xs font-body ${c.text} opacity-80 italic`}>
              ✅ {section.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const staticSections: SectionWithId[] = CRIME_RULES.map((s, i) => ({ ...s, id: `crime-${i}` }));

export default function CrimeRules() {
  const [search, setSearch] = useState("");
  const [sections, setSections] = useState<SectionWithId[]>(staticSections);

  useEffect(() => {
    supabase.from("rule_sections").select("id, page, emoji, title, color, items, note, sort_order").eq("page", "crime").eq("is_active", true).order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setSections(data.map((r) => ({ id: r.id, emoji: r.emoji || "", title: r.title, color: r.color || "purple", items: r.items || [], note: r.note ?? null })));
        }
        if (error) console.error("Crime rules load error:", error);
      });
  }, []);

  const filtered = sections.filter(
    (s) => s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.items.some((i) => i.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="relative py-14 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-neon-red/3" />
        <div className="container mx-auto max-w-3xl relative">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-red/40 bg-neon-red/10 text-neon-red text-xs font-heading font-semibold tracking-widest uppercase mb-5">
              <Crosshair size={13} /> Криминал
            </div>
            <h1 className="text-5xl md:text-6xl font-heading font-black tracking-widest uppercase mb-3">
              <span className="text-foreground">Правила за</span> <span className="text-neon-red">Криминал</span>
            </h1>
          </div>
          <div className="glass border border-neon-red/20 rounded-xl p-5 mb-4">
            <div className="text-xs font-heading font-bold tracking-widest uppercase text-neon-red mb-3">📌 НА КРАТКО</div>
            <div className="space-y-1 text-sm font-body text-foreground/80">
              <div className="flex items-center gap-2"><span className="text-neon-cyan">•</span> Crime = Roleplay, не DM арена</div>
              <div className="flex items-center gap-2"><span className="text-neon-cyan">•</span> Всяко действие трябва да има мотив и интеракция</div>
              <div className="flex items-center gap-2"><span className="text-neon-red">•</span> Без random killings / grief / farm</div>
            </div>
          </div>
          <div className="glass border border-neon-yellow/20 rounded-xl p-4 mb-5 text-xs font-body text-neon-yellow/80">
            ⚠️ ВАЖНО: Crime правилата се редактират постоянно. Препоръчително е да ги четете всяка седмица.
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-3xl px-4 pb-20">
        <div className="relative mb-5">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Търси правило..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl glass border border-border focus:border-neon-red/50 focus:outline-none text-sm font-body text-foreground placeholder:text-muted-foreground bg-transparent" />
        </div>
        <NoCopyWrapper>
        <div className="space-y-3">
          {filtered.map((s) => <RuleCard key={s.id} section={s} />)}
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Няма резултати.</div>}
        </div>
        <div className="mt-8 glass border border-neon-red/30 rounded-xl p-5 text-sm font-body text-foreground/70 leading-relaxed">
          <span className="text-neon-yellow font-bold">⚠️ ДИСКЛЕЙМЪР</span><br />
          Crime правилата се обновяват постоянно. Добра практика: прочитай ги всяка седмица.<br />
          Незнанието не е оправдание. Водещи са: логове + клипове + контекст + админ преценка.
        </div>
        </NoCopyWrapper>
      </div>
    </div>
  );
}
