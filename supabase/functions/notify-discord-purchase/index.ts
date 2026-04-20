const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISCORD_API = "https://discord.com/api/v10";

type Body = {
  discord_username?: string | null;
  product_name?: string | null;
  product_price?: string | null;
  price?: string | number | null;
  category?: string | null;
  /** Service-to-service: redeem код за игра */
  redeem_code?: string | null;
  /** Обединени редове от ingame_player_hint по продуктите + командата */
  ingame_instruction?: string | null;
  /** Кратка бележка за автоматичен GC */
  auto_gc_note?: string | null;
  /** true = пълен текст за тикет; false = само „при проблеми“ */
  needs_manual_staff?: boolean | null;
  /** От админ шаблон на продукта: замества автоматичния description на DM embed */
  purchase_dm_description_override?: string | null;
};

function isServiceRoleCall(req: Request): boolean {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!key) return false;
  const auth = req.headers.get("Authorization")?.trim() ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return token === key;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
    const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID");
    const WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");
    const DEV_WEBHOOK_URL = Deno.env.get("DISCORD_DEV_WEBHOOK_URL");
    const TICKET_CHANNEL_URL = `https://discord.com/channels/${GUILD_ID}/1471238731624087669`;
    const siteBase = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");

    if (!BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN не е конфигуриран");
    if (!GUILD_ID) throw new Error("DISCORD_GUILD_ID не е конфигуриран");

    const body = (await req.json().catch(() => ({}))) as Body;
    const serviceCall = isServiceRoleCall(req);

    const {
      discord_username,
      product_name,
      product_price,
      price,
      category,
      redeem_code,
      ingame_instruction,
      auto_gc_note,
      needs_manual_staff,
      purchase_dm_description_override,
    } = body;

    const finalPrice =
      price !== undefined && price !== null && price !== ""
        ? typeof price === "number"
          ? `${price.toFixed(2)} EUR`
          : String(price)
        : product_price || "—";
    const finalCategory = category || "—";
    const now = new Date();
    const timeStr = now.toLocaleString("bg-BG", { timeZone: "Europe/Sofia" });

    const redeem = redeem_code ? String(redeem_code).trim() : "";
    const ingame = ingame_instruction ? String(ingame_instruction).trim() : "";
    const autoNote = auto_gc_note ? String(auto_gc_note).trim() : "";
    const manualStaff = needs_manual_staff !== false;

    // ── Staff channel webhook ─────────────────────────────────────────────
    if (WEBHOOK_URL) {
      const staffFields: Record<string, string>[] = [
        { name: "📦 Продукт", value: product_name || "—", inline: true },
        { name: "💰 Цена", value: finalPrice, inline: true },
        { name: "📂 Категория", value: finalCategory, inline: true },
        { name: "🎮 Discord", value: discord_username ? `\`${discord_username}\`` : "_гост_", inline: true },
        { name: "🕐 Час", value: timeStr, inline: true },
      ];
      if (serviceCall && redeem) {
        staffFields.push({ name: "🎟️ Redeem код", value: `\`${redeem}\``, inline: false });
      }
      const staffPayload = {
        embeds: [
          {
            title: "💸 Нова покупка в TLR Shop!",
            color: 0x9b59b6,
            fields: staffFields,
            footer: { text: "TLR Shop • Staff известие" },
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

    // ── Dev log channel ───────────────────────────────────────────────────
    if (DEV_WEBHOOK_URL) {
      const devPayload = {
        content: `\`[PURCHASE LOG]\` 🛒 **${product_name || "—"}** · ${finalPrice} · @${discord_username || "guest"} · ${timeStr}${redeem ? ` · code \`${redeem}\`` : ""}`,
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
            footer: { text: "TLR Dev Log • notify-discord-purchase" },
          },
        ],
      };
      await fetch(DEV_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(devPayload),
      }).catch((e) => console.error("Dev webhook грешка:", e));
    }

    // ── Discord DM до купувача ────────────────────────────────────────────
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
      { headers: botHeaders },
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
        (m: { user?: { username?: string; global_name?: string; id?: string } }) =>
          m.user?.username?.toLowerCase() === cleanUsername ||
          m.user?.global_name?.toLowerCase() === cleanUsername,
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

    const dmFields: { name: string; value: string; inline?: boolean }[] = [
      { name: "📦 Продукт", value: (product_name || "—").slice(0, 1024), inline: true },
      { name: "💰 Цена", value: finalPrice.slice(0, 256), inline: true },
    ];

    if (redeem) {
      dmFields.push({
        name: "🎟️ Твоят код за игра",
        value: `\`${redeem}\``,
        inline: false,
      });
    }

    if (ingame) {
      dmFields.push({
        name: "🎮 Как да получиш наградата",
        value: ingame.slice(0, 1024),
        inline: false,
      });
    }

    if (autoNote) {
      dmFields.push({
        name: "⚡ Автоматично",
        value: autoNote.slice(0, 1024),
        inline: false,
      });
    }

    const overrideRaw = purchase_dm_description_override ? String(purchase_dm_description_override).trim() : "";
    let description: string;
    if (overrideRaw) {
      description = overrideRaw.slice(0, 4096);
    } else if (redeem || ingame || autoNote) {
      description =
        "Плащането е прието. Следвай полетата по-долу за играта.\n\n" +
        "**Ако нещо не работи** — пусни тикет в Discord от бутона по-долу; екипът ще ти помогне.";
    } else if (manualStaff) {
      description =
        "Получихме плащането ти. За този продукт активирането е ръчно — пусни тикет и стафът ще те обработи в рамките на **24 часа**.";
    } else {
      description =
        "Получихме плащането ти. **При проблеми** пусни тикет в Discord от бутона по-долу.";
    }

    const linkButtons: Record<string, unknown>[] = [
      {
        type: 2,
        style: 5,
        label: "🎫 Пусни тикет",
        url: TICKET_CHANNEL_URL,
      },
    ];
    if (siteBase) {
      linkButtons.push(
        {
          type: 2,
          style: 5,
          label: "👤 Профил (citizenid)",
          url: `${siteBase}/profile`,
        },
        {
          type: 2,
          style: 5,
          label: "🛍️ Поръчки / магазин",
          url: `${siteBase}/shop`,
        },
      );
    }

    await fetch(`${DISCORD_API}/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: botHeaders,
      body: JSON.stringify({
        embeds: [
          {
            title: `🛒 Покупка потвърдена — ${product_name || "TLR"}`,
            description,
            color: 0x9b59b6,
            fields: dmFields,
            footer: { text: "TLR Shop" },
            timestamp: now.toISOString(),
          },
        ],
        components: [{ type: 1, components: linkButtons }],
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
