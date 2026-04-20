const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const DISCORD_API = "https://discord.com/api/v10";

const CHILLRP_PURPLE = 0x8b5cf6;
const APPROVED_GREEN = 0x22c55e;
const REJECTED_RED = 0xef4444;
const SUBMITTED_BLUE = 0x3b82f6;

function buildTicketUrl(guildId: string, channelId: string): string {
  return `https://discord.com/channels/${guildId}/${channelId}`;
}

function discordEmbedFooterSite(): string {
  const raw = (Deno.env.get("SITE_URL") || "").trim();
  if (!raw) return "TLR Roleplay";
  try {
    const host = new URL(raw).hostname.replace(/^www\./i, "");
    return host ? `TLR Roleplay • ${host}` : "TLR Roleplay";
  } catch {
    return "TLR Roleplay";
  }
}

function buildMessage(
  status: "submitted" | "approved" | "rejected",
  gang_name: string,
  admin_note: string | null,
  ticketUrl: string
) {
  const isSubmitted = status === "submitted";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  let title: string;
  let description: string;
  let color: number;
  let buttonLabel: string;

  if (isSubmitted) {
    title = "📨 Получихме кандидатурата ти!";
    description = [
      `Кандидатурата ти за **${gang_name}** е записана и е в процес на преглед.`,
      "",
      "Ще те уведомим в този канал щом стафът прегледа заявката — одобрена или с обратна връзка.",
      "Ако имаш въпрос, натисни бутона по-долу и пусни тикет в сървъра.",
    ].join("\n");
    color = SUBMITTED_BLUE;
    buttonLabel = "🎫 Отвори тикет канал";
  } else if (isApproved) {
    title = "✅ Кандидатурата ти е одобрена!";
    description = [
      `Поздравления! Кандидатурата ти за **${gang_name}** беше одобрена от администрацията на TLR.`,
      "",
      "За да активираш генга, отвори тикет в сървъра чрез бутона по-долу — стафът ще довърши настройките.",
    ].join("\n");
    color = APPROVED_GREEN;
    buttonLabel = "🎫 Пусни тикет за активиране";
  } else {
    title = "❌ Кандидатурата ти не беше одобрена";
    description = [
      `Кандидатурата ти за **${gang_name}** не беше одобрена в момента.`,
      "",
      "Ако искаш да разбереш повече или да подадеш отново по-късно, пусни тикет в сървъра — отговорът е на лично.",
    ].join("\n");
    color = REJECTED_RED;
    buttonLabel = "🎫 Пусни тикет (въпроси / обратна връзка)";
  }

  const fields: { name: string; value: string }[] = [];
  if (admin_note && (isApproved || isRejected)) {
    fields.push({ name: "📋 Бележка от администрацията", value: admin_note });
  }

  const embed = {
    embeds: [
      {
        author: {
          name: "TLR • Генг кандидатури",
        },
        title,
        description,
        color,
        fields: fields.length ? fields : undefined,
        footer: {
          text: discordEmbedFooterSite(),
        },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: buttonLabel,
            url: ticketUrl,
          },
        ],
      },
    ],
  };

  return embed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
    const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID");
    const TICKET_CHANNEL_ID = Deno.env.get("DISCORD_TICKET_CHANNEL_ID") || "1471238731624087669";

    if (!BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN не е конфигуриран");
    if (!GUILD_ID) throw new Error("DISCORD_GUILD_ID не е конфигуриран");

    const body = await req.json();
    const { discord_username, discord_id, gang_name, status, admin_note } = body as {
      discord_username?: string;
      discord_id?: string;
      gang_name?: string;
      status?: string;
      admin_note?: string | null;
    };

    const finalStatus: "submitted" | "approved" | "rejected" =
      status === "submitted" || status === "approved" || status === "rejected"
        ? status
        : "approved";

    if (!discord_username && !discord_id) {
      return new Response(JSON.stringify({ error: "Няма Discord потребител (username/id)." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ticketUrl = buildTicketUrl(GUILD_ID, TICKET_CHANNEL_ID);

    const headers = {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    };

    let userId: string | undefined = discord_id ?? undefined;

    if (!userId && discord_username) {
      const cleanUsername = discord_username.replace(/#\d+$/, "").toLowerCase();
      const searchRes = await fetch(
        `${DISCORD_API}/guilds/${GUILD_ID}/members/search?query=${encodeURIComponent(cleanUsername)}&limit=5`,
        { headers }
      );

      if (!searchRes.ok) {
        const text = await searchRes.text();
        throw new Error(`Guild search грешка [${searchRes.status}]: ${text}`);
      }

      const members = await searchRes.json();
      if (!members || members.length === 0) {
        return new Response(JSON.stringify({ error: "Потребителят не е намерен в Discord сървъра. Уверете се, че потребителят е член на TLR сървъра и че потребителското име съвпада." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const member =
        members.find(
          (m: { user?: { username?: string; global_name?: string; id?: string } }) =>
            m.user?.username?.toLowerCase() === cleanUsername ||
            m.user?.global_name?.toLowerCase() === cleanUsername
        ) || members[0];

      userId = member.user?.id;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Неуспех при определяне на Discord ID за потребителя." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers,
      body: JSON.stringify({ recipient_id: userId }),
    });

    if (!dmRes.ok) {
      const text = await dmRes.text();
      throw new Error(`DM channel грешка [${dmRes.status}]: ${text}`);
    }

    const dmChannel = await dmRes.json();

    const payload = buildMessage(
      finalStatus,
      gang_name || "Генг",
      admin_note ?? null,
      ticketUrl
    );

    const msgRes = await fetch(`${DISCORD_API}/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!msgRes.ok) {
      const text = await msgRes.text();
      throw new Error(`Изпращане на DM грешка [${msgRes.status}]: ${text}`);
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
