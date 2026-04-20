import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type VoteSite = {
  id: string;
  name: string;
  url: string;
  reset_hours: number;
  sort_order: number;
};

export default function VotePage() {
  const [sites, setSites] = useState<VoteSite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase
      .from("mc_vote_sites")
      .select("id,name,url,reset_hours,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setSites(data as VoteSite[]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-heading font-bold tracking-widest uppercase mb-4">
            <ThumbsUp size={14} /> Подкрепа
          </div>
          <h1 className="text-4xl md:text-6xl font-heading font-black tracking-widest uppercase mb-3">
            <span className="text-foreground">Гласувай за </span>
            <span className="text-primary text-glow-accent">сървъра</span>
          </h1>
          <p className="text-sm text-muted-foreground font-body max-w-lg mx-auto">
            Всеки глас помага за видимост. Линковете се обновяват от екипа — ако липсва сайт, пиши в Discord.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
        ) : sites.length === 0 ? (
          <p className="text-center text-muted-foreground font-body py-16">
            Все още няма конфигурирани сайтове за гласуване.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {sites.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group glass border border-white/10 rounded-2xl p-6 hover:border-primary/40 transition-all flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-heading font-black text-lg tracking-wide text-foreground group-hover:text-primary transition-colors">
                    {s.name}
                  </h2>
                  <ExternalLink size={18} className="text-muted-foreground group-hover:text-primary shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground font-body">
                  Обновяване: на всеки ~{s.reset_hours} ч. (според сайта).
                </p>
              </a>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link to="/" className="text-sm text-primary font-heading font-semibold tracking-widest uppercase hover:underline">
            ← Начало
          </Link>
        </div>
      </div>
    </div>
  );
}
