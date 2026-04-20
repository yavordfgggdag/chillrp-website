import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

const DISCORD_API = "https://discord.com/api/v10";

type Body = {
  checkout_id?: string;
  /** Линк към тикет канала (същият като VITE_DISCORD_SHOP_CHECKOUT_URL) */
  ticket_button_url?: string;
  /** Покана към сървъра (VITE_DISCORD_INVITE) — бутон в ЛС */
  discord_invite_url?: string;
};

const DEFAULT_DISCORD_INVITE = "https://discord.gg/uqAdjz6SbQ";

/** Канал за staff известие при генериран тикет код (по подразбиране — твоят сървър). */
const DEFAULT_SHOP_TICKET_STAFF_CHANNEL_ID = "1490776676462756042";
/** Роля за @mention в същия канал. */
const DEFAULT_SHOP_TICKET_STAFF_PING_ROLE_ID = "1471238721566146796";

function isValidDiscordDeepLink(url: string): boolean {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return h === "discord.com" || h === "discord.gg";
  } catch {
    return false;
  }
}

async function resolveDiscordUserId(
  botToken: string,
  guildId: string,
  discordIdFromProfile: string | null,
  discordUsername: string | null,
): Promise<{ userId: string | null; reason?: string }> {
  const botHeaders = {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
  };

  const trimmedId = discordIdFromProfile?.trim() ?? "";
  if (/^\d{17,20}$/.test(trimmedId)) {
    const mem = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${trimmedId}`, { headers: botHeaders });
    if (mem.ok) return { userId: trimmedId };
  }

  const un = (discordUsername || "").replace(/#\d+$/, "").toLowerCase().trim();
  if (!un) return { userId: null, reason: "no_discord_identity" };

  const searchRes = await fetch(
    `${DISCORD_API}/guilds/${guildId}/members/search?query=${encodeURIComponent(un)}&limit=5`,
    { headers: botHeaders },
  );
  if (!searchRes.ok) return { userId: null, reason: "search_failed" };
  const members = await searchRes.json();
  if (!members?.length) return { userId: null, reason: "not_in_guild" };

  const member =
    members.find(
      (m: { user?: { username?: string; global_name?: string } }) =>
        m.user?.username?.toLowerCase() === un || m.user?.global_name?.toLowerCase() === un,
    ) || members[0];
  return { userId: member?.user?.id ?? null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
    const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID");
    const WEBHOOK_URL = (Deno.env.get("DISCORD_SHOP_TICKET_LOG_WEBHOOK_URL") || "").trim();

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "missing_supabase_env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: userErr } = await anon.auth.getUser(token);
    if (userErr || !user?.id) {
      return new Response(JSON.stringify({ error: "invalid_session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const checkoutId = (body.checkout_id || "").trim();
    if (!checkoutId) {
      return new Response(JSON.stringify({ error: "checkout_id_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let ticketButtonUrl = (body.ticket_button_url || "").trim();
    if (ticketButtonUrl && !isValidDiscordDeepLink(ticketButtonUrl)) {
      ticketButtonUrl = "";
    }

    let discordInviteUrl = (body.discord_invite_url || "").trim();
    if (discordInviteUrl && !isValidDiscordDeepLink(discordInviteUrl)) {
      discordInviteUrl = "";
    }
    if (!discordInviteUrl) {
      discordInviteUrl = (Deno.env.get("DISCORD_INVITE") || "").trim();
      if (discordInviteUrl && !isValidDiscordDeepLink(discordInviteUrl)) discordInviteUrl = "";
    }
    if (!discordInviteUrl) discordInviteUrl = DEFAULT_DISCORD_INVITE;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: row, error: rowErr } = await admin
      .from("shop_ticket_checkouts")
      .select("id,ticket_code,product_name,amount_display,discord_username,user_id,status")
      .eq("id", checkoutId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (rowErr || !row) {
      return new Response(JSON.stringify({ error: "checkout_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = row as {
      ticket_code: string;
      product_name: string;
      amount_display: string;
      discord_username: string | null;
      user_id: string;
      status: string;
    };

    const now = new Date();
    const timeStr = now.toLocaleString("bg-BG", { timeZone: "Europe/Sofia" });
    const siteBase = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");

    const staffEmbed = {
      title: "🎫 Нов код за тикет — магазин",
      color: 0xf97316,
      description:
        "Клиентът генерира код. Staff проверява в **Админ → Статистика → Магазин — кодове за тикет**, изпраща линк за плащане в тикета и маркира **Платено** след плащане.",
      fields: [
        { name: "Код", value: `\`${r.ticket_code}\``, inline: true },
        { name: "Продукт", value: (r.product_name || "—").slice(0, 1024), inline: true },
        { name: "Сума", value: (r.amount_display || "—").slice(0, 256), inline: true },
        {
          name: "Discord",
          value: r.discord_username ? `\`${r.discord_username}\`` : "_—_",
          inline: true,
        },
        { name: "User ID", value: `\`${r.user_id}\``, inline: true },
        { name: "Checkout ID", value: `\`${checkoutId}\``, inline: true },
        { name: "Час", value: timeStr, inline: true },
      ],
      footer: { text: "TLR Shop • тикет код" },
      timestamp: now.toISOString(),
    };

    let webhookOk = false;
    if (WEBHOOK_URL) {
      const wh = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [staffEmbed] }),
      });
      webhookOk = wh.ok;
      if (!wh.ok) console.error("notify-shop-ticket-code webhook", await wh.text());
    }

    let staffChannelOk = false;
    const staffChannelId = (Deno.env.get("DISCORD_SHOP_TICKET_CHANNEL_ID") || DEFAULT_SHOP_TICKET_STAFF_CHANNEL_ID).trim();
    const staffPingRoleId = (Deno.env.get("DISCORD_SHOP_TICKET_PING_ROLE_ID") || DEFAULT_SHOP_TICKET_STAFF_PING_ROLE_ID).trim();
    if (BOT_TOKEN && /^\d{17,20}$/.test(staffChannelId)) {
      const botHeadersStaff = {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      };
      const channelPayload: Record<string, unknown> = {
        embeds: [staffEmbed],
      };
      if (/^\d{17,20}$/.test(staffPingRoleId)) {
        channelPayload.content =
          `<@&${staffPingRoleId}> **Нов магазинен тикет код** — клиентът чака линк за плащане; провери админ панела.`;
        channelPayload.allowed_mentions = { parse: [], roles: [staffPingRoleId] };
      }
      const chRes = await fetch(`${DISCORD_API}/channels/${staffChannelId}/messages`, {
        method: "POST",
        headers: botHeadersStaff,
        body: JSON.stringify(channelPayload),
      });
      staffChannelOk = chRes.ok;
      if (!chRes.ok) console.error("notify-shop-ticket-code staff channel", staffChannelId, await chRes.text());
    }

    let dmOk = false;
    let dmReason: string | undefined;

    if (BOT_TOKEN && GUILD_ID) {
      const { data: prof } = await admin
        .from("profiles")
        .select("discord_id")
        .eq("id", user.id)
        .maybeSingle();
      const discordId = (prof as { discord_id?: string | null } | null)?.discord_id ?? null;

      const { userId, reason } = await resolveDiscordUserId(
        BOT_TOKEN,
        GUILD_ID,
        typeof discordId === "string" ? discordId : null,
        r.discord_username,
      );

      if (!userId) {
        dmReason = reason || "no_user";
      } else {
        const botHeaders = {
          Authorization: `Bot ${BOT_TOKEN}`,
          "Content-Type": "application/json",
        };
        const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
          method: "POST",
          headers: botHeaders,
          body: JSON.stringify({ recipient_id: userId }),
        });
        if (!dmRes.ok) {
          dmReason = "dm_channel_failed";
          console.error("notify-shop-ticket-code dm channel", await dmRes.text());
        } else {
          const dmChannel = await dmRes.json();
          const description = [
            "**Това съобщение е на лично** от бота на сървъра (TLR).",
            "",
            "Генерирахме код за твоята поръчка от сайта.",
            "",
            "**Пусни тикет** в сървъра и **напиши в тикета този код** (копирай го точно). Екипът вижда същия код в админ панела и ще ти изпрати **линк за плащане**.",
            "",
            "След като платиш, staff маркира поръчката като платена.",
            "",
            "_Ако не виждаш ЛС от бота: влез в Discord → Настройки → Поверителност → позволи ЛС от членове на сървъра._",
          ].join("\n");

          const linkButtons: Record<string, unknown>[] = [];
          if (discordInviteUrl) {
            linkButtons.push({
              type: 2,
              style: 5,
              label: "Влез в TLR Discord",
              url: discordInviteUrl,
            });
          }
          if (ticketButtonUrl) {
            linkButtons.push({
              type: 2,
              style: 5,
              label: "Пусни тикет",
              url: ticketButtonUrl,
            });
          }
          if (siteBase) {
            linkButtons.push({
              type: 2,
              style: 5,
              label: "Магазин",
              url: `${siteBase}/shop`,
            });
          }
          const actionRow = linkButtons.length ? [{ type: 1, components: linkButtons }] : undefined;

          const msgRes = await fetch(`${DISCORD_API}/channels/${dmChannel.id}/messages`, {
            method: "POST",
            headers: botHeaders,
            body: JSON.stringify({
              embeds: [
                {
                  title: "Кодът ти за магазина е готов",
                  description,
                  color: 0x5865f2,
                  fields: [
                    { name: "Твоят код", value: `\`${r.ticket_code}\``, inline: false },
                    { name: "Продукт", value: (r.product_name || "—").slice(0, 256), inline: true },
                    { name: "Сума", value: (r.amount_display || "—").slice(0, 128), inline: true },
                  ],
                  footer: { text: "TLR RP Shop" },
                  timestamp: now.toISOString(),
                },
              ],
              components: actionRow,
            }),
          });
          dmOk = msgRes.ok;
          if (!msgRes.ok) {
            dmReason = "dm_send_failed";
            console.error("notify-shop-ticket-code dm msg", await msgRes.text());
          }
        }
      }
    } else {
      dmReason = "bot_not_configured";
    }

    return new Response(
      JSON.stringify({
        ok: true,
        webhook: WEBHOOK_URL ? webhookOk : null,
        staff_channel: staffChannelOk,
        dm: dmOk,
        dm_reason: dmOk ? undefined : dmReason,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
