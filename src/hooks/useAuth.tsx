import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";

/** true ако сесията е от Discord OAuth (магазин / тикет поток). */
export function isDiscordOAuthSession(session: Session | null): boolean {
  if (!session?.user) return false;
  const provider = session.user.app_metadata?.provider as string | undefined;
  if (provider === "discord") return true;
  const identities = (session.user as { identities?: { provider: string }[] }).identities;
  return identities?.some((i) => i.provider === "discord") ?? false;
}
import { supabase } from "@/integrations/supabase/client";
import { isLogActivityEnabled, sendLogActivity } from "@/lib/logActivity";

export type SiteRole = "citizen" | "staff" | "administrator";

export type SiteRoleError =
  | "not_in_guild"
  | "no_matching_role"
  | "not_discord"
  | "missing_auth"
  | "invalid_session"
  | "server_config"
  | "discord_api_error"
  | "server_error"
  | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  siteRole: SiteRole | null;
  siteRoleLoading: boolean;
  siteRoleError: SiteRoleError;
  hasPoliceRole: boolean | null;
  discordUsername: string | null;
  discordId: string | null;
  setDiscordUsername: (u: string) => void;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  /** Повторна проверка на Staff/Admin ролята в Discord (след промяна на роли в сървъра). */
  refreshSiteRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Fallback when used outside AuthProvider (e.g. during React Refresh/HMR) so the app does not crash */
const AUTH_FALLBACK: AuthContextType = {
  user: null,
  session: null,
  loading: true,
  siteRole: null,
  siteRoleLoading: false,
  siteRoleError: null,
  hasPoliceRole: null,
  discordUsername: null,
  discordId: null,
  setDiscordUsername: () => {},
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshSiteRole: async () => {},
};

