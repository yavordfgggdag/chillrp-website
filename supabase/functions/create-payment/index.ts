import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
];

function getOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.startsWith("http://127.0.0.1:"))) {
    return origin;
  }
  if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
    return origin;
  }
  return Deno.env.get("SITE_URL") || "http://localhost:8080";
}

type ItemIn = {
  priceId?: string;
  amountCents?: number;
  productName: string;
  slug?: string;
};

async function resolveSupabaseUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return null;
  const supabase = createClient(url, anon);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.id) return null;
  return user.id;
}

type OpcrimeRow = {
  slug: string;
  opcrime_gc_amount: number | null;
  opcrime_use_redeem_code: boolean | null;
  opcrime_org_money_amount: number | null;
  ingame_grants_json: unknown;
};

async function loadOpcrimeRows(
  anonKey: string,
  supabaseUrl: string,
  slugs: string[],
): Promise<Map<string, OpcrimeRow>> {
  const m = new Map<string, OpcrimeRow>();
  const unique = [...new Set(slugs.filter((s) => typeof s === "string" && s.length > 0))];
  if (unique.length === 0) return m;
  const client = createClient(supabaseUrl, anonKey);
  const { data: rows, error } = await client
    .from("products")
    .select("slug, opcrime_gc_amount, opcrime_use_redeem_code, opcrime_org_money_amount, ingame_grants_json")
    .in("slug", unique);
  if (error || !rows?.length) return m;
  for (const r of rows as OpcrimeRow[]) m.set(r.slug, r);
  return m;
}

/** GC само за редове без „redeem код“ — съвпада с webhook auto path. */
function sumAutoOpcrimeGcForSlugList(slugs: string[], pmap: Map<string, OpcrimeRow>): number {
  let total = 0;
  for (const s of slugs) {
    const p = pmap.get(s);
    if (!p || p.opcrime_use_redeem_code) continue;
    const n = p.opcrime_gc_amount;
    if (typeof n === "number" && n > 0) total += n;
  }
  return total;
}

function hasNonEmptyIngameGrants(raw: unknown): boolean {
  return Array.isArray(raw) && raw.length > 0;
}

function cartNeedsOpcrimeLogin(slugs: string[], pmap: Map<string, OpcrimeRow>): boolean {
  for (const s of slugs) {
    const p = pmap.get(s);
    if (!p) continue;
    const gc = p.opcrime_gc_amount ?? 0;
    const org = p.opcrime_org_money_amount ?? 0;
    if (gc > 0 || org > 0 || p.opcrime_use_redeem_code || hasNonEmptyIngameGrants(p.ingame_grants_json)) {
      return true;
    }
  }
  return false;
}

