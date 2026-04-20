/**
 * Връща Discord user ID на всички членове на гилдията, които имат дадена роля.
 * Ползва се от админ панела за групови съобщения (напр. всички полицай).
 */

const corsHeadersBase: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/** Отразява исканите от браузъра headers (нови версии на supabase-js добавят допълнителни). */
function corsHeaders(req: Request): Record<string, string> {
  const requested = req.headers.get("Access-Control-Request-Headers");
  const allowHeaders =
    requested ||
    [
      "authorization",
      "x-client-info",
      "apikey",
      "content-type",
      "x-region",
      "x-supabase-api-version",
      "prefer",
      "x-supabase-client-platform",
      "x-supabase-client-platform-version",
      "x-supabase-client-runtime",
      "x-supabase-client-runtime-version",
    ].join(", ");
  return { ...corsHeadersBase, "Access-Control-Allow-Headers": allowHeaders };
}

const DISCORD_API = "https://discord.com/api/v10";
const DEFAULT_GUILD_ID = "1471238721096646718";
const DEFAULT_POLICE_ROLE = "1471238721515819110";

function normalizeId(id: unknown): string {
  return String(id ?? "").trim();
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
    if (!BOT_TOKEN) {
      return new Response(JSON.stringify({ error: "DISCORD_BOT_TOKEN не е конфигуриран" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const guildId = Deno.env.get("DISCORD_GUILD_ID") || Deno.env.get("DISCORD_POLICE_GUILD_ID") || DEFAULT_GUILD_ID;
    const body = await req.json().catch(() => ({}));
    const roleId = normalizeId((body as { role_id?: string }).role_id) || DEFAULT_POLICE_ROLE;

    const matched = new Set<string>();
    let after: string | undefined;

    for (;;) {
      const url = new URL(`${DISCORD_API}/guilds/${guildId}/members`);
      url.searchParams.set("limit", "1000");
      if (after) url.searchParams.set("after", after);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("list-discord-role-members members fetch", res.status, t.slice(0, 300));
        return new Response(
          JSON.stringify({ error: `Discord API ${res.status}`, discord_user_ids: [] }),
          { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const members: { user?: { id?: string }; roles?: string[] }[] = await res.json();
      if (!Array.isArray(members) || members.length === 0) break;

      for (const m of members) {
        const uid = m.user?.id;
        if (!uid) continue;
        const roles = (m.roles || []).map((r) => normalizeId(r));
        if (roles.includes(roleId)) matched.add(uid);
      }

      const last = members[members.length - 1]?.user?.id;
      if (!last || members.length < 1000) break;
      after = last;
    }

    const discord_user_ids = [...matched];
    return new Response(
      JSON.stringify({
        discord_user_ids,
        count: discord_user_ids.length,
        role_id: roleId,
        guild_id: guildId,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e), discord_user_ids: [] }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
