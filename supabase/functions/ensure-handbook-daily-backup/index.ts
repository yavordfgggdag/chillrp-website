import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function requireAdmin(req: Request): Promise<{ ok: true } | { ok: false; status: number; body: unknown }> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { ok: false, status: 401, body: { error: "missing_auth" } };
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return { ok: false, status: 500, body: { error: "server_config" } };
  }
  const res = await fetch(`${supabaseUrl}/functions/v1/check-site-role`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      apikey: anonKey,
    },
  });
  const data = await res.json().catch(() => ({}));
  const role = data?.role;
  if (role !== "staff" && role !== "administrator") {
    return { ok: false, status: 403, body: { error: "admin_required" } };
  }
  return { ok: true };
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) {
      return new Response(JSON.stringify(admin.body), {
        status: admin.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "server_config" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: lastBackup } = await supabase
      .from("police_handbook_backups")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const now = Date.now();
    const lastAt = lastBackup?.created_at ? new Date(lastBackup.created_at).getTime() : 0;
    if (lastAt && now - lastAt < ONE_DAY_MS) {
      return new Response(
        JSON.stringify({ ok: true, created: false, reason: "last_backup_recent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: current, error: selectErr } = await supabase
      .from("police_handbook")
      .select("data")
      .eq("id", "current")
      .single();

    if (selectErr || !current?.data) {
      return new Response(
        JSON.stringify({ ok: true, created: false, reason: "no_current_data" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: insertErr } = await supabase
      .from("police_handbook_backups")
      .insert({ data: current.data });

    if (insertErr) {
      console.error("ensure-handbook-daily-backup insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "backup_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, created: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: "server_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
