/**
 * Магазин: Stripe vs Revolut / банков превод (публични VITE_* — само IBAN/име, без тайни).
 */
export type ShopPaymentMode = "revolut" | "stripe" | "both";

export function getShopPaymentMode(): ShopPaymentMode {
  const raw = (import.meta.env.VITE_SHOP_PAYMENT as string | undefined)?.toLowerCase().trim();
  if (raw === "stripe") return "stripe";
  if (raw === "both") return "both";
  return "revolut";
}

export type RevolutPublicConfig = {
  iban: string;
  bic: string | null;
  beneficiary: string | null;
};

export function getRevolutPublicConfig(): RevolutPublicConfig | null {
  const iban = (import.meta.env.VITE_REVOLUT_IBAN as string | undefined)?.replace(/\s/g, "").trim();
  if (!iban || iban.length < 8) return null;
  const bic = (import.meta.env.VITE_REVOLUT_BIC as string | undefined)?.replace(/\s/g, "").trim() || null;
  const beneficiary = (import.meta.env.VITE_REVOLUT_BENEFICIARY as string | undefined)?.trim() || null;
  return { iban, bic, beneficiary };
}

export function showRevolutCheckout(): boolean {
  const mode = getShopPaymentMode();
  if (mode === "stripe") return false;
  return getRevolutPublicConfig() != null;
}

export function showStripeCheckout(): boolean {
  const mode = getShopPaymentMode();
  if (mode === "revolut") return false;
  return true;
}

/** PayPal.me потребителско име (без URL) — само за ръчно „Изпрати“ с бележка. */
export function getPaypalMeHandle(): string | null {
  const h = (import.meta.env.VITE_PAYPAL_ME_HANDLE as string | undefined)?.trim();
  if (!h) return null;
  return h.replace(/^https?:\/\/(www\.)?paypal\.me\//i, "").replace(/\/$/, "").split("/")[0] || null;
}

export function showPaypalManualCheckout(): boolean {
  const mode = getShopPaymentMode();
  if (mode === "stripe") return false;
  return getPaypalMeHandle() != null;
}

/** Ръчно плащане (IBAN и/или PayPal.me), когато не е само Stripe режим. */
export function showManualTransferCheckout(): boolean {
  return showRevolutCheckout() || showPaypalManualCheckout();
}
