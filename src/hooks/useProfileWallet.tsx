import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LS_IGN = "tlr_mc_shop_ign";

export function useProfileWallet() {
  const { user } = useAuth();
  const [shopBalanceCents, setShopBalanceCents] = useState<number | null>(null);
  const [minecraftUsername, setMinecraftUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setShopBalanceCents(null);
      setMinecraftUsername(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("shop_balance_cents, minecraft_username")
      .eq("id", user.id)
      .maybeSingle();
    setLoading(false);
    if (error || !data) {
      setShopBalanceCents(0);
      setMinecraftUsername(null);
      return;
    }
    const row = data as { shop_balance_cents?: number | null; minecraft_username?: string | null };
    setShopBalanceCents(typeof row.shop_balance_cents === "number" ? row.shop_balance_cents : 0);
    const ign = row.minecraft_username?.trim() || null;
    setMinecraftUsername(ign);
    if (ign) {
      try {
        localStorage.setItem(LS_IGN, ign);
      } catch {
        /* ignore */
      }
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    shopBalanceCents,
    minecraftUsername,
    loading,
    refresh,
    localStorageIgnKey: LS_IGN,
  };
}

export function formatBalanceEur(cents: number | null): string {
  if (cents == null || !Number.isFinite(cents)) return "—";
  return `€${(cents / 100).toFixed(2)}`;
}
