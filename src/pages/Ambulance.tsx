import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ambulance as AmbulanceIcon, Loader2, Home, FileText, BookOpen, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SECTION_KEYS = ["ambulance_home", "ambulance_fakturi", "ambulance_pravila", "ambulance_cenorazpis"] as const;
const NAV_ITEMS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Начало", icon: <Home size={16} /> },
  { id: "fakturi", label: "Фактури", icon: <FileText size={16} /> },
  { id: "pravila", label: "Правила", icon: <BookOpen size={16} /> },
  { id: "cenorazpis", label: "Ценоразпис", icon: <List size={16} /> },
];

export default function Ambulance() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", SECTION_KEYS)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((r: { key: string; value: string }) => {
          map[r.key] = r.value;
        });
        SECTION_KEYS.forEach((k) => {
          if (!map[k]) map[k] = "";
        });
        setContent(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 glass-strong border-b border-white/10">
        <div className="container mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-heading font-black tracking-widest uppercase text-foreground/80 hover:text-neon-purple transition-colors text-sm">
              ChillRP
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <div className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-heading font-semibold tracking-wider text-muted-foreground hover:text-neon-purple hover:bg-neon-purple/10 transition-colors"
                >
                  {item.icon}
                  {item.label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-neon-cyan">
            <AmbulanceIcon size={20} />
            <span className="font-heading font-bold text-sm tracking-widest uppercase">ПС / Амбулант</span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-4xl px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 text-neon-purple animate-spin" />
          </div>
        ) : (
          <div className="space-y-16">
            <section id="home" className="scroll-mt-24">
              <h2 className="text-xl font-heading font-bold tracking-widest uppercase text-neon-cyan mb-4">Начало</h2>
              <div className="glass rounded-xl border border-white/8 p-6 font-body text-foreground/90 whitespace-pre-line">
                {content.ambulance_home || "Съдържанието се редактира от Админ панел → Амбулант."}
              </div>
            </section>
            <section id="fakturi" className="scroll-mt-24">
              <h2 className="text-xl font-heading font-bold tracking-widest uppercase text-neon-cyan mb-4">Фактури</h2>
              <div className="glass rounded-xl border border-white/8 p-6 font-body text-foreground/90 whitespace-pre-line">
                {content.ambulance_fakturi || "Секция Фактури. Редактирай от Админ панел → Амбулант."}
              </div>
            </section>
            <section id="pravila" className="scroll-mt-24">
              <h2 className="text-xl font-heading font-bold tracking-widest uppercase text-neon-cyan mb-4">Правила</h2>
              <div className="glass rounded-xl border border-white/8 p-6 font-body text-foreground/90 whitespace-pre-line">
                {content.ambulance_pravila || "Секция Правила. Редактирай от Админ панел → Амбулант."}
              </div>
            </section>
            <section id="cenorazpis" className="scroll-mt-24">
              <h2 className="text-xl font-heading font-bold tracking-widest uppercase text-neon-cyan mb-4">Ценоразпис</h2>
              <div className="glass rounded-xl border border-white/8 p-6 font-body text-foreground/90 whitespace-pre-line">
                {content.ambulance_cenorazpis || "Секция Ценоразпис. Редактирай от Админ панел → Амбулант."}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
