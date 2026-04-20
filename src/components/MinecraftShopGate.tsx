import { useEffect, useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const LS_IGN = "tlr_mc_shop_ign";

export default function MinecraftShopGate() {
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const resolveIgn = useCallback(async () => {
    let fromProfile: string | null = null;
    if (user?.id) {
      const { data } = await supabase.from("profiles").select("minecraft_username").eq("id", user.id).maybeSingle();
      const row = data as { minecraft_username?: string | null } | null;
      fromProfile = row?.minecraft_username?.trim() || null;
    }
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LS_IGN)?.trim() || null;
    } catch {
      stored = null;
    }
    const ign = fromProfile || stored;
    if (ign) {
      try {
        localStorage.setItem(LS_IGN, ign);
      } catch {
        /* ignore */
      }
      if (user?.id && !fromProfile) {
        await supabase.from("profiles").update({ minecraft_username: ign }).eq("id", user.id);
      }
      setOpen(false);
      return true;
    }
    setInput("");
    setOpen(true);
    return false;
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    setChecking(true);
    void (async () => {
      await resolveIgn();
      setChecking(false);
    })();
  }, [authLoading, resolveIgn]);

  const confirm = async () => {
    const v = input.trim();
    if (v.length < 2 || v.length > 32) {
      toast.error("Въведи валидно Minecraft име (2–32 символа).");
      return;
    }
    setSaving(true);
    try {
      try {
        localStorage.setItem(LS_IGN, v);
      } catch {
        /* ignore */
      }
      if (user?.id) {
        const { error } = await supabase.from("profiles").update({ minecraft_username: v }).eq("id", user.id);
        if (error) {
          toast.error(error.message || "Неуспешен запис в профила.");
          return;
        }
      }
      toast.success("Minecraft име запазено.");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 pt-24 px-4">
        <Loader2 className="h-9 w-9 text-primary animate-spin shrink-0" aria-hidden />
        <p className="text-sm text-muted-foreground font-body">Зареждане на магазина…</p>
      </div>
    );
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border border-primary/30 bg-background p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mc-gate-title"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="h-11 w-11 rounded-xl bg-primary/15 border border-primary/35 flex items-center justify-center text-primary shrink-0">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h2 id="mc-gate-title" className="font-heading font-black text-lg tracking-wide uppercase text-foreground">
                  Minecraft име
                </h2>
                <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed">
                  Въведи ника, с който играеш на сървъра. Трябва да съвпада с играта при доставка на покупки от магазина.
                </p>
              </div>
            </div>
            <label className="block text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1.5">
              Име в играта
            </label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Напр. Steve123"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/30 text-foreground font-mono text-sm focus:border-primary/50 focus:outline-none mb-4"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={saving}
              className="w-full py-3 rounded-xl font-heading font-black text-sm tracking-widest uppercase text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Потвърди и влез в магазина"}
            </button>
          </div>
        </div>
      )}
      {!open && <Outlet />}
    </>
  );
}
