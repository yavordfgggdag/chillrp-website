import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID") || Deno.env.get("DISCORD_POLICE_GUILD_ID") || "1471238721096646718";

// Резервни ID-та ако съвпадение по име не се намери (различен сървър)
const FALLBACK_ROLE_STAFF = "1471238721549504764";
const FALLBACK_ROLE_ADMINISTRATOR = "1471238721566146796";

function normalizeRoleId(r: unknown): string {
  return String(r).trim();
}

/** Взима ролите на сървъра от Discord и връща ID за Staff и за Administrator/Основател (по име, с fallback). */
async function resolveSiteRoleIds(botToken: string): Promise<{ staffRoleId: string; administratorRoleIds: string[] }> {
  const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  const roleIdByName = new Map<string, string>();
  if (res.ok) {
    const guildRoles: { id: string; name?: string }[] = await res.json();
    for (const r of guildRoles) {
      const rawName = (r.name || "").trim();
      const name = rawName.toLowerCase();
      if (name) roleIdByName.set(name, normalizeRoleId(r.id));
    }
  } else {
    console.error("resolveSiteRoleIds: guild roles request failed", res.status, await res.text());
  }
  const staffRoleId = roleIdByName.get("staff") || FALLBACK_ROLE_STAFF;
  const adminIds: string[] = [];
  if (roleIdByName.get("основател")) adminIds.push(roleIdByName.get("основател")!);
  if (roleIdByName.get("administrator")) adminIds.push(roleIdByName.get("administrator")!);
  if (roleIdByName.get("owner")) adminIds.push(roleIdByName.get("owner")!);
  if (adminIds.length === 0) adminIds.push(FALLBACK_ROLE_ADMINISTRATOR);
  return { staffRoleId, administratorRoleIds: adminIds };
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
      (discordIdentity.identity_data && typeof discordIdentity.identity_data.id === "string" ? discordIdentity.identity_data.id : null) ||
      (discordIdentity.identity_data && typeof discordIdentity.identity_data.sub === "string" ? discordIdentity.identity_data.sub : null);
    if (id) return normalizeRoleId(id);
  }
  const meta = user.user_metadata || user.app_metadata;
  if (meta && typeof (meta as { provider_id?: string }).provider_id === "string") return normalizeRoleId((meta as { provider_id: string }).provider_id);
  if (meta && typeof (meta as { discord_id?: string }).discord_id === "string") return normalizeRoleId((meta as { discord_id: string }).discord_id);
  return null;
}

function hasRole(memberRoles: string[] | unknown[], roleId: string): boolean {
  const normalized = memberRoles.map((r) => normalizeRoleId(r));
  return normalized.includes(normalizeRoleId(roleId));
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
        JSON.stringify({ role: "citizen", error: "missing_auth" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ role: "citizen", error: "server_config" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!botToken) {
      return new Response(
        JSON.stringify({ role: "citizen", error: "discord_bot_not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { staffRoleId, administratorRoleIds } = await resolveSiteRoleIds(botToken);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("check-site-role getUser failed:", userError?.message ?? "no user");
      return new Response(
        JSON.stringify({ role: "citizen", error: "invalid_session" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let discordUserId: string | null = getDiscordUserId(user);
    if (!discordUserId && user.id) {
      try {
        const admin = (supabase.auth as { admin?: { getUserById: (id: string) => Promise<unknown> } }).admin;
        if (admin?.getUserById) {
          const { data: { user: adminUser } } = await admin.getUserById(user.id) as { data: { user?: { identities?: Array<{ provider: string; provider_id?: string; identity_data?: { id?: string; sub?: string } }> } } };
          const adminDiscord = adminUser?.identities?.find((i) => i.provider === "discord");
          if (adminDiscord) {
            const raw = adminDiscord.provider_id || adminDiscord.identity_data?.id || adminDiscord.identity_data?.sub;
            if (raw) discordUserId = normalizeRoleId(raw);
          }
        }
      } catch (_) {
        /* ignore */
      }
    }

    if (!discordUserId) {
      return new Response(
        JSON.stringify({ role: "citizen", error: "not_discord" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const memberRes = await fetch(
      `${DISCORD_API}/guilds/${GUILD_ID}/members/${discordUserId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      }
    );

    if (!memberRes.ok) {
      if (memberRes.status === 404) {
        return new Response(
          JSON.stringify({ role: "citizen", error: "not_in_guild" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errText = await memberRes.text();
      console.error("Discord API error:", memberRes.status, errText);
      return new Response(
        JSON.stringify({ role: "citizen", error: "discord_api_error" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const member = await memberRes.json();
    const roles: unknown[] = Array.isArray(member.roles) ? member.roles : [];
    const roleIds = roles.map((r) => normalizeRoleId(r));
    let role: "citizen" | "staff" | "administrator" = "citizen";
    if (administratorRoleIds.some((id) => roleIds.includes(normalizeRoleId(id)))) role = "administrator";
    else if (roleIds.includes(normalizeRoleId(staffRoleId))) role = "staff";

    // Ако е администратор в Discord, синхронизирай роля admin в user_roles за да може да трие/редактира в админ панела (RLS).
    if (role === "administrator" && user.id) {
      await supabase.from("user_roles").upsert(
        { user_id: user.id, role: "admin" },
        { onConflict: "user_id,role" }
      );
    }

    if (role === "citizen") {
      console.error("check-site-role: no matching role", { discordUserId, roleIds, staffRoleId, administratorRoleIds });
    }

    return new Response(
      JSON.stringify(role === "citizen" ? { role: "citizen", error: "no_matching_role" } : { role }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ role: "citizen", error: "server_error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
