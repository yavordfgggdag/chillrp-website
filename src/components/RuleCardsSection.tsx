import { useState } from "react";
import type { RuleSection } from "@/lib/rules-types";

export type SectionWithId = RuleSection & { id: string };

type ThemeColor = "cyan" | "yellow" | "green" | "accent" | "red" | "purple";

const ACCENT_CARD = { border: "border-primary/30", text: "text-primary", bg: "bg-primary/5" };

const COLOR_MAP: Record<string, { border: string; text: string; bg: string }> = {
  red: { border: "border-primary/30", text: "text-primary", bg: "bg-primary/5" },
  cyan: { border: "border-neon-cyan/30", text: "text-neon-cyan", bg: "bg-neon-cyan/5" },
  yellow: { border: "border-neon-yellow/30", text: "text-neon-yellow", bg: "bg-neon-yellow/5" },
  accent: ACCENT_CARD,
  /** @deprecated legacy DB rows */
  purple: ACCENT_CARD,
  green: { border: "border-neon-green/30", text: "text-neon-green", bg: "bg-neon-green/5" },
};

function RuleCard({
  section,
  defaultTheme,
}: {
  section: SectionWithId;
  defaultTheme: ThemeColor;
}) {
  const [open, setOpen] = useState(false);
  const c = COLOR_MAP[section.color] || COLOR_MAP[defaultTheme];
  return (
    <div className={`glass border ${c.border} rounded-xl overflow-hidden`}>
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open ? "true" : "false"}
      >
        <span className="text-xl">{section.emoji}</span>
        <span className={`font-heading font-bold tracking-wider uppercase text-sm flex-1 ${c.text}`}>
          {section.title}
        </span>
        <span className="text-muted-foreground text-xs font-mono" aria-hidden>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className={`px-5 pb-5 pt-1 border-t ${c.border} ${c.bg} space-y-2.5`}>
          {section.items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 text-sm font-body text-foreground/80 leading-relaxed"
            >
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

type Props = {
  sections: SectionWithId[];
  themeColor: ThemeColor;
};

export default function RuleCardsSection({ sections, themeColor }: Props) {
  return (
    <div className="space-y-3">
      {sections.map((s) => (
        <RuleCard key={s.id} section={s} defaultTheme={themeColor} />
      ))}
      {sections.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">Няма секции.</div>
      )}
    </div>
  );
}