function isDiscordSession(session: Session | null): boolean {
  if (!session?.user) return false;
  const provider = session.user.app_metadata?.provider as string | undefined;
  if (provider === "discord") return true;
  const identities = (session.user as { identities?: { provider: string }[] }).identities;
  return identities?.some((i) => i.provider === "discord") ?? false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteRole, setSiteRole] = useState<SiteRole | null>(null);
  const [siteRoleLoading, setSiteRoleLoading] = useState(false);
  const [siteRoleError, setSiteRoleError] = useState<SiteRoleError>(null);
  const [hasPoliceRole, setHasPoliceRole] = useState<boolean | null>(null);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);
  const [discordId, setDiscordId] = useState<string | null>(null);

  const siteRoleVisibleCooldownRef = useRef(0);
  const siteRoleVisibleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDiscordUsername = async (userId: string, currentSession: Session | null) => {
    const session = currentSession ?? (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) {
      return;
    }

    const user = session?.user as {
      identities?: { provider: string; provider_id?: string; identity_data?: { id?: string; sub?: string; full_name?: string; name?: string } }[];
      user_metadata?: { full_name?: string; provider_id?: string; discord_id?: string };
      app_metadata?: { provider_id?: string; discord_id?: string };
    } | null;

    const discordIdentity = user?.identities?.find((i) => i.provider === "discord");

    let discordId: string | null =
      (discordIdentity as { provider_id?: string } | undefined)?.provider_id ??
      discordIdentity?.identity_data?.id ??
      discordIdentity?.identity_data?.sub ??
      null;

    const meta = user?.user_metadata || user?.app_metadata;
    if (!discordId && meta) {
      if (typeof meta.provider_id === "string") discordId = meta.provider_id;
      else if (typeof meta.discord_id === "string") discordId = meta.discord_id;
    }

    const fromSession =
      discordIdentity?.identity_data?.full_name ||
      discordIdentity?.identity_data?.name ||
      user?.user_metadata?.full_name;

    if (fromSession || discordId) {
      if (fromSession) setDiscordUsername(fromSession);
      if (discordId) setDiscordId(discordId);
      const updates: { id: string; discord_username?: string; discord_id?: string } = { id: userId };
      if (fromSession) updates.discord_username = fromSession;
      if (discordId) updates.discord_id = discordId;
      const { error: upsertErr } = await supabase.from("profiles").upsert(updates, { onConflict: "id" });
      if (upsertErr) {
        // RLS/401 — не хвърляме; UI вече е обновен от сесията
      }
      return;
    }
    const { data, error: selectErr } = await supabase
      .from("profiles")
      .select("discord_username, discord_id")
      .eq("id", userId)
      .single();
    if (selectErr) {
      return;
    }
    const row = data as { discord_username?: string | null; discord_id?: string | null } | null;
    setDiscordUsername(row?.discord_username ?? null);
    setDiscordId(row?.discord_id ?? null);
  };

  const fetchSiteRole = useCallback(async () => {
    let { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.access_token) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      currentSession = refreshData.session ?? null;
    }
    if (!currentSession?.access_token || !isDiscordSession(currentSession)) {
      setSiteRole("citizen");
      setSiteRoleError("not_discord");
      setSiteRoleLoading(false);
      setHasPoliceRole(null);
      return;
    }
    // Винаги викаме check-site-role (и на localhost), за да се показват правилно Staff/Admin в профила.
    // Полицейският раздел не ползва check-police-role тук — достъпът е отворен в PoliceLayout.
    setSiteRoleLoading(true);
    const token = currentSession.access_token;

    const runChecks = async (retry = false): Promise<void> => {
      const siteRes = await supabase.functions.invoke("check-site-role", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const siteError = siteRes.data?.error as string | undefined;
      const needRetry = !retry && siteError === "invalid_session";
      if (needRetry) {
        await new Promise((r) => setTimeout(r, 300));
        const { data: retryData } = await supabase.auth.refreshSession();
        const retryToken = retryData.session?.access_token;
        if (retryToken) {
          const siteR = await supabase.functions.invoke("check-site-role", { headers: { Authorization: `Bearer ${retryToken}` } });
          if (!siteR.error && siteR.data?.role) {
            setSiteRole(siteR.data.role as SiteRole);
            setSiteRoleError(null);
          } else {
            setSiteRole("citizen");
            setSiteRoleError((siteR.data?.error as SiteRoleError) || null);
          }
        } else {
          setSiteRole("citizen");
          setSiteRoleError(null);
        }
        setHasPoliceRole(null);
        return;
      }
      if (siteRes.error) {
        setSiteRole("citizen");
        setSiteRoleError("server_error");
      } else if (siteRes.data?.role) {
        setSiteRole(siteRes.data.role as SiteRole);
        setSiteRoleError(null);
      } else {
        setSiteRole("citizen");
        setSiteRoleError((siteRes.data?.error as SiteRoleError) || "no_matching_role");
      }
      setHasPoliceRole(null);
    };

    try {
      await runChecks();
    } catch {
      setSiteRole("citizen");
      setSiteRoleError("server_error");
      setHasPoliceRole(null);
    } finally {
      setSiteRoleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      if (siteRoleVisibleDebounceRef.current) {
        clearTimeout(siteRoleVisibleDebounceRef.current);
        siteRoleVisibleDebounceRef.current = null;
      }
      return;
    }

    const minIntervalMs = 90_000;
    const debounceMs = 550;

    const runIfAllowed = () => {
      const now = Date.now();
      if (now - siteRoleVisibleCooldownRef.current < minIntervalMs) return;
      siteRoleVisibleCooldownRef.current = now;
      void fetchSiteRole();
    };

    const schedule = () => {
      if (siteRoleVisibleDebounceRef.current) clearTimeout(siteRoleVisibleDebounceRef.current);
      siteRoleVisibleDebounceRef.current = setTimeout(() => {
        siteRoleVisibleDebounceRef.current = null;
        runIfAllowed();
      }, debounceMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") schedule();
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (siteRoleVisibleDebounceRef.current) {
        clearTimeout(siteRoleVisibleDebounceRef.current);
        siteRoleVisibleDebounceRef.current = null;
      }
    };
  }, [user, fetchSiteRole]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "TOKEN_REFRESHED" && session?.user && isDiscordSession(session)) {
        void fetchSiteRole();
      }
      if (event === "SIGNED_IN" && session?.user) {
        fetchDiscordUsername(session.user.id, session);
        void fetchSiteRole();
        if (isLogActivityEnabled()) {
          sendLogActivity({
            event: "login",
            details: `Влезе в акаунта: ${session.user.email || "Discord"}`,
            user_email: session.user.email,
            user_id: session.user.id,
            page: window.location.pathname,
            timestamp: new Date().toISOString(),
          });
        }
      }
      if (event === "SIGNED_OUT") {
        setDiscordUsername(null);
        setSiteRole(null);
        setSiteRoleError(null);
        setHasPoliceRole(null);
        if (isLogActivityEnabled()) {
          sendLogActivity({
            event: "logout",
            details: "Излезе от акаунта",
            user_email: null,
            user_id: null,
            page: window.location.pathname,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchDiscordUsername(session.user.id, session);
        void fetchSiteRole();
      } else {
        setSiteRoleLoading(false);
      }
    }).finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });

    timeoutId = setTimeout(() => setLoading(false), 4000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchSiteRole]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        siteRole,
        siteRoleLoading,
        siteRoleError,
        hasPoliceRole,
        discordUsername,
        discordId,
        setDiscordUsername,
        signUp,
        signIn,
        signOut,
        refreshSiteRole: fetchSiteRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) return AUTH_FALLBACK;
  return ctx;
}
