import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { action, details, admin_email } = await req.json();
    const adminEmail = admin_email || "неизвестен";

    // Запис в web_logs – всеки админ лог с акаунта, който е направил действието
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
        await supabase.from("web_logs").insert({
          event: `admin_${action}`,
          details: details || "",
          page: "/admin",
          user_email: adminEmail,
          module: "admin",
        });
      } catch (dbErr) {
        console.error("notify-admin-log web_logs insert:", dbErr);
      }
    }

    const WEBHOOK_URL = Deno.env.get("DISCORD_ADMIN_LOG_WEBHOOK_URL");
    if (!WEBHOOK_URL) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            { name: "👤 Акаунт", value: adminEmail, inline: true },
            { name: "🕐 Време", value: new Date().toLocaleString("bg-BG", { timeZone: "Europe/Sofia" }), inline: true },
          ],
          footer: { text: "TLR Admin Logs" },
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
