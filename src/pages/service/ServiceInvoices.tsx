import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { ServiceRole } from "./ServiceLayout";
import type { Database } from "@/integrations/supabase/types";

const STORAGE_KEY = "service_invoices_table_missing";
const SKIP_FETCH_MS = 10 * 60 * 1000; // 10 min – след създаване на таблицата презареди страницата

const isLocalhostOrDev =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.origin.startsWith("http://127.0.0.1") ||
   (typeof import.meta !== "undefined" && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true));

function getSkipFetch(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const t = Number(raw);
    return Number.isFinite(t) && Date.now() - t < SKIP_FETCH_MS;
  } catch {
    return false;
  }
}

function setSkipFetch(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function clearSkipFetch(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

type ServiceInvoice = Database["public"]["Tables"]["service_invoices"]["Row"];

export default function ServiceInvoices() {
  const { role } = useOutletContext<{ role: ServiceRole }>();
  const { user } = useAuth();
  const [list, setList] = useState<ServiceInvoice[]>([]);
  const [loading, setLoading] = useState(() => (isLocalhostOrDev ? false : !getSkipFetch()));
  const [tableMissing, setTableMissing] = useState(() => isLocalhostOrDev || getSkipFetch());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ invoice_date: new Date().toISOString().slice(0, 10), client_name: "", description: "", amount: "" });
  const tableMissingRef = useRef(false);

  const load = () => {
    if (tableMissingRef.current || getSkipFetch()) {
      setLoading(false);
      setTableMissing(true);
      return;
    }
    setTableMissing(false);
    supabase
      .from("service_invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          const msg = String(error.message || "");
          const isMissing =
            error.code === "PGRST301" ||
            (error as { status?: number }).status === 404 ||
            msg.includes("404") ||
            msg.includes("relation") ||
            msg.includes("does not exist");
          if (isMissing) {
            tableMissingRef.current = true;
            setSkipFetch();
            setTableMissing(true);
          }
        } else {
          clearSkipFetch();
          setList(data || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (isLocalhostOrDev) {
      setLoading(false);
      setTableMissing(true);
      return;
    }
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const displayName = (user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name
      || (user as { email?: string }).email?.split("@")[0]
      || "Механик";
    const { error } = await supabase.from("service_invoices").insert({
      invoice_date: form.invoice_date,
      client_name: form.client_name.trim() || "—",
      description: form.description.trim() || "—",
      amount: form.amount.trim() || "0",
      issued_by_user_id: user.id,
      issued_by_name: displayName,
    });
    setSaving(false);
    if (error) {
      const msg = String(error.message || "");
      const isMissing =
        error.code === "PGRST301" ||
        (error as { status?: number }).status === 404 ||
        msg.includes("404") ||
        msg.includes("relation") ||
        msg.includes("does not exist");
      if (isMissing) {
        toast.error("Таблицата за фактури липсва. Стартирай supabase/RUN_THIS_service_invoices.sql в Supabase → SQL Editor.");
      } else {
        toast.error("Грешка при запис на фактура.");
      }
      return;
    }
    toast.success("Фактурата е добавена.");
    setForm({ invoice_date: new Date().toISOString().slice(0, 10), client_name: "", description: "", amount: "" });
    setShowForm(false);
    load();
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("Изтриване на тази фактура?")) return;
    const { error } = await supabase.from("service_invoices").delete().eq("id", id);
    if (error) toast.error("Грешка при изтриване.");
    else {
      toast.success("Фактурата е изтрита.");
      load();
    }
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
        <h1 className="text-2xl font-heading font-bold tracking-widest uppercase text-neon-yellow">Фактури</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          disabled={tableMissing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-yellow/20 text-neon-yellow font-heading font-semibold text-sm hover:bg-neon-yellow/30 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <Plus size={18} /> Добави фактура
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="glass rounded-xl border border-white/10 p-6 mb-6 space-y-4">
          <h2 className="text-lg font-heading font-semibold text-foreground">Нова фактура</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground mb-1">Дата</label>
              <input
                type="date"
                value={form.invoice_date}
                onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))}
                className="w-full bg-background/50 border border-white/10 rounded-lg px-3 py-2 text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground mb-1">Име на клиента</label>
              <input
                type="text"
                value={form.client_name}
                onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                className="w-full bg-background/50 border border-white/10 rounded-lg px-3 py-2 text-foreground"
                placeholder="Име"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-heading font-semibold text-muted-foreground mb-1">Описание</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full bg-background/50 border border-white/10 rounded-lg px-3 py-2 text-foreground"
              placeholder="Описание на услугата"
            />
          </div>
          <div>
            <label className="block text-xs font-heading font-semibold text-muted-foreground mb-1">Сума</label>
            <input
              type="text"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full bg-background/50 border border-white/10 rounded-lg px-3 py-2 text-foreground"
              placeholder="Сума"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-neon-yellow text-background font-heading font-semibold text-sm hover:opacity-90 disabled:opacity-50"
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
        {tableMissing && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-sm flex flex-wrap items-center justify-between gap-2">
            <span>
            Таблицата за фактури липсва в базата. Копирай съдържанието на <code className="bg-black/30 px-1 rounded">supabase/RUN_THIS_service_invoices.sql</code> (създава и Фактури, и Работно време) и го стартирай в Supabase → SQL Editor.
            </span>
            <button
              type="button"
              onClick={() => {
                if (isLocalhostOrDev) {
                  toast.info("Стартирай RUN_THIS_service_invoices.sql в Supabase → SQL Editor и презареди страницата (F5).");
                  return;
                }
                clearSkipFetch();
                tableMissingRef.current = false;
                setTableMissing(false);
                setLoading(true);
                load();
              }}
              className="shrink-0 px-3 py-1.5 rounded bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 text-xs font-semibold"
            >
              Опитай отново
            </button>
          </div>
        )}
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-3 font-heading font-semibold text-muted-foreground text-xs uppercase tracking-wider">Дата</th>
              <th className="p-3 font-heading font-semibold text-muted-foreground text-xs uppercase tracking-wider">Име</th>
              <th className="p-3 font-heading font-semibold text-muted-foreground text-xs uppercase tracking-wider">Описание</th>
              <th className="p-3 font-heading font-semibold text-muted-foreground text-xs uppercase tracking-wider">Сума</th>
              <th className="p-3 font-heading font-semibold text-muted-foreground text-xs uppercase tracking-wider">Издал</th>
              <th className="p-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">
                  Няма записани фактури.
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-sm text-foreground/90">{row.invoice_date}</td>
                  <td className="p-3 text-sm text-foreground/90">{row.client_name}</td>
                  <td className="p-3 text-sm text-foreground/80 max-w-[200px] truncate">{row.description}</td>
                  <td className="p-3 text-sm text-neon-yellow font-medium">{row.amount}</td>
                  <td className="p-3 text-sm text-muted-foreground">{row.issued_by_name || "—"}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => deleteInvoice(row.id)}
                      className="p-1.5 rounded text-red-400 hover:bg-red-500/10"
                      aria-label="Изтрий"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
