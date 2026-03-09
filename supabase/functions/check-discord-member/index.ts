import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { discord_username } = await req.json();

    if (!discord_username || typeof discord_username !== "string" || discord_username.trim().length < 2) {
      return new Response(JSON.stringify({ isMember: false, error: "Невалидно Discord username" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const guildId = Deno.env.get("DISCORD_GUILD_ID");

    if (!botToken || !guildId) {
      console.error("Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID");
      return new Response(JSON.stringify({ isMember: false, error: "Server config error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const username = discord_username.trim().toLowerCase();

    // Search guild members by query (username)
    const searchUrl = `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(username)}&limit=10`;
    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Discord API error:", res.status, errText);
      return new Response(JSON.stringify({ isMember: false, error: "Discord API грешка" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const members = await res.json();
    const found = members.some((m: any) =>
      m.user?.username?.toLowerCase() === username ||
      m.user?.global_name?.toLowerCase() === username
    );

    return new Response(JSON.stringify({ isMember: found }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ isMember: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
