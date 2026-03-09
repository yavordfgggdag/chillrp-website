const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const WEBHOOK_URL = Deno.env.get("DISCORD_ADMIN_LOG_WEBHOOK_URL");
    if (!WEBHOOK_URL) throw new Error("DISCORD_ADMIN_LOG_WEBHOOK_URL не е конфигуриран");

    const { action, details, admin_email } = await req.json();

    const colorMap: Record<string, number> = {
      create: 0x2ecc71,
      update: 0xf39c12,
      delete: 0xe74c3c,
      approve: 0x27ae60,
      reject: 0xc0392b,
      role_change: 0x9b59b6,
    };

    const iconMap: Record<string, string> = {
      create: "➕",
      update: "✏️",
      delete: "🗑️",
      approve: "✅",
      reject: "❌",
      role_change: "👑",
    };

    const actionType = action?.split("_")[0] || "update";
    const color = colorMap[actionType] || 0x3498db;
    const icon = iconMap[actionType] || "📋";

    const embed = {
      embeds: [
        {
          title: `${icon} Admin Log — ${action}`,
          color,
          description: details || "Няма допълнителни детайли.",
          fields: [
            { name: "👤 Админ", value: admin_email || "Неизвестен", inline: true },
            { name: "🕐 Време", value: new Date().toLocaleString("bg-BG", { timeZone: "Europe/Sofia" }), inline: true },
          ],
          footer: { text: "ChillRP Admin Logs" },
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
      throw new Error(`Discord webhook грешка [${res.status}]: ${text}`);
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
