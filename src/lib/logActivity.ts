let logActivityDisabled = false;
let logActivityInFlight = false;

export function disableLogActivity() {
  logActivityDisabled = true;
}

export function isLogActivityEnabled() {
  return !logActivityDisabled;
}

import { supabase } from "@/integrations/supabase/client";

const isLocalhost = (): boolean => {
  if (typeof window === "undefined") return false;
  const o = window.location.origin;
  return window.location.hostname === "localhost" || o === "http://localhost:8080" || o === "http://localhost:5173" || o === "http://localhost:8081";
};

/** Дали да изпращаме активност и от localhost (за тест преди пускане). Задай VITE_LOG_ACTIVITY_DEV=true в .env. */
function isDevLoggingEnabled(): boolean {
  return import.meta.env.VITE_LOG_ACTIVITY_DEV === "true" || import.meta.env.VITE_LOG_ACTIVITY_DEV === true;
}

/** Извиква log-activity Edge Function: запис в web_logs + изпращане в Discord (ако в Supabase Secrets е зададен DISCORD_ACTIVITY_LOG_WEBHOOK_URL).
 * На localhost по подразбиране не се извиква; задай VITE_LOG_ACTIVITY_DEV=true за тест преди пускане. След първа грешка спира всички следващи заявки. */
export function sendLogActivity(body: Record<string, unknown>): void {
  if (logActivityDisabled || logActivityInFlight) return;
  if (typeof window !== "undefined" && isLocalhost() && !isDevLoggingEnabled()) return;
  logActivityInFlight = true;
  supabase.functions.invoke("log-activity", { body }).catch(() => { logActivityDisabled = true; }).finally(() => { logActivityInFlight = false; });
}
