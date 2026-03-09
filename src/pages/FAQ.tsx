import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";

type FaqItem = {
  id: string; category: string; question: string; answer: string;
  sort_order: number; is_active: boolean;
};

/** Резервни въпроси, когато няма данни от базата. Експортирани за seed в админ панела. */
export const defaultFaqItems: FaqItem[] = [
  { id: "1", category: "Сървър", question: "Кога ще се пусне сървърът?", answer: "Официалното отваряне е на 20.03.2026 в 20:00 ч. Следете Discord и сайта за актуализации.", sort_order: 1, is_active: true },
  { id: "2", category: "Сървър", question: "Къде мога да намеря линк към сървъра и Discord?", answer: "Линковете са на главната страница и в официалния Discord сървър. Влез в Discord за IP, правила и събития.", sort_order: 2, is_active: true },
  { id: "3", category: "Сайт и поддръжка", question: "Къде мога да пусна тикет?", answer: "Тикети се пускат чрез официалния Discord — в канала за тикети или чрез бот за поддръжка. На главната страница има линк към Discord.", sort_order: 3, is_active: true },
  { id: "4", category: "Сайт и поддръжка", question: "Как да се свържа с екипа?", answer: "Чрез тикет в Discord или в канала за поддръжка. Линкът към Discord е на главната страница.", sort_order: 4, is_active: true },
  { id: "5", category: "Правила", question: "Къде са правилата на сървъра?", answer: "Общите правила са в Discord — канал „Правила“ или #rules. Правилата на полицията са в наръчника на страница Полиция.", sort_order: 5, is_active: true },
  { id: "6", category: "Общи", question: "Какво предлага ChillRP?", answer: "ChillRP е ролева общност с FiveM сървър — полиция, банди, икономика и др. Сайтът съдържа наръчници, правила, новини и линкове към Discord и сървъра.", sort_order: 6, is_active: true },
  { id: "7", category: "Общи", question: "Как да се присъединя към полицията?", answer: "Кандидатствайте чрез Discord. Полицията работи с whitelist — след одобрение преминете обучение и стаж.", sort_order: 7, is_active: true },
];

export default function FAQ() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("faq_items").select("*").eq("is_active", true).order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("FAQ load error:", error);
          setItems(defaultFaqItems);
        } else if (data && data.length > 0) {
          setItems(data as FaqItem[]);
        } else {
          setItems(defaultFaqItems);
        }
        setLoading(false);
      })
      .catch(() => { setItems(defaultFaqItems); setLoading(false); });
  }, []);

  // Group by category
  const categories = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FaqItem[]>);

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-purple/30 bg-neon-purple/10 text-neon-purple text-xs font-heading font-semibold tracking-widest uppercase mb-5">
            <HelpCircle size={13} /> Често задавани въпроси
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold gradient-text mb-4">FAQ</h1>
          <p className="text-muted-foreground font-body max-w-xl mx-auto">
            Намери отговор на най-честите въпроси за ChillRP — от присъединяване и правила до банди и старт.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground font-body">Зарежда...</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(categories).map(([cat, catItems]) => (
              <div key={cat} className="glass rounded-2xl border border-white/6 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                  <h2 className="font-heading font-bold text-lg text-foreground tracking-wide">{cat}</h2>
                </div>
                <div className="px-6">
                  <Accordion type="single" collapsible className="w-full">
                    {catItems.map((item, i) => (
                      <AccordionItem key={item.id} value={item.id} className="border-b border-white/5 last:border-0">
                        <AccordionTrigger className="text-left text-sm font-heading font-semibold tracking-wide text-foreground/90 hover:text-neon-purple hover:no-underline py-4 transition-colors">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground font-body leading-relaxed pb-4 whitespace-pre-line">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 glass rounded-2xl border border-neon-purple/20 p-8 text-center">
          <p className="text-muted-foreground font-body mb-4">Не намери отговор на въпроса си?</p>
          <a href="https://discord.gg/PurCqNHh" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-neon-purple/50 bg-neon-purple/12 text-neon-purple font-heading font-bold tracking-widest uppercase text-sm hover:bg-neon-purple/22 glow-purple transition-all">
            Попитай в Discord
          </a>
        </div>
      </div>
    </main>
  );
}
