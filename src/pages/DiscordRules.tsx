import { useState, useEffect } from "react";
import { Search, Shield } from "lucide-react";
import NoCopyWrapper from "@/components/NoCopyWrapper";
import { supabase } from "@/integrations/supabase/client";
import { DISCORD_RULES } from "@/lib/discord-rules";
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

const staticSections: SectionWithId[] = DISCORD_RULES.map((s, i) => ({ ...s, id: `discord-${i}` }));

export default function DiscordRules() {
  const [search, setSearch] = useState("");
  const [sections, setSections] = useState<SectionWithId[]>(staticSections);

  useEffect(() => {
    supabase.from("rule_sections").select("id, page, emoji, title, color, items, note, sort_order").eq("page", "discord").eq("is_active", true).order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setSections(data.map((r) => ({ id: r.id, emoji: r.emoji || "", title: r.title, color: r.color || "purple", items: r.items || [], note: r.note ?? null })));
        }
        if (error) console.error("Discord rules load error:", error);
      });
  }, []);

  const filtered = sections.filter(
    (s) => s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.items.some((i) => i.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="relative py-14 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-neon-cyan/3" />
        <div className="container mx-auto max-w-3xl relative">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-semibold tracking-widest uppercase mb-5">
              <Shield size={13} /> Discord
            </div>
            <h1 className="text-5xl md:text-6xl font-heading font-black tracking-widest uppercase mb-3">
              <span className="gradient-text">Discord</span> <span className="text-foreground">Правила</span>
            </h1>
          </div>
          <div className="glass border border-neon-cyan/20 rounded-xl p-5 mb-8">
            <div className="text-xs font-heading font-bold tracking-widest uppercase text-neon-cyan mb-3">📌 НА КРАТКО</div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm font-body text-foreground/80">
              <div className="flex items-center gap-2"><span className="text-neon-green">✅</span> Уважение към всички</div>
              <div className="flex items-center gap-2"><span className="text-neon-green">✅</span> Без спам / реклами / токсичност</div>
              <div className="flex items-center gap-2"><span className="text-neon-green">✅</span> Тикети = ясни, по същество + доказателства</div>
              <div className="flex items-center gap-2"><span className="text-neon-red">⛔</span> Zero tolerance: doxx / заплахи / scam / NSFW</div>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-3xl px-4 pb-20">
        <div className="relative mb-5">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Търси правило..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl glass border border-border focus:border-neon-cyan/50 focus:outline-none text-sm font-body text-foreground placeholder:text-muted-foreground bg-transparent" />
        </div>
        <NoCopyWrapper>
        <div className="space-y-3">
          {filtered.map((s) => <RuleCard key={s.id} section={s} />)}
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Няма резултати.</div>}
        </div>
        <div className="mt-8 glass border border-neon-red/30 rounded-xl p-5 text-sm font-body text-foreground/70 leading-relaxed">
          <span className="text-neon-red font-bold">⚠️ СТАФА ЗАПАЗВА ПРАВОТО СИ ДА ПРОМЕНЯ ПО ВСЯКО ВРЕМЕ ПРАВИЛАТА</span><br />
          Незнанието не е оправдание. При спор водещи са: доказателства + контекст + админ преценка.
        </div>
        </NoCopyWrapper>
      </div>
    </div>
  );
}
