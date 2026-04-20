function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function siteUrlFromEnv(): string | null {
  const fromEnv = import.meta.env.VITE_SITE_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) return normalizeUrl(fromEnv.trim());
  return null;
}

export function getSiteUrl(): string {
  // PKCE stores the code verifier in localStorage for this origin. redirectTo must use the
  // same origin where signInWithOAuth ran (apex vs www are different storage). Do not remap
  // apex → www here — that caused AuthPKCECodeVerifierMissingError in prod.
  if (typeof window !== "undefined") {
    return normalizeUrl(window.location.origin);
  }

  const fromEnv = siteUrlFromEnv();
  if (fromEnv) return fromEnv;

  if (import.meta.env.DEV) {
    return "http://localhost:8080";
  }

  console.warn(
    "[TLR] VITE_SITE_URL не е зададен. Задай го в .env / Vercel за каноничен URL при билд без window.",
  );
  return "http://localhost:8080";
}

export function getAuthCallbackUrl(): string {
  return `${getSiteUrl()}/auth/callback`;
}

