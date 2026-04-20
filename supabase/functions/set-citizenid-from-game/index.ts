import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-chillrp-game-secret, x-supabase-client-platform, x-supabase-client-platform-version",
};

/**
 * FiveM / game server: записва QB citizenid в профил по Discord user id.
 * Headers: x-chillrp-game-secret = CHILLRP_GAME_CITIZEN_LINK_SECRET (Supabase Secrets)
 * Body: { "discord_id": "123...", "citizenid": "ABC12345" }
 *
 * Играчът трябва да е влязъл поне веднъж в сайта с Discord, за да има ред в profiles.discord_id.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const secret = Deno.env.get("CHILLRP_GAME_CITIZEN_LINK_SECRET")?.trim();
  const hdr = req.headers.get("x-chillrp-game-secret")?.trim();
  if (!secret || hdr !== secret) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: "server_config" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { discord_id?: string; citizenid?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const discordId = String(body.discord_id || "").trim();
  const citizenid = String(body.citizenid || "").trim().replace(/\s/g, "");
  if (!/^\d{10,25}$/.test(discordId) || citizenid.length < 2 || citizenid.length > 48) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error: qErr } = await admin
    .from("profiles")
    .select("id")
    .eq("discord_id", discordId)
    .limit(5);

  if (qErr) {
    console.error("set-citizenid-from-game select:", qErr);
    return new Response(JSON.stringify({ ok: false, error: "db" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!rows?.length) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "profile_not_found",
        hint: "Няма профил с този discord_id — влез веднъж в сайта с Discord (TLR).",
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (rows.length > 1) {
    return new Response(JSON.stringify({ ok: false, error: "ambiguous_profiles" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: uErr } = await admin.from("profiles").update({ qb_citizenid: citizenid }).eq("id", rows[0].id);

  if (uErr) {
    console.error("set-citizenid-from-game update:", uErr);
    return new Response(JSON.stringify({ ok: false, error: "update_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
