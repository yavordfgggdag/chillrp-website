import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { defaultHandbookSnapshot } from "@/lib/police-handbook-content";

export type PoliceHandbookSnapshot = typeof defaultHandbookSnapshot;

export function usePoliceHandbook(): {
  data: PoliceHandbookSnapshot;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<PoliceHandbookSnapshot>(defaultHandbookSnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: row, error: e } = await supabase
          .from("police_handbook")
          .select("data")
          .eq("id", "current")
          .single();

        if (cancelled) return;
        if (e) {
          setError(e.message);
          setData(defaultHandbookSnapshot);
          setLoading(false);
          return;
        }
        const raw = row?.data;
        if (raw && typeof raw === "object" && Object.keys(raw).length > 0) {
          setData({ ...defaultHandbookSnapshot, ...raw } as PoliceHandbookSnapshot);
        } else {
          setData(defaultHandbookSnapshot);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setData(defaultHandbookSnapshot);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
