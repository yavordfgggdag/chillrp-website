const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API = "https://discord.com/api/v10";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
    const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID");
    const TICKET_CHANNEL_URL = `https://discord.com/channels/${GUILD_ID}/1471238731624087669`;

    if (!BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN не е конфигуриран");
    if (!GUILD_ID) throw new Error("DISCORD_GUILD_ID не е конфигуриран");

    const { discord_username, gang_name, status, admin_note } = await req.json();

    if (!discord_username) {
      return new Response(JSON.stringify({ error: "Няма Discord username" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    };

    // Search for member by username in the guild
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
      return new Response(JSON.stringify({ error: "Потребителят не е намерен в сървъра" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find best match
    const member = members.find(
      (m: any) =>
        m.user?.username?.toLowerCase() === cleanUsername ||
        m.user?.global_name?.toLowerCase() === cleanUsername
    ) || members[0];

    const userId = member.user.id;

    // Create DM channel
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

    // Build message
    const isApproved = status === "approved";
    const embed = {
      embeds: [
        {
          title: isApproved
            ? `✅ Генг кандидатурата ти е ОДОБРЕНА!`
            : `❌ Генг кандидатурата ти е ОТКАЗАНА`,
          description: isApproved
            ? `Поздравления! Кандидатурата ти за **${gang_name}** беше одобрена от администрацията на ChillRP. Отвори тикет в сървъра за активиране.`
            : `За съжаление кандидатурата ти за **${gang_name}** не беше одобрена в момента.`,
          color: isApproved ? 0x57f287 : 0xed4245,
          fields: admin_note
            ? [{ name: "📋 Бележка от администрацията", value: admin_note }]
            : [],
          footer: { text: "ChillRP Administration" },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Add ticket button only for approved applications
    const payload = isApproved
      ? {
          ...embed,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 5,
                  label: "🎫 Пусни тикет за активиране",
                  url: TICKET_CHANNEL_URL,
                },
              ],
            },
          ],
        }
      : embed;

    // Send DM
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
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
