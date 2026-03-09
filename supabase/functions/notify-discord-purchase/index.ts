const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISCORD_API = "https://discord.com/api/v10";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
    const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID");
    const WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");
    const DEV_WEBHOOK_URL = Deno.env.get("DISCORD_DEV_WEBHOOK_URL");
    const TICKET_CHANNEL_URL = `https://discord.com/channels/${GUILD_ID}/1471238731624087669`;

    if (!BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN не е конфигуриран");
    if (!GUILD_ID) throw new Error("DISCORD_GUILD_ID не е конфигуриран");

    const { discord_username, product_name, product_price, product_subtitle, price, category } = await req.json();

    const finalPrice = price || product_price || "—";
    const finalCategory = category || product_subtitle || "—";
    const now = new Date();
    const timeStr = now.toLocaleString("bg-BG", { timeZone: "Europe/Sofia" });

    // ── Staff channel webhook (clean embed) ──────────────────────────────
    if (WEBHOOK_URL) {
      const staffPayload = {
        embeds: [
          {
            title: "💸 Нова покупка в ChillRP Shop!",
            color: 0x9b59b6,
            fields: [
              { name: "📦 Продукт", value: product_name || "—", inline: true },
              { name: "💰 Цена", value: finalPrice, inline: true },
              { name: "📂 Категория", value: finalCategory, inline: true },
              { name: "🎮 Discord", value: discord_username ? `\`${discord_username}\`` : "_гост_", inline: true },
              { name: "🕐 Час", value: timeStr, inline: true },
            ],
            footer: { text: "ChillRP Shop • Staff известие" },
            timestamp: now.toISOString(),
          },
        ],
      };
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffPayload),
      }).catch((e) => console.error("Staff webhook грешка:", e));
    }

    // ── Dev log channel (verbose plaintext + compact embed) ──────────────
    if (DEV_WEBHOOK_URL) {
      const devPayload = {
        content: `\`[PURCHASE LOG]\` 🛒 **${product_name || "—"}** · ${finalPrice} · @${discord_username || "guest"} · ${timeStr}`,
        embeds: [
          {
            color: 0x2ecc71,
            fields: [
              { name: "product_name", value: `\`${product_name || "—"}\``, inline: true },
              { name: "price", value: `\`${finalPrice}\``, inline: true },
              { name: "category", value: `\`${finalCategory}\``, inline: true },
              { name: "discord_username", value: `\`${discord_username || "null"}\``, inline: true },
              { name: "timestamp", value: `\`${now.toISOString()}\``, inline: false },
            ],
            footer: { text: "ChillRP Dev Log • notify-discord-purchase" },
          },
        ],
      };
      await fetch(DEV_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(devPayload),
      }).catch((e) => console.error("Dev webhook грешка:", e));
    }

    // ── Discord DM до купувача (ако има username) ────────────────────────
    if (!discord_username) {
      return new Response(JSON.stringify({ success: true, dm: false, reason: "no discord_username" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const botHeaders = {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    };

    const cleanUsername = discord_username.replace(/#\d+$/, "").toLowerCase().trim();
    const searchRes = await fetch(
      `${DISCORD_API}/guilds/${GUILD_ID}/members/search?query=${encodeURIComponent(cleanUsername)}&limit=5`,
      { headers: botHeaders }
    );

    if (!searchRes.ok) {
      const text = await searchRes.text();
      throw new Error(`Guild search грешка [${searchRes.status}]: ${text}`);
    }

    const members = await searchRes.json();
    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ success: true, dm: false, reason: "user not found in guild" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const member =
      members.find(
        (m: any) =>
          m.user?.username?.toLowerCase() === cleanUsername ||
          m.user?.global_name?.toLowerCase() === cleanUsername
      ) || members[0];

    const userId = member.user.id;

    const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: botHeaders,
      body: JSON.stringify({ recipient_id: userId }),
    });

    if (!dmRes.ok) {
      const text = await dmRes.text();
      throw new Error(`DM channel грешка [${dmRes.status}]: ${text}`);
    }

    const dmChannel = await dmRes.json();

    await fetch(`${DISCORD_API}/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: botHeaders,
      body: JSON.stringify({
        embeds: [
          {
            title: `🛒 Покупка потвърдена — ${product_name}`,
            description: `Получихме плащането ти! Пусни тикет и стаф ще те активира в рамките на **24 часа**.`,
            color: 0x9b59b6,
            fields: [
              { name: "📦 Продукт", value: product_name || "—", inline: true },
              { name: "💰 Цена", value: finalPrice, inline: true },
            ],
            footer: { text: "ChillRP Shop • Активиране в рамките на 24 часа" },
            timestamp: now.toISOString(),
          },
        ],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: "🎫 Пусни тикет",
                url: TICKET_CHANNEL_URL,
              },
            ],
          },
        ],
      }),
    });

    return new Response(JSON.stringify({ success: true, dm: true }), {
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
