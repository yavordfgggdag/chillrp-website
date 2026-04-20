/**
 * Send Discord DMs from Admin Panel to users who have logged into the site with Discord.
 * Compliant: only sends to users who have authorized the app (Discord OAuth login).
 * Uses small delay between sends to avoid Discord rate limits.
 * On Discord 50007 (cannot DM user), sets profiles.discord_dm_blocked_at; on success clears it.
 * profiles.discord_id is the stable Discord snowflake (same user across guilds) — useful for ops / migration messaging.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

const DISCORD_API = "https://discord.com/api/v10";
const DELAY_MS = 1100;

function discordEmbedFooterSite(): string {
  const raw = (Deno.env.get("SITE_URL") || "").trim();
  if (!raw) return "TLR";
  try {
    return new URL(raw).hostname.replace(/^www\./i, "") || "TLR";
  } catch {
    return "TLR";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Discord: 50007 Cannot send messages to this user (DM off / blocked bot). */
function isDiscordDmClosedError(status: number, bodyText: string): boolean {
  if (status !== 403 && status !== 400) return false;
  try {
    const j = JSON.parse(bodyText) as { code?: number; message?: string };
    if (j.code === 50007) return true;
    if (typeof j.message === "string" && /cannot send messages to this user/i.test(j.message)) return true;
  } catch {
    /* ignore */
  }
  return /cannot send messages to this user/i.test(bodyText);
}

type AdminClient = ReturnType<typeof createClient>;

async function markProfileDmBlocked(admin: AdminClient | null, discordId: string): Promise<void> {
  if (!admin) return;
  const { error } = await admin
    .from("profiles")
    .update({ discord_dm_blocked_at: new Date().toISOString() })
    .eq("discord_id", discordId);
  if (error) console.error("markProfileDmBlocked:", discordId, error.message);
}

async function clearProfileDmBlocked(admin: AdminClient | null, discordId: string): Promise<void> {
  if (!admin) return;
  const { error } = await admin.from("profiles").update({ discord_dm_blocked_at: null }).eq("discord_id", discordId);
  if (error) console.error("clearProfileDmBlocked:", discordId, error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
    if (!BOT_TOKEN) {
      return new Response(JSON.stringify({ error: "DISCORD_BOT_TOKEN не е конфигуриран" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { discord_user_ids, message } = body as { discord_user_ids?: string[]; message?: string };

    if (!Array.isArray(discord_user_ids) || discord_user_ids.length === 0) {
      return new Response(JSON.stringify({ error: "discord_user_ids (масив) е задължителен" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = typeof message === "string" && message.trim() ? message.trim() : "";
    if (!text) {
      return new Response(JSON.stringify({ error: "message е задължително" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin =
      supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) : null;

    const sent: string[] = [];
    const failed: { discord_id: string; error: string }[] = [];

    for (let i = 0; i < discord_user_ids.length; i++) {
      const discordId = String(discord_user_ids[i]).trim();
      if (!discordId) continue;

      if (i > 0) await sleep(DELAY_MS);

      try {
        const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
          method: "POST",
          headers,
          body: JSON.stringify({ recipient_id: discordId }),
        });

        if (!dmRes.ok) {
          const errText = await dmRes.text();
          if (isDiscordDmClosedError(dmRes.status, errText)) {
            await markProfileDmBlocked(admin, discordId);
          }
          failed.push({ discord_id: discordId, error: `DM канал [${dmRes.status}]: ${errText.slice(0, 200)}` });
          continue;
        }

        const dmChannel = await dmRes.json();
        const channelId = dmChannel.id;

        const payload = {
          content: text.slice(0, 2000),
          embeds: text.length > 2000
            ? [
                {
                  author: { name: "TLR" },
                  description: text.slice(2000, 4000),
                  color: 0x8b5cf6,
                  footer: { text: discordEmbedFooterSite() },
                  timestamp: new Date().toISOString(),
                },
              ]
            : undefined,
        };

        const msgRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!msgRes.ok) {
          const errText = await msgRes.text();
          if (isDiscordDmClosedError(msgRes.status, errText)) {
            await markProfileDmBlocked(admin, discordId);
          }
          failed.push({ discord_id: discordId, error: `Изпращане [${msgRes.status}]: ${errText.slice(0, 200)}` });
          continue;
        }

        await clearProfileDmBlocked(admin, discordId);
        sent.push(discordId);
      } catch (e) {
        failed.push({ discord_id: discordId, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(
      JSON.stringify({
        sent,
        failed,
        summary: { total: discord_user_ids.length, ok: sent.length, failed: failed.length },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
