import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const stripe = new Stripe(secretKey, {});

    const body = await req.json().catch(() => ({}));
    const { priceId, productName, discordUsername } = body as {
      priceId?: string;
      productName?: string;
      discordUsername?: string;
    };

    if (!priceId || typeof priceId !== "string") {
      return new Response(JSON.stringify({ error: "priceId е задължителен" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = getOrigin(req);

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId.trim(), quantity: 1 }],
      mode: "payment",
      billing_address_collection: "auto",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&product=${encodeURIComponent(productName || "")}&discord=${encodeURIComponent(discordUsername || "")}`,
      cancel_url: `${origin}/shop`,
      metadata: {
        product_name: productName || "",
        discord_username: discordUsername || "",
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
