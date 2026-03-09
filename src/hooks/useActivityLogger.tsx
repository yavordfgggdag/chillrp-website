import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isLogActivityEnabled, sendLogActivity } from "@/lib/logActivity";

const PAGE_NAMES: Record<string, string> = {
  "/": "Начало",
  "/shop": "Магазин",
  "/gangs": "Генг кандидатури",
  "/rules/discord": "Discord правила",
  "/rules/server": "Сървър правила",
  "/rules/crime": "Crime правила",
  "/faq": "FAQ",
  "/admin": "Админ панел",
  "/profile": "Профил",
  "/payment-success": "Успешно плащане",
};

// Lower interval for maximum logging
const MIN_INTERVAL_MS = 1500;

export function useActivityLogger() {
  const { user } = useAuth();
  const location = useLocation();
  const lastLog = useRef(0);
  const lastPage = useRef("");
  const lastEvent = useRef("");

  const log = useCallback(
    (event: string, details?: string, page?: string) => {
      if (!isLogActivityEnabled()) return;
      const now = Date.now();
      const eventKey = `${event}:${details}`;
      if (eventKey === lastEvent.current && now - lastLog.current < MIN_INTERVAL_MS) return;
      lastLog.current = now;
      lastEvent.current = eventKey;

      sendLogActivity({
        event,
        details: details || "",
        user_email: user?.email || null,
        user_id: user?.id || null,
        page: page || location.pathname,
        timestamp: new Date().toISOString(),
      });
    },
    [user, location.pathname]
  );

  // Track page views
  useEffect(() => {
    const path = location.pathname;
    if (path === lastPage.current) return;
    lastPage.current = path;

    const pageName =
      PAGE_NAMES[path] ||
      (path.startsWith("/shop/") ? "Продукт" : path);

    log("page_view", `Отвори: ${pageName}`, path);
  }, [location.pathname, log]);

  return log;
}
