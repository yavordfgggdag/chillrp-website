import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Loader2, Plus, LogIn, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { HospitalRole } from "./HospitalLayout";
import type { Database } from "@/integrations/supabase/types";

type HospitalShift = Database["public"]["Tables"]["hospital_shifts"]["Row"];

function formatDt(s: string | null) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleString("bg-BG", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return s;
  }
}

export default function HospitalShifts() {
  const { role } = useOutletContext<{ role: HospitalRole }>();
  const { user } = useAuth();
  const [list, setList] = useState<HospitalShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const defaultStart = `${today}T08:00`;
  const defaultEnd = `${today}T16:00`;
  const [form, setForm] = useState({ started_at: defaultStart, ended_at: defaultEnd });

  const load = () => {
    supabase
      .from("hospital_shifts")
      .select("*")
      .order("started_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error) setList(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const displayName = user
    ? (user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name
      || (user as { email?: string }).email?.split("@")[0]
      || "Медик"
    : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("hospital_shifts").insert({
      user_id: user.id,
      user_name: displayName,
      started_at: form.started_at,
      ended_at: form.ended_at || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Грешка при запис на смяна.");
      return;
    }
    toast.success("Смяната е записана.");
    setForm({ started_at: defaultStart, ended_at: defaultEnd });
    setShowForm(false);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-heading font-bold tracking-widest uppercase text-neon-cyan">Работно време</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-cyan/20 text-neon-cyan font-heading font-semibold text-sm hover:bg-neon-cyan/30 transition-colors"
        >
          <Plus size={18} /> Запиши смяна
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="glass rounded-xl border border-white/10 p-6 mb-6 space-y-4">
          <h2 className="text-lg font-heading font-semibold text-foreground">Нова смяна</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-heading font-semibold text-muted-foreground mb-1">
                <LogIn size={14} /> Вход (начало)
              </label>
              <input
                type="datetime-local"
                value={form.started_at}
                onChange={(e) => setForm((f) => ({ ...f, started_at: e.target.value }))}
                className="w-full bg-background/50 border border-white/10 rounded-lg px-3 py-2 text-foreground"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-heading font-semibold text-muted-foreground mb-1">
                <LogOut size={14} /> Изход (край)
              </label>
              <input
                type="datetime-local"
                value={form.ended_at}
                onChange={(e) => setForm((f) => ({ ...f, ended_at: e.target.value }))}
                className="w-full bg-background/50 border border-white/10 rounded-lg px-3 py-2 text-foreground"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-neon-cyan text-background font-heading font-semibold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin inline" /> : "Запази"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-white/20 text-foreground font-heading font-semibold text-sm hover:bg-white/5"
            >
              Отказ
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10 glass">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-3 font-heading font-semibold text-muted-foreground text-xs uppercase tracking-wider">Медик</th>
              <th className="p-3 font-heading font-semibold text-muted-foreground text-xs uppercase tracking-wider">Вход</th>
              <th className="p-3 font-heading font-semibold text-muted-foreground text-xs uppercase tracking-wider">Изход</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-6 text-center text-muted-foreground text-sm">
                  Няма записани смени.
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-sm text-foreground/90 font-medium">{row.user_name}</td>
                  <td className="p-3 text-sm text-neon-cyan">{formatDt(row.started_at)}</td>
                  <td className="p-3 text-sm text-foreground/80">{formatDt(row.ended_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
