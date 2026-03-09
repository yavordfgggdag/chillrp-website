const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");
    if (!DISCORD_WEBHOOK_URL) throw new Error("DISCORD_WEBHOOK_URL не е конфигуриран");

    const { name, leader, gang_type, members, discord_username } = await req.json();

    const embed = {
      embeds: [
        {
          title: `🔔 Нова Генг Кандидатура — ${name}`,
          color: 0x9b59b6,
          fields: [
            { name: "👑 Лидер", value: leader || "—", inline: true },
            { name: "⚔️ Тип", value: gang_type || "—", inline: true },
            { name: "👥 Членове", value: members || "—", inline: false },
            { name: "💬 Discord", value: discord_username || "—", inline: true },
          ],
          footer: { text: "ChillRP • Admin Panel → /admin" },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(DISCORD_WEBHOOK_URL, {
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
