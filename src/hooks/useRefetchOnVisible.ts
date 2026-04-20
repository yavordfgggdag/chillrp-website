import { useEffect, useRef } from "react";

export type RefetchOnVisibleOptions = {
  /** Колко да чакаме след събитието преди да викаме callback (слива burst от няколко събития). */
  debounceMs?: number;
  /** Минимум време между две изпълнения — предотвратява 429 от Supabase/Edge при често alt-tab. */
  minIntervalMs?: number;
  /**
   * Ако е true, слуша и window focus (шумно; дублира visibility при връщане към таба).
   * По подразбиране само document.visibilitychange → visible.
   */
  includeWindowFocus?: boolean;
};

/**
 * Извиква callback при връщане към раздела (visibility). По подразбиране без window focus,
 * с debounce и min interval, за да не се трупат стотици заявки към Supabase.
 */
export function useRefetchOnVisible(
  callback: () => void,
  enabled = true,
  options: RefetchOnVisibleOptions = {}
) {
  const { debounceMs = 550, minIntervalMs = 45_000, includeWindowFocus = false } = options;
  const cb = useRef(callback);
  cb.current = callback;
  const lastRunRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const runIfAllowed = () => {
      const now = Date.now();
      if (now - lastRunRef.current < minIntervalMs) return;
      lastRunRef.current = now;
      cb.current();
    };

    const schedule = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        runIfAllowed();
      }, debounceMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") schedule();
    };

    document.addEventListener("visibilitychange", onVisibility);

    const onFocus = () => schedule();
    if (includeWindowFocus) {
      window.addEventListener("focus", onFocus);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (includeWindowFocus) {
        window.removeEventListener("focus", onFocus);
      }
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [enabled, debounceMs, minIntervalMs, includeWindowFocus]);
}
