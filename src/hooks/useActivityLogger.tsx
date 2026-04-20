import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isLogActivityEnabled, sendLogActivity } from "@/lib/logActivity";

const PAGE_NAMES: Record<string, string> = {
  "/": "Начало",
  "/shop": "Магазин",
  "/applications": "Кандидатури",
  "/servers": "Сървъри",
  "/modes": "Сървъри",
  "/staff": "Екип",
  "/rules": "Правила — хъб",
  "/rules/discord": "Discord правила",
  "/rules/general": "Общи правила",
  "/rules/chat": "Чат правила",
  "/rules/smp": "SMP правила",
  "/rules/factions": "Factions правила",
  "/rules/anticheat": "Anti-cheat",
  "/rules/punishments": "Наказания",
  "/admin": "Админ панел",
  "/profile": "Профил",
  "/payment-success": "Успешно плащане",
};

// Минимален интервал за еднакви събития (за да не заспамява)
const MIN_INTERVAL_MS = 800;

export function useActivityLogger() {
  const { user } = useAuth();
  const location = useLocation();
  const lastLog = useRef(0);
  const lastPage = useRef("");
  const lastEvent = useRef("");

  const path = location.pathname;
  const module: string | null =
    path.startsWith("/servers") || path.startsWith("/modes") ? "servers" : null;

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
        page: page || path,
        timestamp: new Date().toISOString(),
        module,
      });
    },
    [user, path, module]
  );

  // Track page views
  useEffect(() => {
    const p = location.pathname;
    if (p === lastPage.current) return;
    lastPage.current = p;

    const pageName = PAGE_NAMES[p] || (p.startsWith("/shop/") ? "Продукт" : p.startsWith("/rules/") ? "Правила" : p);

    log("page_view", `Отвори: ${pageName}`, p);
  }, [location.pathname, log]);

  return log;
}
