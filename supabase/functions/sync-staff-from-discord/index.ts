import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID") || Deno.env.get("DISCORD_POLICE_GUILD_ID") || "1471238721096646718";

// Staff roles: индекс 0 = Основател (#0), 1 = Owner (#1), 2 = Lead Dev (#2), ... (sort_order = индекс)
const STAFF_ROLES: { id: string; label: string; emoji: string }[] = [
  { id: "1471238721566146796", label: "Основател", emoji: "🌟" },
  { id: "1471238721566146795", label: "Owner", emoji: "👑" },
  { id: "1471238721566146792", label: "Lead Dev", emoji: "🚀" },
  { id: "1475976823283384453", label: "Panel Engineer", emoji: "🔧" },
  { id: "1471238721566146793", label: "Developer", emoji: "💻" },
  { id: "1471238721566146791", label: "Management", emoji: "📊" },
  { id: "1471238721566146790", label: "Staff Leader", emoji: "👥" },
  { id: "1475239981697204264", label: "Content Manager", emoji: "📝" },
  { id: "1471238721549504766", label: "Administrator", emoji: "⚙️" },
  { id: "1471238721549504765", label: "Moderator", emoji: "🛡️" },
  { id: "1471238721549504763", label: "Ticket Support", emoji: "🎫" },
];

function normalizeRoleId(r: unknown): string {
  return String(r).trim();
}

/** Fetch guild roles from Discord and resolve staff role IDs by name. Falls back to hardcoded id if no match. */
async function resolveStaffRoleIds(botToken: string): Promise<string[]> {
  const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  const roleIdByLabel = new Map<string, string>();
  if (res.ok) {
    const guildRoles: { id: string; name?: string }[] = await res.json();
    for (const r of guildRoles) {
      const name = (r.name || "").trim().toLowerCase();
      if (name) roleIdByLabel.set(name, normalizeRoleId(r.id));
    }
  }

  return STAFF_ROLES.map((sr) => {
    const byName = roleIdByLabel.get(sr.label.trim().toLowerCase());
    return byName || sr.id;
  });
}

function getHighestRoleIndex(memberRoles: string[] | unknown[], resolvedRoleIds: string[]): number {
  const normalized = memberRoles.map((r) => normalizeRoleId(r));
  let maxIndex = -1;
  for (let i = 0; i < resolvedRoleIds.length; i++) {
    if (normalized.includes(resolvedRoleIds[i])) maxIndex = i;
  }
  return maxIndex;
}

