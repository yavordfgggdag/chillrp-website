import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID") || Deno.env.get("DISCORD_POLICE_GUILD_ID") || "1471238721096646718";

/** Синхрон със STAFF_SYNC_SETUP.md — staff = долните тиерове; administrator = горните. */
const SITE_STAFF_DEFS: { name: string; fallbackId: string }[] = [
  { name: "support team", fallbackId: "1471238721549504763" },
  { name: "staff", fallbackId: "1471238721549504765" },
  { name: "staff leader", fallbackId: "1471238721549504766" },
];
const SITE_ADMIN_DEFS: { name: string; fallbackId: string }[] = [
  { name: "administrator", fallbackId: "1471238721566146791" },
  { name: "developer", fallbackId: "1471238721566146793" },
  { name: "panel engineer", fallbackId: "1486054158753726637" },
  { name: "owner", fallbackId: "1471238721566146796" },
];

function normalizeRoleId(r: unknown): string {
  return String(r).trim();
}

function uniqIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const n = normalizeRoleId(id);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** Взима ролите на сървъра от Discord и връща ID-та за site staff / administrator (по име, с fallback). */
async function resolveSiteRoleIds(botToken: string): Promise<{ staffRoleIds: string[]; administratorRoleIds: string[] }> {
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

  const staffRoleIds = SITE_STAFF_DEFS.map((d) => roleIdByName.get(d.name) || d.fallbackId);
  const administratorRoleIds: string[] = SITE_ADMIN_DEFS.map((d) => roleIdByName.get(d.name) || d.fallbackId);
  // Стари имена / алиаси
  if (roleIdByName.get("ceo")) administratorRoleIds.push(roleIdByName.get("ceo")!);
  if (roleIdByName.get("основател")) administratorRoleIds.push(roleIdByName.get("основател")!);

  return {
    staffRoleIds: uniqIds(staffRoleIds),
    administratorRoleIds: uniqIds(administratorRoleIds),
  };
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
    return new Response(null, { status: 200, headers: corsHeaders });
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

    const { staffRoleIds, administratorRoleIds } = await resolveSiteRoleIds(botToken);

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
    else if (staffRoleIds.some((id) => roleIds.includes(normalizeRoleId(id)))) role = "staff";

    // Ако е администратор в Discord, синхронизирай роля admin в user_roles за да може да трие/редактира в админ панела (RLS).
    if (role === "administrator" && user.id) {
      await supabase.from("user_roles").upsert(
        { user_id: user.id, role: "admin" },
        { onConflict: "user_id,role" }
      );
    }

    if (role === "citizen") {
      console.error("check-site-role: no matching role", { discordUserId, roleIds, staffRoleIds, administratorRoleIds });
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
