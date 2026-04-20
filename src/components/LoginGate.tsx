import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth, isDiscordOAuthSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import mcBundled from "@/assets/tlr-mc-logo.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { isLoopbackHostname, isPrivateLanHostname } from "@/lib/devHost";
import { useBranding } from "@/hooks/useBranding";
import DiscordBrandIcon from "@/components/DiscordBrandIcon";
import DiscordGuildGate from "@/components/DiscordGuildGate";
import { getDiscordOAuthSignInOptions } from "@/lib/discordOAuth";
import { isSupabaseConfiguredForAuth } from "@/lib/supabaseSiteUrl";

/** Avoid navigating to another origin after OAuth (e.g. stale full URL in localStorage). */
function safePostAuthPath(stored: string | null): string {
  if (typeof window === "undefined") return "/";
  if (!stored) return "/";
  const t = stored.trim();
  if (!t) return "/";
  if (t.startsWith("//")) return "/";
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      if (u.origin !== window.location.origin) return "/";
      const path = u.pathname + u.search + u.hash;
      return path && path !== "/" ? path : "/";
    } catch {
      return "/";
    }
  }
  if (!t.startsWith("/")) return "/";
  return t;
}

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, loading, session, siteRole, siteRoleLoading, siteRoleError } = useAuth();
  const [discordLoading, setDiscordLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logoUrl } = useBranding();

  const hasOAuthCode = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return Boolean(sp.get("code")) || Boolean(sp.get("error")) || Boolean(sp.get("error_description"));
  }, [location.search]);

  /** OAuth errors returned in the URL (user cancelled, etc.) */
  useEffect(() => {
    if (typeof window === "undefined" || !hasOAuthCode) return;
    const sp = new URLSearchParams(window.location.search);
    const oauthError = sp.get("error") || sp.get("error_description");
    if (!oauthError) return;
    toast.error("Discord входът беше отказан или прекъснат.");
    navigate("/", { replace: true });
  }, [hasOAuthCode, navigate, location.search]);

  /**
   * PKCE is handled by Supabase client init (detectSessionInUrl). We only route away once session exists.
   */
  useEffect(() => {
    if (!hasOAuthCode || !user) return;
    const next = safePostAuthPath(localStorage.getItem("chillrp_post_auth_path"));
    localStorage.removeItem("chillrp_post_auth_path");
    navigate(next, { replace: true });
  }, [hasOAuthCode, user, navigate]);

  /**
   * Still have ?code= after auth settled → init exchange failed (e.g. redirect URL / origin mismatch).
   */
  useEffect(() => {
    if (!hasOAuthCode || user || loading) return;
    const sp = new URLSearchParams(window.location.search);
    if (!sp.get("code")) return;

    const timeoutId = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) return;
        console.error(
          "[Auth] OAuth callback: no session after PKCE. Add this exact URL to Supabase → Auth → Redirect URLs:",
          `${window.location.origin}/auth/callback`,
        );
        toast.error(
          "Грешка при Discord вход. За localhost добави в Supabase → Auth → Redirect URLs адреса от конзолата ([Auth] OAuth callback…).",
        );
        navigate("/", { replace: true });
      });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [hasOAuthCode, user, loading, navigate, location.search]);

  const handleDiscordLogin = async () => {
    if (!isSupabaseConfiguredForAuth()) {
      toast.error(
        "Липсва VITE_SUPABASE_URL в .env (https://…supabase.co от Dashboard → Settings → API). За npm run preview сложи ключовете в .env и пусни отново npm run build, после preview.",
      );
      return;
    }
    setDiscordLoading(true);
    try {
      // Remember where the user was trying to go
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      if (currentPath && currentPath !== "/auth/callback") {
        localStorage.setItem("chillrp_post_auth_path", currentPath);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: getDiscordOAuthSignInOptions(),
      });
      if (error) {
        toast.error("Грешка при вход с Discord.");
        console.error(error);
      }
    } catch (err) {
      toast.error("Грешка при вход с Discord.");
      console.error(err);
    } finally {
      setDiscordLoading(false);
    }
  };

  // Докато URL съдържа OAuth code, чакаме Supabase init / сесия — без втори PKCE exchange в кода.
  const oauthReturnPending = hasOAuthCode && !user;

  if (loading || oauthReturnPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 bg-[hsl(38_32%_5.5%)] text-amber-100/90 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,hsl(45_96%_58%/0.2)_0%,transparent_55%)]" />
        <div className="relative w-12 h-12 rounded-xl border border-amber-500/45 bg-amber-500/15 flex items-center justify-center shadow-[0_0_28px_-6px_rgba(251,191,36,0.45)]">
          <Loader2 className="h-6 w-6 text-amber-300 animate-spin" />
        </div>
        <p className="relative text-sm text-amber-200/85 font-body">
          {oauthReturnPending ? "Завършване на Discord вход..." : "Зареждане..."}
        </p>
      </div>
    );
  }

  // Local dev, vite preview on loopback, or LAN preview (optional): avoid OAuth → Supabase Site URL redirect.
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const allowLanBypass =
    String(import.meta.env.VITE_ALLOW_LOCAL_NO_LOGIN ?? "").toLowerCase() === "true" &&
    isPrivateLanHostname(hostname);
  const skipDiscordLoginGate =
    import.meta.env.DEV ||
    (import.meta.env.PROD && isLoopbackHostname(hostname)) ||
    allowLanBypass;

  if (!user && skipDiscordLoginGate) {
    return <>{children}</>;
  }

  const guildCheckPending =
    Boolean(user) &&
    !skipDiscordLoginGate &&
    isDiscordOAuthSession(session) &&
    (siteRoleLoading || (siteRole === null && !siteRoleError));

  if (guildCheckPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 bg-[hsl(38_32%_5.5%)] text-amber-100/90 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,hsl(45_96%_58%/0.2)_0%,transparent_55%)]" />
        <div className="relative w-12 h-12 rounded-xl border border-amber-500/45 bg-amber-500/15 flex items-center justify-center shadow-[0_0_28px_-6px_rgba(251,191,36,0.45)]">
          <Loader2 className="h-6 w-6 text-amber-300 animate-spin" />
        </div>
        <p className="relative text-sm text-amber-200/85 font-body">Проверка на Discord членство…</p>
      </div>
    );
  }

  if (
    user &&
    !skipDiscordLoginGate &&
    isDiscordOAuthSession(session) &&
    !siteRoleLoading &&
    siteRoleError === "not_in_guild"
  ) {
    return <DiscordGuildGate />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[hsl(38_30%_5.2%)] text-amber-50">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_22%,hsl(48_96%_58%/0.28)_0%,transparent_52%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,hsl(38_88%_48%/0.12)_0%,transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-950/40 via-transparent to-[hsl(38_35%_4%)]" />
        <div className="absolute inset-0 scanlines opacity-[0.12]" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <p className="text-[10px] font-heading font-black tracking-[0.35em] uppercase text-amber-400/90 mb-3">
            Общност
          </p>
          <img
            src={logoUrl || mcBundled}
            alt="Сървър"
            className="h-28 md:h-36 w-auto mb-8 drop-shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
            onError={(e) => {
              // If DB branding URL is broken, fall back to the bundled asset.
              if (logoUrl) (e.currentTarget as HTMLImageElement).src = mcBundled;
            }}
          />
          <h1 className="text-2xl md:text-3xl font-heading font-black tracking-widest uppercase mb-8 bg-gradient-to-r from-amber-100 via-amber-50 to-amber-200 bg-clip-text text-transparent">
            Вход с Discord
          </h1>
          <button
            onClick={handleDiscordLogin}
            disabled={discordLoading}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-heading font-bold text-base tracking-widest uppercase transition-all disabled:opacity-50 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 text-zinc-900 border border-amber-200/90 shadow-[0_0_36px_-6px_rgba(251,191,36,0.65)] hover:from-amber-200 hover:via-amber-300 hover:to-amber-500 hover:shadow-[0_0_44px_-4px_rgba(252,211,77,0.55)]"
          >
            {discordLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-zinc-800" />
            ) : (
              <>
                <DiscordBrandIcon size={24} className="w-6 h-6 text-zinc-800" />
                Влез с Discord
              </>
            )}
          </button>
          <p className="text-[10px] text-amber-600/55 font-body mt-8 tracking-wide">
            <Link to="/terms" className="hover:text-amber-500/90 transition-colors">
              Условия
            </Link>
            <span className="mx-1.5 text-amber-700/40">·</span>
            <Link to="/privacy" className="hover:text-amber-500/90 transition-colors">
              Поверителност
            </Link>
            <span className="mx-1.5 text-amber-700/40">·</span>
            <Link to="/cookies" className="hover:text-amber-500/90 transition-colors">
              Бисквитки
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
