import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "server_config" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // За да не може всеки да пуска бекъпа, очакваме или service role, или X-Cron-Secret header.
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const secretHeader = req.headers.get("x-cron-secret") || req.headers.get("X-Cron-Secret") || "";

    const isServiceRole = !!bearer && bearer === supabaseServiceKey;
    const isCronAllowed = !!cronSecret && secretHeader === cronSecret;

    if (!isServiceRole && !isCronAllowed) {
      return new Response(
        JSON.stringify({ ok: false, error: "unauthorized" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Четем основните таблици, които движат сайта.
    const [
      productsRes,
      faqRes,
      rulesRes,
      settingsRes,
      staffRes,
      gangAppsRes,
      purchasesRes,
    ] = await Promise.all([
      supabase.from("products").select("*").order("sort_order", { ascending: true }),
      supabase.from("faq_items").select("*").order("sort_order", { ascending: true }),
      supabase.from("rule_sections").select("*").order("sort_order", { ascending: true }),
      supabase.from("site_settings").select("*").order("key", { ascending: true }),
      supabase.from("staff_members").select("*").order("sort_order", { ascending: true }),
      supabase.from("gang_applications").select("*").order("submitted_at", { ascending: false }).limit(200),
      supabase.from("purchases").select("*").order("created_at", { ascending: false }).limit(200),
    ]);

    const snapshot = {
      created_at: new Date().toISOString(),
      products: productsRes.data || [],
      faq_items: faqRes.data || [],
      rule_sections: rulesRes.data || [],
      site_settings: settingsRes.data || [],
      staff_members: staffRes.data || [],
      gang_applications: gangAppsRes.data || [],
      purchases: purchasesRes.data || [],
    };

    const json = JSON.stringify(snapshot, null, 2);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(json);

    // Пишем JSON файл в bucket "uploads" под папка backups/site-state/.
    const fileName = `backups/site-state/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, bytes, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      console.error("backup-site-state upload error:", uploadError);
      return new Response(
        JSON.stringify({ ok: false, error: "upload_failed", details: uploadError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, path: uploadData?.path || fileName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("backup-site-state error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: "server_error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