function getAvatarUrl(user: { id: string; avatar: string | null; discriminator?: string }): string {
  if (user.avatar) {
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
  }
  const index = user.discriminator && user.discriminator !== "0"
    ? parseInt(user.discriminator, 10) % 5
    : 0;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function getDisplayName(member: { user?: { global_name?: string; username?: string }; nick?: string | null }): string {
  const nick = member.nick;
  const user = member.user;
  if (nick?.trim()) return nick.trim();
  if (user?.global_name?.trim()) return user.global_name.trim();
  if (user?.username?.trim()) return user.username.trim();
  return "Unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (!supabaseUrl || !supabaseServiceKey || !botToken) {
      return new Response(
        JSON.stringify({ ok: false, error: "server_config" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedRoleIds = await resolveStaffRoleIds(botToken);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authHeader = req.headers.get("Authorization");
    const secretHeader = req.headers.get("X-Cron-Secret");
    let userTokenFromBody: string | null = null;
    try {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body === "object" && typeof (body as { userToken?: string }).userToken === "string") {
        userTokenFromBody = (body as { userToken: string }).userToken.trim();
      }
    } catch {
      /* no body or invalid */
    }
    const token = userTokenFromBody || authHeader?.replace(/^Bearer\s+/i, "").trim();
    const isServiceRole = token === supabaseServiceKey;
    const isCronSecret = cronSecret && secretHeader === cronSecret;

    let allowed = isServiceRole || isCronSecret;
    const tokenForUser = userTokenFromBody || (isServiceRole || isCronSecret ? null : token);
    if (!allowed && tokenForUser) {
      const { data: { user }, error: userError } = await supabase.auth.getUser(tokenForUser);
      if (!userError && user) {
        let discordUserId: string | null = null;
        const discordIdentity = user.identities?.find((i: { provider: string }) => i.provider === "discord");
        if (discordIdentity) {
          discordUserId = (discordIdentity as { provider_id?: string }).provider_id ?? (discordIdentity as { identity_data?: { id?: string; sub?: string } }).identity_data?.id ?? (discordIdentity as { identity_data?: { id?: string; sub?: string } }).identity_data?.sub ?? null;
        }
        if (discordUserId) {
          const memberRes = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${discordUserId}`, { headers: { Authorization: `Bot ${botToken}` } });
          if (memberRes.ok) {
            const member = await memberRes.json();
            const roles: unknown[] = member.roles || [];
            const allowedRoleIds = [resolvedRoleIds[0], resolvedRoleIds[1]];
            const normalizedRoles = roles.map((r) => normalizeRoleId(r));
            if (allowedRoleIds.some((id) => normalizedRoles.includes(id))) allowed = true;
          }
        }
      }
    }
    if (!allowed) {
      return new Response(
        JSON.stringify({ ok: false, error: "unauthorized" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allMembers: { user: { id: string; username: string; avatar: string | null; discriminator?: string; global_name?: string }; roles: string[]; nick?: string | null }[] = [];
    let after = "0";

    do {
      const url = `${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Discord API error:", res.status, text);
        return new Response(
          JSON.stringify({ ok: false, error: "discord_api_error", details: text }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const page: typeof allMembers = await res.json();
      if (page.length === 0) break;
      for (const m of page) allMembers.push(m);
      after = page[page.length - 1]?.user?.id ?? "0";
      if (page.length < 1000) break;
    } while (true);

    const staffToInsert: {
      discord_id: string;
      name: string;
      role: string;
      icon: string;
      color: string;
      bg: string;
      avatar_url: string;
      avatar_scale: string;
      sort_order: number;
      source: string;
      emoji: string;
    }[] = [];

// Основател най-горе (sort_order 0), после надолу. Тези имена не се синхронизират (алт/изключени).
const STAFF_EXCLUDE_NAMES = ["ivogenga", "dark music"];

    for (const member of allMembers) {
      const user = member.user;
      if (!user) continue;
      const displayName = getDisplayName(member);
      const nameLower = displayName.trim().toLowerCase();
      if (STAFF_EXCLUDE_NAMES.some((ex) => nameLower === ex || nameLower.includes(ex))) continue;
      const memberRoles = (member.roles || []).map((r) => normalizeRoleId(r));
      const highestIndex = getHighestRoleIndex(memberRoles, resolvedRoleIds);
      if (highestIndex < 0) continue;

      const config = STAFF_ROLES[highestIndex];
      const avatarUrl = getAvatarUrl(user);

      staffToInsert.push({
        discord_id: user.id,
        name: displayName,
        role: config.label,
        icon: "shield",
        color: "text-neon-purple",
        bg: "border-neon-purple/30 bg-[hsl(271_76%_65%/0.07)]",
        avatar_url: avatarUrl,
        avatar_scale: "scale-[2.2]",
        sort_order: highestIndex,
        source: "discord_sync",
        emoji: config.emoji,
      });
    }

    staffToInsert.sort((a, b) => a.sort_order - b.sort_order); // Основател (0) най-горе, после надолу

    const { error: deleteError } = await supabase
      .from("staff_members")
      .delete()
      .eq("source", "discord_sync");

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return new Response(
        JSON.stringify({ ok: false, error: "db_delete", details: deleteError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (staffToInsert.length > 0) {
      const rows = staffToInsert.map((row) => ({
        discord_id: row.discord_id,
        name: row.name,
        role: row.role,
        icon: row.icon,
        color: row.color,
        bg: row.bg,
        avatar_url: row.avatar_url,
        avatar_scale: row.avatar_scale,
        sort_order: row.sort_order,
        source: row.source,
        emoji: row.emoji,
      }));

      const { error: insertError } = await supabase.from("staff_members").insert(rows);

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ ok: false, error: "db_insert", details: insertError.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ ok: true, count: staffToInsert.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ ok: false, error: "server_error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
