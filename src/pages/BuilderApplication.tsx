import { useState } from "react";
import { Link } from "react-router-dom";
import { Hammer, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth, isDiscordOAuthSession } from "@/hooks/useAuth";

const initial = {
  ign: "",
  age_region: "",
  portfolio: "",
  specialties: "",
  availability: "",
  past_servers: "",
  why_tlr: "",
};

export default function BuilderApplication() {
  const { user, session } = useAuth();
  const [form, setForm] = useState(initial);
  const [sending, setSending] = useState(false);

  const onChange = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Влез с Discord, за да изпратиш кандидатура.");
      return;
    }
    if (!isDiscordOAuthSession(session)) {
      toast.error("Нужен е Discord вход.");
      return;
    }
    if (!form.ign.trim() || !form.why_tlr.trim()) {
      toast.error("Попълни поне ник и мотивация.");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from("builder_applications").insert({
        user_id: user.id,
        answers: { ...form },
      });
      if (error) {
        toast.error(error.message || "Грешка при изпращане.");
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-heading font-bold tracking-widest uppercase mb-4">
            <Hammer size={14} /> Builder
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-black tracking-widest uppercase">Кандидатура Builder</h1>
          <p className="text-sm text-muted-foreground font-body mt-3">
            Опиши стила си, примери и наличност. Екипът ще прегледа в Discord.
          </p>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4 glass border border-white/10 rounded-2xl p-6">
          <Field label="Minecraft ник" value={form.ign} onChange={onChange("ign")} required />
          <Field label="Възраст / регион (по желание)" value={form.age_region} onChange={onChange("age_region")} />
          <Area label="Портфолио (линкове, Imgur, GitHub…)" value={form.portfolio} onChange={onChange("portfolio")} rows={3} />
          <Area label="Специалности (средновековно, модерен град, терен…)" value={form.specialties} onChange={onChange("specialties")} rows={3} />
          <Area label="Наличност (часове / дни)" value={form.availability} onChange={onChange("availability")} rows={2} />
          <Area label="Опит на други сървъри" value={form.past_servers} onChange={onChange("past_servers")} rows={3} />
          <Area label="Защо TLR?" value={form.why_tlr} onChange={onChange("why_tlr")} rows={4} required />
          <button
            type="submit"
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-heading font-black text-sm tracking-widest uppercase bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">
        {label}
        {required && " *"}
      </label>
      <input
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/30 text-sm focus:border-primary/50 focus:outline-none"
      />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
  rows,
  required,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows: number;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">
        {label}
        {required && " *"}
      </label>
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        required={required}
        className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/30 text-sm focus:border-primary/50 focus:outline-none resize-none"
      />
    </div>
  );
}
