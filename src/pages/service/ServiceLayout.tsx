import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Wrench, Loader2, Home, List, BookOpen, FileText, Clock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ServiceRole = "mechanic" | "chief_mechanic" | null;

const NAV_ITEMS: { path: string; label: string; icon: React.ReactNode }[] = [
  { path: "/service", label: "Начало", icon: <Home size={18} /> },
  { path: "/service/prices", label: "Ценоразпис", icon: <List size={18} /> },
  { path: "/service/rules", label: "Правила", icon: <BookOpen size={18} /> },
  { path: "/service/invoices", label: "Фактури", icon: <FileText size={18} /> },
  { path: "/service/shifts", label: "Работно време", icon: <Clock size={18} /> },
];

export function useServiceRole(): { role: ServiceRole; hasAccess: boolean; loading: boolean; error: string | null } {
  const { session } = useAuth();
  const [role, setRole] = useState<ServiceRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const isLocalhost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.origin.startsWith("http://127.0.0.1"));
      const isDev =
        typeof import.meta !== "undefined" &&
        (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;
      if (isLocalhost || isDev) {
        setRole(session?.access_token ? "mechanic" : null);
        setError(session?.access_token ? null : "Влезте с Discord за достъп до Сервиза.");
        setLoading(false);
        return;
      }

      const token = session?.access_token;
      if (!token) {
        setRole(null);
        setLoading(false);
        setError("Влезте с Discord за достъп до Сервиза.");
        return;
      }

      try {
        const { data, err } = await supabase.functions.invoke("check-module-role", {
          body: { module: "service" },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (err) {
          setRole(null);
          setError("Грешка при проверка на ролята.");
          return;
        }
        const r = (data?.role as ServiceRole) ?? null;
        setRole(r);
        if (!data?.hasAccess) {
          if (data?.error === "not_discord") setError("За достъп е нужен вход с Discord.");
          else if (data?.error === "not_in_guild") setError("Не сте член на Discord сървъра ChillRP.");
          else if (data?.error === "missing_auth" || data?.error === "invalid_session") setError("Сесията изтече. Влезте отново.");
          else setError("Нямате роля Механик или Шеф Механик в Discord.");
        } else {
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setRole(null);
          setError("Грешка при проверка. Опитайте отново.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  return { role, hasAccess: role === "mechanic" || role === "chief_mechanic", loading, error };
}

export default function ServiceLayout() {
  const { role, hasAccess, loading, error } = useServiceRole();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-neon-yellow animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="glass rounded-2xl border border-white/10 p-8 max-w-md text-center">
          <Wrench className="h-12 w-12 text-neon-yellow/60 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-foreground mb-2">Нямате достъп</h1>
          <p className="text-muted-foreground text-sm mb-6">{error || "Само механици и шеф механици имат достъп до тази секция."}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-yellow/20 text-neon-yellow font-heading font-semibold text-sm hover:bg-neon-yellow/30 transition-colors"
          >
            <ArrowLeft size={16} /> Назад към сайта
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 glass-strong border-b border-white/10">
        <div className="container mx-auto px-4 flex items-center justify-between h-14 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-foreground/80 hover:text-neon-yellow transition-colors font-heading font-bold text-sm"
            >
              <ArrowLeft size={18} /> ChillRP
            </Link>
            <span className="text-muted-foreground/50 hidden sm:inline">|</span>
            <div className="flex items-center gap-1 flex-wrap">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-heading font-semibold tracking-wider text-muted-foreground hover:text-neon-yellow hover:bg-neon-yellow/10 transition-colors"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-neon-yellow">
            <Wrench size={20} />
            <span className="font-heading font-bold text-sm tracking-widest uppercase">Сервиз</span>
            {role === "chief_mechanic" && (
              <span className="text-xs bg-neon-yellow/20 text-neon-yellow px-2 py-0.5 rounded">Шеф</span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">
        <Outlet context={{ role }} />
      </main>
    </div>
  );
}
