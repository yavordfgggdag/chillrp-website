import Stripe from "npm:stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Stripe checkout.session.completed →
 *  - опционално store_redeem_codes (код за /chillrp_redeem в играта)
 *  - опционално opcrime_gc_deliveries + RCON (автоматичен GC към citizenid в профила)
 *  - известие в Discord (DM + webhook) с код и инструкции от продуктите
 *
 * Metadata от create-payment: opcrime_slug_line, checkout_org_id, supabase_user_id, opcrime_gc_total (legacy).
 */

type PRow = {
  slug: string;
  name: string | null;
  discord_purchase_dm_template: string | null;
  opcrime_gc_amount: number | null;
  opcrime_use_redeem_code: boolean | null;
  opcrime_org_money_amount: number | null;
  opcrime_org_money_account: string | null;
  ingame_grants_json: unknown;
  ingame_player_hint: string | null;
};

function applyPurchaseTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

function buildDmOverridesFromProducts(
  slugs: string[],
  pmap: Map<string, PRow>,
  varsBase: Record<string, string>,
): string | null {
  const order = [...new Set(slugs.map((s) => s.trim()).filter((s) => s.length > 0))];
  const parts: string[] = [];
  for (const slug of order) {
    const row = pmap.get(slug);
    const t = row?.discord_purchase_dm_template?.trim();
    if (!t) continue;
    const name = row?.name?.trim() || slug;
    parts.push(applyPurchaseTemplate(t, { ...varsBase, product_name: name }));
  }
  return parts.length ? parts.join("\n\n────────\n\n") : null;
}

type Grant =
  | { type: "season_gc"; amount: number }
  | { type: "org_money"; orgId: number; amount: number; account: string };

function appendSanitizedIngameGrants(dst: Grant[], raw: unknown): void {
  if (!Array.isArray(raw)) return;
  for (const g of raw) {
    if (!g || typeof g !== "object") continue;
    const o = g as Record<string, unknown>;
    if (o.type === "season_gc" && typeof o.amount === "number" && o.amount > 0) {
      dst.push({ type: "season_gc", amount: Math.floor(o.amount) });
      continue;
    }
    if (o.type === "org_money" && typeof o.orgId === "number" && typeof o.amount === "number" && o.amount > 0) {
      const acc = o.account === "dirtymoney" ? "dirtymoney" : "balance";
      dst.push({
        type: "org_money",
        orgId: Math.floor(o.orgId),
        amount: Math.floor(o.amount),
        account: acc,
      });
    }
  }
}

function buildGrantsAndAutoGc(
  slugs: string[],
  pmap: Map<string, PRow>,
  orgId: number,
): { autoGc: number; redeemGrants: Grant[] } {
  let autoGc = 0;
  const redeemGrants: Grant[] = [];

  const accountOf = (p: PRow) => (p.opcrime_org_money_account === "dirtymoney" ? "dirtymoney" : "balance");

  for (const slug of slugs) {
    const key = slug.trim();
    if (!key) continue;
    const p = pmap.get(key);
    if (!p) continue;
    const gc = typeof p.opcrime_gc_amount === "number" && p.opcrime_gc_amount > 0 ? Math.floor(p.opcrime_gc_amount) : 0;
    const orgAmt =
      typeof p.opcrime_org_money_amount === "number" && p.opcrime_org_money_amount > 0
        ? Math.floor(p.opcrime_org_money_amount)
        : 0;
    const useRedeem = !!p.opcrime_use_redeem_code;

    if (useRedeem) {
      if (gc > 0) redeemGrants.push({ type: "season_gc", amount: gc });
      if (orgAmt > 0 && orgId >= 1) {
        redeemGrants.push({ type: "org_money", orgId, amount: orgAmt, account: accountOf(p) });
      }
    } else {
      if (gc > 0) autoGc += gc;
      if (orgAmt > 0 && orgId >= 1) {
        redeemGrants.push({ type: "org_money", orgId, amount: orgAmt, account: accountOf(p) });
      }
    }
    appendSanitizedIngameGrants(redeemGrants, p.ingame_grants_json);
  }
  return { autoGc, redeemGrants };
}

function collectHintLines(slugs: string[], pmap: Map<string, PRow>): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const slug of slugs) {
    const h = pmap.get(slug.trim())?.ingame_player_hint?.trim();
    if (!h || seen.has(h)) continue;
    seen.add(h);
    lines.push(h);
  }
  return lines.join("\n\n");
}

function randomRedeemCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[buf[i] % chars.length];
  return s;
}

