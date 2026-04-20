import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Branding = {
  logoUrl?: string;
  bannerUrl?: string;
};

const CACHE_KEY = "chillrp_branding_cache_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

function readCache(): Branding | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: Branding };
    if (!parsed?.ts || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data || null;
  } catch {
    return null;
  }
}

function writeCache(data: Branding) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore
  }
}

export function useBranding(): Branding {
  const [branding, setBranding] = useState<Branding>(() => readCache() ?? {});

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setBranding(cached);
      return;
    }

    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["site_logo_url", "site_banner_url"])
      .then(({ data }) => {
        const out: Branding = {};
        for (const row of (data ?? []) as { key: string; value: string }[]) {
          if (row.key === "site_logo_url" && row.value) out.logoUrl = row.value;
          if (row.key === "site_banner_url" && row.value) out.bannerUrl = row.value;
        }
        writeCache(out);
        setBranding(out);
      });
  }, []);

  return branding;
}

