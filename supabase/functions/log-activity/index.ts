const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const WEBHOOK_URL = Deno.env.get("DISCORD_ACTIVITY_LOG_WEBHOOK_URL");
    if (!WEBHOOK_URL) throw new Error("DISCORD_ACTIVITY_LOG_WEBHOOK_URL not set");

    const { event, details, user_email, user_id, page, timestamp } = await req.json();

    const colorMap: Record<string, number> = {
      page_view: 0x3498db,
      login: 0x2ecc71,
      logout: 0xe74c3c,
      purchase_start: 0xf39c12,
      purchase_complete: 0x27ae60,
      gang_apply: 0x9b59b6,
      shop_view: 0xe67e22,
      product_view: 0x1abc9c,
      cart_add: 0xf1c40f,
      cart_remove: 0xe74c3c,
      profile_update: 0x2980b9,
      chat_open: 0x95a5a6,
      click: 0x8e44ad,
      scroll: 0x7f8c8d,
      form_focus: 0x2980b9,
      copy: 0xe67e22,
      modal_open: 0xf39c12,
      modal_close: 0x95a5a6,
      checkout_start: 0xe74c3c,
      gang_submit: 0x9b59b6,
      category_filter: 0x1abc9c,
      auth_modal_open: 0x2ecc71,
    };

    const iconMap: Record<string, string> = {
      page_view: "👁️",
      login: "🔑",
      logout: "🚪",
      purchase_start: "🛒",
      purchase_complete: "💰",
      gang_apply: "📝",
      shop_view: "🏪",
      product_view: "🔍",
      cart_add: "➕",
      cart_remove: "➖",
      profile_update: "👤",
      chat_open: "💬",
      click: "🖱️",
      scroll: "📜",
      form_focus: "✏️",
      copy: "📋",
      modal_open: "📦",
      modal_close: "❌",
      checkout_start: "💳",
      gang_submit: "📨",
      category_filter: "🏷️",
      auth_modal_open: "🔐",
    };

    const color = colorMap[event] || 0x7f8c8d;
    const icon = iconMap[event] || "📋";

    const embed = {
      embeds: [
        {
          title: `${icon} ${event.replace(/_/g, " ").toUpperCase()}`,
          color,
          description: details || "",
          fields: [
            { name: "👤 Потребител", value: user_email || "Гост", inline: true },
            { name: "📍 Страница", value: page || "/", inline: true },
            { name: "🕐 Време", value: new Date(timestamp || Date.now()).toLocaleString("bg-BG", { timeZone: "Europe/Sofia" }), inline: true },
          ],
          footer: { text: `ChillRP Activity • ${user_id || "anonymous"}` },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(embed),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Discord webhook error [${res.status}]: ${text}`);
    }

    return new Response(JSON.stringify({ success: true }), {
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