async function invokeNotifyDiscordPurchase(
  supabaseUrl: string,
  serviceKey: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/notify-discord-purchase`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("notify-discord-purchase failed:", res.status, t.slice(0, 500));
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const whSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeKey || !whSecret || !supabaseUrl || !serviceKey) {
    console.error("stripe-webhook-opcrime-gc: missing env (STRIPE_* / SUPABASE_*)");
    return new Response(JSON.stringify({ error: "server_misconfigured" }), { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {});
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response(JSON.stringify({ error: "no_signature" }), { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (e) {
    console.error("Stripe signature verify failed:", e);
    return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true, ignored: event.type }), { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata || {};
  const userId = (meta.supabase_user_id || "").trim();
  const slugLine = String(meta.opcrime_slug_line || "").trim();
  const checkoutOrgId = Math.floor(Number.parseInt(String(meta.checkout_org_id || "0"), 10) || 0);

  const admin = createClient(supabaseUrl, serviceKey);

  const slugs = slugLine ? slugLine.split(",").map((s) => s.trim()).filter((s) => s.length > 0) : [];

  let autoGc = 0;
  let redeemGrants: Grant[] = [];
  const pmap = new Map<string, PRow>();

  if (slugs.length > 0) {
    const unique = [...new Set(slugs)];
    const { data: rows, error: pErr } = await admin
      .from("products")
      .select(
        "slug, name, discord_purchase_dm_template, opcrime_gc_amount, opcrime_use_redeem_code, opcrime_org_money_amount, opcrime_org_money_account, ingame_grants_json, ingame_player_hint",
      )
      .in("slug", unique);
    if (pErr) {
      console.error("products fetch:", pErr);
      return new Response(JSON.stringify({ error: "products_fetch" }), { status: 500 });
    }
    for (const r of (rows || []) as PRow[]) pmap.set(r.slug, r);
    const built = buildGrantsAndAutoGc(slugs, pmap, checkoutOrgId);
    autoGc = built.autoGc;
    redeemGrants = built.redeemGrants;
  } else {
    const gcRaw = meta.opcrime_gc_total ?? "0";
    autoGc = Math.floor(Number.parseInt(String(gcRaw), 10) || 0);
  }

  const hasRedeem = redeemGrants.length > 0;
  const hasAuto = autoGc > 0;

  const hintBlock = collectHintLines(slugs, pmap);
  const template = (Deno.env.get("STORE_REDEEM_COMMAND_TEMPLATE")?.trim() || "/chillrp_redeem {CODE}").replaceAll(
    "{code}",
    "{CODE}",
  );

  let redeemCode: string | null = null;

  if (hasRedeem) {
    if (!userId) {
      console.warn("stripe-webhook: redeem grants but no supabase_user_id", session.id);
    } else {
      const { data: existingRedeem } = await admin
        .from("store_redeem_codes")
        .select("code")
        .eq("stripe_session_id", session.id)
        .maybeSingle();
      if (existingRedeem?.code) {
        redeemCode = String(existingRedeem.code);
      } else {
        let code = randomRedeemCode();
        let inserted = false;
        for (let attempt = 0; attempt < 12; attempt++) {
          const { error: insErr } = await admin.from("store_redeem_codes").insert({
            code,
            stripe_session_id: session.id,
            supabase_user_id: userId,
            grants: redeemGrants,
            status: "pending",
          });
          if (!insErr) {
            inserted = true;
            redeemCode = code;
            break;
          }
          if (insErr.code === "23505") {
            code = randomRedeemCode();
            continue;
          }
          console.error("store_redeem_codes insert:", insErr);
          return new Response(JSON.stringify({ error: "redeem_insert" }), { status: 500 });
        }
        if (!inserted) {
          return new Response(JSON.stringify({ error: "redeem_code_collision" }), { status: 500 });
        }
      }
    }
  }

  let autoGcNote: string | null = null;
  let responseTag: Record<string, unknown> = {};

  if (hasAuto && userId) {
    const { data: existingGc } = await admin
      .from("opcrime_gc_deliveries")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    if (existingGc) {
      responseTag = { received: true, duplicate_gc: true };
    } else {
      const { data: profile } = await admin
        .from("profiles")
        .select("qb_citizenid")
        .eq("id", userId)
        .maybeSingle();

      const citizenid = (profile?.qb_citizenid as string | null | undefined)?.trim() || "";

      if (!citizenid) {
        await admin.from("opcrime_gc_deliveries").insert({
          stripe_session_id: session.id,
          supabase_user_id: userId,
          qb_citizenid: null,
          gc_amount: autoGc,
          status: "failed_no_citizenid",
          delivery_note: "Профилът няма запазен QB citizenid.",
        });
        autoGcNote =
          "Имаш награда Season GC, но в сайт профила липсва **QB citizenid**. Попълни го в Профил и пусни тикет — ще ти я начислим ръчно.";
        responseTag = { received: true, failed: "no_citizenid" };
      } else {
        const deliveryUrl = Deno.env.get("OPCRIME_GC_DELIVERY_URL")?.trim();
        const deliverySecret = Deno.env.get("OPCRIME_GC_DELIVERY_SECRET")?.trim();

        let status = "pending";
        let note = "";

        if (deliveryUrl && deliverySecret) {
          try {
            const res = await fetch(deliveryUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${deliverySecret}`,
              },
              body: JSON.stringify({
                stripe_session_id: session.id,
                citizenid,
                amount: autoGc,
              }),
            });
            const text = await res.text().catch(() => "");
            if (res.ok) {
              status = "delivered";
              note = text.slice(0, 500);
            } else {
              status = "failed_delivery";
              note = `HTTP ${res.status} ${text.slice(0, 400)}`;
            }
          } catch (e) {
            status = "failed_delivery";
            note = String(e).slice(0, 500);
          }
        } else {
          note = "Няма OPCRIME_GC_DELIVERY_URL — ръчно opcrime_store или настрой bridge.";
        }

        const { error: insErr } = await admin.from("opcrime_gc_deliveries").insert({
          stripe_session_id: session.id,
          supabase_user_id: userId,
          qb_citizenid: citizenid,
          gc_amount: autoGc,
          status,
          delivery_note: note || null,
        });

        if (insErr) {
          if (insErr.code === "23505") {
            responseTag = { received: true, race_duplicate: true };
          } else {
            console.error("opcrime_gc insert error:", insErr);
            return new Response(JSON.stringify({ error: "db_insert" }), { status: 500 });
          }
        } else {
          if (status === "delivered") {
            autoGcNote = `Начислени **${autoGc}** Season GC към твоя персонаж (автоматично).`;
          } else {
            autoGcNote = `Има **${autoGc}** Season GC за теб; доставката е в процес или изисква намеса — пусни тикет ако не ги видиш скоро.`;
          }
          responseTag = { received: true, status, auto_gc: autoGc };
        }
      }
    }
  } else if (hasAuto && !userId) {
    console.warn("stripe-webhook: auto GC but no user", session.id);
    responseTag = { received: true, no_user: true };
  } else if (!hasAuto && hasRedeem) {
    responseTag = { received: true, redeem_only: true };
  } else if (!hasRedeem && !hasAuto) {
    responseTag = { received: true, no_opcrime_fulfillment: true };
  }

  const discordUser = String(meta.discord_username || "").trim();
  if (discordUser) {
    const { error: claimErr } = await admin.from("stripe_checkout_buyer_dm_sent").insert({
      checkout_session_id: session.id,
    });
    if (claimErr && claimErr.code !== "23505") {
      console.error("stripe_checkout_buyer_dm_sent insert:", claimErr);
    }
    const skipDm = claimErr?.code === "23505";

    if (!skipDm) {
      const eur = (session.amount_total ?? 0) / 100;
      const commandLine = redeemCode ? template.replace(/\{CODE\}/g, redeemCode) : "";
      const ingameParts: string[] = [];
      if (commandLine) ingameParts.push(`В игра напиши: \`${commandLine}\``);
      if (hintBlock) ingameParts.push(hintBlock);
      const ingame_instruction = ingameParts.join("\n\n").trim() || null;

      const hasDigital = !!(redeemCode || ingame_instruction || autoGcNote);
      const dmVars: Record<string, string> = {
        product_name: String(meta.product_name || "TLR магазин"),
        product_summary: String(meta.product_name || "TLR магазин"),
        total_eur: eur.toFixed(2),
        discord_username: discordUser,
        redeem_code: redeemCode || "",
        price: `${eur.toFixed(2)} EUR`,
        category: "—",
        ingame_instruction: ingame_instruction || "",
        auto_gc_note: autoGcNote || "",
        reference: "",
      };
      const purchase_dm_description_override =
        slugs.length > 0 ? buildDmOverridesFromProducts(slugs, pmap, dmVars) : null;

      await invokeNotifyDiscordPurchase(supabaseUrl, serviceKey, {
        discord_username: discordUser,
        product_name: String(meta.product_name || "TLR магазин"),
        price: eur,
        category: "—",
        redeem_code: redeemCode,
        ingame_instruction,
        auto_gc_note: autoGcNote,
        needs_manual_staff: !hasDigital,
        purchase_dm_description_override,
      });
    }
  }

  return new Response(JSON.stringify(responseTag), { status: 200 });
});
