import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID") || "1471238721096646718";

// Болница: Медик, Шеф Медик
const HOSPITAL_MEDIC_ROLE_ID = "1471238721515819107";
const HOSPITAL_CHIEF_MEDIC_ROLE_ID = "1471238721515819108";

// Сервиз: Механик, Шеф Механик
const SERVICE_MECHANIC_ROLE_ID = "1471238721515819105";
const SERVICE_CHIEF_MECHANIC_ROLE_ID = "1471238721515819106";

function normalizeRoleId(r: unknown): string {
  return String(r).trim();
}

function getDiscordUserId(user: {
  identities?: Array<{ provider: string; provider_id?: string; identity_data?: Record<string, unknown> }>;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): string | null {
  const discordIdentity = user.identities?.find((i) => i.provider === "discord");
  if (discordIdentity) {
    const id =
      (discordIdentity as { provider_id?: string }).provider_id ||
      (discordIdentity.identity_data && typeof (discordIdentity.identity_data as { id?: string }).id === "string"
        ? (discordIdentity.identity_data as { id: string }).id
        : null) ||
      (discordIdentity.identity_data && typeof (discordIdentity.identity_data as { sub?: string }).sub === "string"
        ? (discordIdentity.identity_data as { sub: string }).sub
        : null);
    if (id) return normalizeRoleId(id);
  }
  const meta = user.user_metadata || user.app_metadata;
  if (meta && typeof (meta as { provider_id?: string }).provider_id === "string")
    return normalizeRoleId((meta as { provider_id: string }).provider_id);
  if (meta && typeof (meta as { discord_id?: string }).discord_id === "string")
    return normalizeRoleId((meta as { discord_id: string }).discord_id);
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(
        JSON.stringify({ role: null, hasAccess: false, error: "missing_auth" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ role: null, hasAccess: false, error: "server_config" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!botToken) {
      return new Response(
        JSON.stringify({ role: null, hasAccess: false, error: "discord_bot_not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: { module?: string } = {};
    try {
      body = await req.json();
    } catch {
      /* ignore */
    }
    const moduleType = (body?.module || "").toLowerCase();
    if (moduleType !== "hospital" && moduleType !== "service") {
      return new Response(
        JSON.stringify({ role: null, hasAccess: false, error: "invalid_module" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ role: null, hasAccess: false, error: "invalid_session" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let discordUserId: string | null = getDiscordUserId(user);
    if (!discordUserId && user.id) {
      try {
        const admin = (supabase.auth as { admin?: { getUserById: (id: string) => Promise<unknown> } }).admin;
        if (admin?.getUserById) {
          const res = (await admin.getUserById(user.id)) as { data?: { user?: { identities?: Array<{ provider: string; provider_id?: string; identity_data?: { id?: string; sub?: string } }> } } };
          const adminUser = res?.data?.user;
          const disc = adminUser?.identities?.find((i) => i.provider === "discord");
          if (disc) {
            const raw = disc.provider_id || disc.identity_data?.id || disc.identity_data?.sub;
            if (raw) discordUserId = normalizeRoleId(raw);
          }
        }
      } catch {
        /* ignore */
      }
    }

    if (!discordUserId) {
      return new Response(
        JSON.stringify({ role: null, hasAccess: false, error: "not_discord" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const memberRes = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${discordUserId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!memberRes.ok) {
      if (memberRes.status === 404) {
        return new Response(
          JSON.stringify({ role: null, hasAccess: false, error: "not_in_guild" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ role: null, hasAccess: false, error: "discord_api_error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const member = await memberRes.json();
    const roles: unknown[] = Array.isArray(member.roles) ? member.roles : [];
    const normalizedRoles = roles.map((r) => normalizeRoleId(r));

    if (moduleType === "hospital") {
      const hasChief = normalizedRoles.includes(HOSPITAL_CHIEF_MEDIC_ROLE_ID);
      const hasMedic = normalizedRoles.includes(HOSPITAL_MEDIC_ROLE_ID);
      const role = hasChief ? "chief_medic" : hasMedic ? "medic" : null;
      return new Response(
        JSON.stringify({ role, hasAccess: !!role }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (moduleType === "service") {
      const hasChief = normalizedRoles.includes(SERVICE_CHIEF_MECHANIC_ROLE_ID);
      const hasMechanic = normalizedRoles.includes(SERVICE_MECHANIC_ROLE_ID);
      const role = hasChief ? "chief_mechanic" : hasMechanic ? "mechanic" : null;
      return new Response(
        JSON.stringify({ role, hasAccess: !!role }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ role: null, hasAccess: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ role: null, hasAccess: false, error: "server_error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
