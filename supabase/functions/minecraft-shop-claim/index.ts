import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Minecraft Paper → POST със секрет; връща конзолни команди за изпълнение и маркира покупките.
 *
 * Secrets: SUPABASE_SERVICE_ROLE_KEY, MC_SHOP_CLAIM_SECRET (същата в server плъгин config).
 *
 * Body: { "ign": "Notch", "uuid"?: "optional-uuid-string" }
 * Header: x-tlr-mc-claim-secret: <secret>
 *
 * Отговор: { "deliveries": [ { "purchase_id", "product_name", "commands": string[] } ], "message"?: string }
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, x-tlr-mc-claim-secret",
};

function normalizeIgn(raw: string): string {
  return String(raw || "").trim();
}

function isValidIgn(ign: string): boolean {
  if (ign.length < 3 || ign.length > 16) return false;
  return /^[a-zA-Z0-9_]+$/.test(ign);
}

function expandPlaceholders(cmd: string, ign: string, uuid: string): string {
  return cmd
    .replaceAll("{player}", ign)
    .replaceAll("{name}", ign)
    .replaceAll("{uuid}", uuid);
}

function extractCommands(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const x of raw) {
      if (typeof x === "string" && x.trim()) out.push(x);
      else if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        const c = o.cmd ?? o.command;
        if (typeof c === "string" && c.trim()) out.push(c);
      }
    }
    return out;
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const arr = o.commands ?? o.console;
    if (Array.isArray(arr)) {
      return arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    }
  }
  return [];
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

  const expected = Deno.env.get("MC_SHOP_CLAIM_SECRET")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!expected || !supabaseUrl || !serviceKey) {
    console.error("minecraft-shop-claim: missing MC_SHOP_CLAIM_SECRET or Supabase env");
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const provided = req.headers.get("x-tlr-mc-claim-secret")?.trim() ?? "";
  if (!provided || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: { ign?: string; uuid?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const ign = normalizeIgn(body.ign ?? "");
  const uuid = typeof body.uuid === "string" ? body.uuid.trim() : "";

  if (!isValidIgn(ign)) {
    return new Response(JSON.stringify({ error: "invalid_ign" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: profileRows, error: profErr } = await admin.rpc("get_profile_by_minecraft_ign", {
    p_ign: ign,
  });

  if (profErr) {
    console.error("minecraft-shop-claim profile", profErr);
    return new Response(JSON.stringify({ error: "lookup_failed" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const profile = Array.isArray(profileRows) && profileRows.length > 0
    ? profileRows[0] as { id: string; minecraft_username: string | null }
    : null;

  if (!profile?.id) {
    return new Response(
      JSON.stringify({
        deliveries: [],
        message: "no_profile",
        hint: "Няма профил с това Minecraft име в сайта. Влез в сайта и задай същото име.",
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const dbIgn = typeof profile.minecraft_username === "string" ? profile.minecraft_username.trim() : ign;

  const { data: purchases, error: purErr } = await admin
    .from("purchases")
    .select("id, product_name")
    .eq("user_id", profile.id)
    .is("minecraft_claimed_at", null);

  if (purErr || !purchases?.length) {
    if (purErr) console.error("minecraft-shop-claim purchases", purErr);
    return new Response(
      JSON.stringify({
        deliveries: [],
        message: purErr ? "query_failed" : "nothing_pending",
      }),
      { status: purErr ? 500 : 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const names = [...new Set(purchases.map((p) => p.product_name).filter((n) => typeof n === "string" && n.length > 0))];

  const { data: products, error: prodErr } = await admin
    .from("products")
    .select("name, minecraft_grants_json")
    .in("name", names);

  if (prodErr) {
    console.error("minecraft-shop-claim products", prodErr);
    return new Response(JSON.stringify({ error: "products_failed" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const byName = new Map<string, unknown>();
  for (const row of products ?? []) {
    if (row?.name) byName.set(String(row.name), row.minecraft_grants_json);
  }

  const deliveries: {
    purchase_id: string;
    product_name: string;
    commands: string[];
  }[] = [];

  const idsToMark: string[] = [];

  for (const p of purchases) {
    const pname = p.product_name as string;
    const rawGrants = byName.get(pname);
    const cmds = extractCommands(rawGrants).map((c) => expandPlaceholders(c, dbIgn, uuid));
    if (cmds.length === 0) continue;

    deliveries.push({
      purchase_id: p.id as string,
      product_name: pname,
      commands: cmds,
    });
    idsToMark.push(p.id as string);
  }

  if (deliveries.length === 0) {
    return new Response(
      JSON.stringify({
        deliveries: [],
        message: "nothing_to_claim",
        hint:
          "Има покупки, но за тях няма minecraft_grants_json в продукта. Добави команди в Supabase → products.",
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const now = new Date().toISOString();
  const { error: upErr } = await admin
    .from("purchases")
    .update({ minecraft_claimed_at: now })
    .in("id", idsToMark);

  if (upErr) {
    console.error("minecraft-shop-claim mark claimed", upErr);
    return new Response(JSON.stringify({ error: "mark_failed" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ deliveries, message: "ok" }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
