import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Loader2, Edit2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ServiceRole } from "./ServiceLayout";

const KEY = "service_cenorazpis";

export default function ServicePrices() {
  const { role } = useOutletContext<{ role: ServiceRole }>();
  const canEdit = role === "chief_mechanic";
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    supabase
      .from("site_settings")
      .select("key, value")
      .eq("key", KEY)
      .maybeSingle()
      .then(({ data }) => {
        const val = (data as { value?: string } | null)?.value ?? "Ценоразпис на услугите. Редактира се от Шеф Механик.";
        setContent(val);
        setEditValue(val);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert(
      { key: KEY, value: editValue, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    setSaving(false);
    if (error) {
      toast.error("Грешка при запис.");
      return;
    }
    setContent(editValue);
    setEditing(false);
    toast.success("Ценоразписът е запазен.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 text-neon-yellow animate-spin" />
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-heading font-bold tracking-widest uppercase text-neon-yellow">Ценоразпис</h1>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neon-yellow/20 text-neon-yellow text-sm font-heading font-semibold hover:bg-neon-yellow/30 transition-colors"
          >
            <Edit2 size={16} /> Редактирай
          </button>
        )}
      </div>

      {editing ? (
        <div className="glass rounded-xl border border-white/10 p-6">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full min-h-[200px] bg-background/50 border border-white/10 rounded-lg p-4 text-foreground font-body resize-y"
            placeholder="Текст на ценоразписа..."
          />
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-yellow text-background font-heading font-semibold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Запази
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setEditValue(content); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-foreground font-heading font-semibold text-sm hover:bg-white/5"
            >
              <X size={16} /> Отказ
            </button>
          </div>
        </div>
      ) : (
        <div className="glass rounded-xl border border-white/10 p-6 font-body text-foreground/90 whitespace-pre-line">
          {content}
        </div>
      )}
    </section>
  );
}