function cartNeedsCheckoutOrgId(slugs: string[], pmap: Map<string, OpcrimeRow>): boolean {
  for (const s of slugs) {
    const p = pmap.get(s);
    if (!p) continue;
    if ((p.opcrime_org_money_amount ?? 0) > 0) return true;
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";

  try {
    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secretKey || secretKey.length < 20) {
      return new Response(
        JSON.stringify({
          error: "STRIPE_SECRET_KEY не е зададен в Supabase Edge Function Secrets. Виж STRIPE_SETUP.md.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    const stripe = new Stripe(secretKey, {});

    const body = await req.json().catch(() => ({}));
    const {
      priceId,
      productName,
      discordUsername,
      amountCents,
      slug: singleSlug,
      items: lineItemsBody,
      checkoutOrgId: checkoutOrgIdRaw,
    } = body as {
      priceId?: string;
      productName?: string;
      discordUsername?: string;
      amountCents?: number;
      slug?: string;
      items?: ItemIn[];
      checkoutOrgId?: number;
    };

    const origin = getOrigin(req);
    const currency = "eur";

    type LineItem =
      | { price: string; quantity: number }
      | { price_data: { currency: string; unit_amount: number; product_data: { name: string } }; quantity: number };

    let line_items: LineItem[] = [];
    let firstProductName = productName || "";
    let firstDiscord = discordUsername || "";
    const slugsForGc: string[] = [];

    if (Array.isArray(lineItemsBody) && lineItemsBody.length > 0) {
      for (const it of lineItemsBody) {
        const name = (it.productName && String(it.productName).trim()) || "TLR продукт";
        if (it.slug && String(it.slug).trim()) {
          slugsForGc.push(String(it.slug).trim());
        }
        if (it.priceId && String(it.priceId).trim()) {
          line_items.push({ price: String(it.priceId).trim(), quantity: 1 });
        } else if (typeof it.amountCents === "number" && it.amountCents > 0) {
          line_items.push({
            price_data: {
              currency,
              unit_amount: Math.round(it.amountCents),
              product_data: { name },
            },
            quantity: 1,
          });
        }
      }
      if (lineItemsBody[0]) {
        firstProductName = lineItemsBody[0].productName || "";
      }
      firstDiscord = discordUsername || "";
    } else if (priceId && typeof priceId === "string" && priceId.trim()) {
      line_items = [{ price: priceId.trim(), quantity: 1 }];
      firstProductName = productName || "";
      firstDiscord = discordUsername || "";
      if (singleSlug && String(singleSlug).trim()) slugsForGc.push(String(singleSlug).trim());
    } else if (typeof amountCents === "number" && amountCents > 0 && productName) {
      line_items = [
        {
          price_data: {
            currency,
            unit_amount: Math.round(amountCents),
            product_data: { name: String(productName).trim() || "TLR продукт" },
          },
          quantity: 1,
        },
      ];
      firstProductName = productName || "";
      firstDiscord = discordUsername || "";
      if (singleSlug && String(singleSlug).trim()) slugsForGc.push(String(singleSlug).trim());
    }

    if (line_items.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Укажи priceId или (amountCents + productName), или масив items с priceId или amountCents за всеки продукт.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkoutOrgId =
      typeof checkoutOrgIdRaw === "number" && Number.isFinite(checkoutOrgIdRaw) && checkoutOrgIdRaw >= 1
        ? Math.floor(checkoutOrgIdRaw)
        : 0;

    let pmap = new Map<string, OpcrimeRow>();
    if (slugsForGc.length > 0 && anonKey && supabaseUrl) {
      pmap = await loadOpcrimeRows(anonKey, supabaseUrl, slugsForGc);
    }

    const totalGc = sumAutoOpcrimeGcForSlugList(slugsForGc, pmap);
    const slugLine = slugsForGc.join(",");
    const needsOpcrimeLogin = slugsForGc.length > 0 && cartNeedsOpcrimeLogin(slugsForGc, pmap);
    const needsOrg = slugsForGc.length > 0 && cartNeedsCheckoutOrgId(slugsForGc, pmap);

    if (needsOrg && checkoutOrgId < 1) {
      return new Response(
        JSON.stringify({
          error:
            "Поне един продукт начислява пари в сейфа на банда (op-crime). Въведи числов Gang ID в количката и опитай отново.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUserId = await resolveSupabaseUserId(req);

    if (needsOpcrimeLogin) {
      if (!supabaseUserId) {
        return new Response(
          JSON.stringify({
            error:
              "Този продукт е свързан с награди в играта (GC / банда / redeem). Влез в сайта с Discord акаунт и опитай отново.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (anonKey && supabaseUrl && authHeader.startsWith("Bearer ")) {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: prof } = await userClient.from("profiles").select("qb_citizenid").eq("id", supabaseUserId).maybeSingle();
        const cid = typeof prof?.qb_citizenid === "string" ? prof.qb_citizenid.trim() : "";
        if (!cid) {
          return new Response(
            JSON.stringify({
              error:
                "За покупка с награди в играта трябва да си въведеш QB citizenid в сайт профила (Профил → In-game идентификатор). Влез с Discord, попълни citizenid (в игра ползвай сървърната команда, ако има) и опитай отново.",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      billing_address_collection: "auto",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&product=${encodeURIComponent(firstProductName)}&discord=${encodeURIComponent(firstDiscord)}`,
      cancel_url: `${origin}/shop`,
      metadata: {
        product_name: firstProductName,
        discord_username: firstDiscord,
        supabase_user_id: supabaseUserId ?? "",
        opcrime_gc_total: String(totalGc),
        opcrime_slug_line: slugLine.slice(0, 450),
        checkout_org_id: String(checkoutOrgId),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("create-payment error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
