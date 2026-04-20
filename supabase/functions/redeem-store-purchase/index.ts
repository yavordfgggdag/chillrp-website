import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * FiveM → POST със секрет; маркира кода като използван и връща grants за изпълнение в Lua.
 * Secrets: SUPABASE_SERVICE_ROLE_KEY, CHILLRP_STORE_REDEEM_SECRET (същата стойност в server.cfg).
 *
 * Body: { "code": "ABC123", "citizenid": "ABC12345" }
 * Header: x-chillrp-redeem-secret: <secret>
 */

type Grant =
  | { type: "season_gc"; amount: number }
  | { type: "org_money"; orgId: number; amount: number; account: string };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, x-chillrp-redeem-secret",
};

function normalizeCode(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: { ...cors, "Content-Type": "text/plain" } });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("CHILLRP_STORE_REDEEM_SECRET")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!expected || !supabaseUrl || !serviceKey) {
    console.error("redeem-store-purchase: missing CHILLRP_STORE_REDEEM_SECRET or Supabase env");
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const provided = req.headers.get("x-chillrp-redeem-secret")?.trim() ?? "";
  if (!provided || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: { code?: string; citizenid?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const code = normalizeCode(body.code ?? "");
  const citizenid = String(body.citizenid ?? "").trim();

  if (code.length < 8 || code.length > 14) {
    return new Response(JSON.stringify({ error: "invalid_code" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (citizenid.length < 3 || citizenid.length > 48 || /\s/.test(citizenid)) {
    return new Response(JSON.stringify({ error: "invalid_citizenid" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: row, error: selErr } = await admin
    .from("store_redeem_codes")
    .select("id, code, status, grants")
    .eq("code", code)
    .maybeSingle();

  if (selErr || !row) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (row.status !== "pending") {
    return new Response(JSON.stringify({ error: "already_used" }), {
      status: 409,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const grants = (Array.isArray(row.grants) ? row.grants : []) as Grant[];

  const { error: upErr } = await admin
    .from("store_redeem_codes")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
      redeemed_citizenid: citizenid,
    })
    .eq("id", row.id)
    .eq("status", "pending");

  if (upErr) {
    console.error("redeem update:", upErr);
    return new Response(JSON.stringify({ error: "update_failed" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, grants }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
