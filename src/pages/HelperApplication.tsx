import { useState } from "react";
import { Link } from "react-router-dom";
import { LifeBuoy, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth, isDiscordOAuthSession } from "@/hooks/useAuth";

const initial = {
  ign: "",
  languages: "",
  timezone: "",
  experience: "",
  conflict: "",
  why_helper: "",
};

export default function HelperApplication() {
  const { user, session } = useAuth();
  const [form, setForm] = useState(initial);
  const [sending, setSending] = useState(false);

  const onChange = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Влез с Discord.");
      return;
    }
    if (!isDiscordOAuthSession(session)) {
      toast.error("Нужен е Discord вход.");
      return;
    }
    if (!form.ign.trim() || !form.why_helper.trim()) {
      toast.error("Попълни ник и защо искаш да си Helper.");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from("helper_applications").insert({
        user_id: user.id,
        answers: { ...form },
      });
      if (error) {
        toast.error(error.message || "Грешка.");
        return;
      }
      toast.success("Кандидатурата е изпратена.");
      setForm(initial);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-bold tracking-widest uppercase mb-4">
            <LifeBuoy size={14} /> Helper
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-black tracking-widest uppercase">Кандидатура Helper</h1>
          <p className="text-sm text-muted-foreground font-body mt-3">
            Помощ на играчи, ориентация в Discord и спокоен тон. Прочети правилата за екип в раздел „Staff / Helper“.
          </p>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4 glass border border-white/10 rounded-2xl p-6">
          <div>
            <label className="block text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">
              Minecraft ник *
            </label>
            <input
              value={form.ign}
              onChange={onChange("ign")}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/30 text-sm focus:border-primary/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">
              Езици
            </label>
            <input
              value={form.languages}
              onChange={onChange("languages")}
              placeholder="BG, EN…"
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/30 text-sm focus:border-primary/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">
              Часова зона / график
            </label>
            <input
              value={form.timezone}
              onChange={onChange("timezone")}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/30 text-sm focus:border-primary/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">
              Опит (други сървъри, модерация)
            </label>
            <textarea
              value={form.experience}
              onChange={onChange("experience")}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/30 text-sm focus:border-primary/50 focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">
              Как би действал при конфликт в чат?
            </label>
            <textarea
              value={form.conflict}
              onChange={onChange("conflict")}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/30 text-sm focus:border-primary/50 focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">
              Защо искаш да си Helper? *
            </label>
            <textarea
              value={form.why_helper}
              onChange={onChange("why_helper")}
              rows={4}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/30 text-sm focus:border-primary/50 focus:outline-none resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-heading font-black text-sm tracking-widest uppercase bg-neon-cyan/90 text-black hover:bg-neon-cyan disabled:opacity-50"
          >
            {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            Изпрати
          </button>
        </form>

        <p className="text-center mt-8">
          <Link to="/applications" className="text-sm text-primary hover:underline font-heading font-semibold uppercase tracking-widest">
            ← Gang кандидатури
          </Link>
        </p>
      </div>
    </div>
  );
}
