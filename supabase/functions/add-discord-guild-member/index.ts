import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

const DISCORD_API = "https://discord.com/api/v10";

function normalizeId(r: unknown): string {
  return String(r ?? "").trim();
}

function getDiscordUserIdFromSupabaseUser(user: {
  identities?: Array<{ provider: string; provider_id?: string; identity_data?: Record<string, unknown> }>;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): string | null {
  const discordIdentity = user.identities?.find((i) => i.provider === "discord");
  if (discordIdentity) {
    const id =
      (discordIdentity as { provider_id?: string }).provider_id ||
      (typeof discordIdentity.identity_data?.id === "string" ? discordIdentity.identity_data.id : null) ||
      (typeof discordIdentity.identity_data?.sub === "string" ? discordIdentity.identity_data.sub : null);
    if (id) return normalizeId(id);
  }
  const meta = user.user_metadata || user.app_metadata;
  if (meta && typeof (meta as { provider_id?: string }).provider_id === "string") {
    return normalizeId((meta as { provider_id: string }).provider_id);
  }
  if (meta && typeof (meta as { discord_id?: string }).discord_id === "string") {
    return normalizeId((meta as { discord_id: string }).discord_id);
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { discord_access_token?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const discordAccessToken = typeof body.discord_access_token === "string" ? body.discord_access_token.trim() : "";
    if (!discordAccessToken) {
      return new Response(JSON.stringify({ error: "missing_discord_access_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const guildId = (Deno.env.get("DISCORD_GUILD_ID") || Deno.env.get("DISCORD_POLICE_GUILD_ID") || "").trim();

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "server_config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!botToken || !guildId) {
      return new Response(JSON.stringify({ error: "discord_not_configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "invalid_session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedDiscordId = getDiscordUserIdFromSupabaseUser(user);
    if (!expectedDiscordId) {
      return new Response(JSON.stringify({ error: "not_discord_user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${discordAccessToken}` },
    });
    if (!meRes.ok) {
      const t = await meRes.text();
      console.error("Discord @me failed:", meRes.status, t);
      return new Response(JSON.stringify({ error: "discord_token_invalid", status: meRes.status }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const me = await meRes.json() as { id?: string };
    const tokenUserId = normalizeId(me.id);
    if (!tokenUserId || tokenUserId !== expectedDiscordId) {
      return new Response(JSON.stringify({ error: "discord_mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const putRes = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${expectedDiscordId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: discordAccessToken }),
    });

    if (putRes.status === 201 || putRes.status === 204) {
      return new Response(JSON.stringify({ ok: true, already_member: putRes.status === 204 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const errText = await putRes.text();
    console.error("Discord add member failed:", putRes.status, errText);
    return new Response(
      JSON.stringify({ error: "discord_add_member_failed", status: putRes.status, detail: errText.slice(0, 200) }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
