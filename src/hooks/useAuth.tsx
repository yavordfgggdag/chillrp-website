import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isLogActivityEnabled, sendLogActivity } from "@/lib/logActivity";

export type SiteRole = "citizen" | "staff" | "administrator";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  siteRole: SiteRole | null;
  siteRoleLoading: boolean;
  hasPoliceRole: boolean | null;
  discordUsername: string | null;
  setDiscordUsername: (u: string) => void;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [hasPoliceRole, setHasPoliceRole] = useState<boolean | null>(null);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);

  const fetchDiscordUsername = async (userId: string, currentSession: Session | null) => {
    const session = currentSession ?? (await supabase.auth.getSession()).data.session;
    const discordIdentity = (session?.user as { identities?: { provider: string; identity_data?: { full_name?: string; name?: string } }[] })?.identities?.find(
      (i) => i.provider === "discord"
    );
    const fromSession = discordIdentity?.identity_data?.full_name || discordIdentity?.identity_data?.name || (session?.user as { user_metadata?: { full_name?: string } })?.user_metadata?.full_name;
    if (fromSession) {
      setDiscordUsername(fromSession);
      await supabase.from("profiles").upsert({ id: userId, discord_username: fromSession }, { onConflict: "id" });
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("discord_username")
      .eq("id", userId)
      .single();
    if (data && (data as { discord_username?: string | null }).discord_username) {
      setDiscordUsername((data as { discord_username: string }).discord_username);
    } else {
      setDiscordUsername(null);
    }
  };

  const fetchSiteRole = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.access_token || !isDiscordSession(currentSession)) {
      setSiteRole("citizen");
      setSiteRoleLoading(false);
      setHasPoliceRole(false);
      return;
    }
    if (
      typeof import.meta !== "undefined" &&
      (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true
    ) {
      setSiteRole("citizen");
      setHasPoliceRole(false);
      setSiteRoleLoading(false);
      return;
    }
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.origin.startsWith("http://127.0.0.1"))) {
      setSiteRole("citizen");
      setHasPoliceRole(false);
      setSiteRoleLoading(false);
      return;
    }
    setSiteRoleLoading(true);
    try {
      const [siteRes, policeRes] = await Promise.all([
        supabase.functions.invoke("check-site-role", {
          headers: { Authorization: `Bearer ${currentSession.access_token}` },
        }),
        supabase.functions.invoke("check-police-role", {
          headers: { Authorization: `Bearer ${currentSession.access_token}` },
        }),
      ]);
      if (siteRes.error) setSiteRole("citizen");
      else if (siteRes.data?.role) setSiteRole(siteRes.data.role as SiteRole);
      else setSiteRole("citizen");
      setHasPoliceRole(policeRes.error ? false : (policeRes.data?.hasRole === true));
    } catch {
      setSiteRole("citizen");
      setHasPoliceRole(false);
    } finally {
      setSiteRoleLoading(false);
    }
  };

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN" && session?.user) {
        fetchDiscordUsername(session.user.id, session);
        fetchSiteRole();
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
        fetchSiteRole();
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
  }, []);

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
        hasPoliceRole,
        discordUsername,
        setDiscordUsername,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
