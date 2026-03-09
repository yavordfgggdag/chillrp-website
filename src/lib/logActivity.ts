let logActivityDisabled = false;
let logActivityInFlight = false;

export function disableLogActivity() {
  logActivityDisabled = true;
}

export function isLogActivityEnabled() {
  return !logActivityDisabled;
}

/** Един извиквател към log-activity; след първа грешка (напр. CORS) спира всички следващи заявки. На localhost не се извиква, за да няма CORS грешки в конзолата. */
export function sendLogActivity(body: Record<string, unknown>): void {
  if (logActivityDisabled || logActivityInFlight) return;
  if (typeof window !== "undefined" && (window.location.origin === "http://localhost:8080" || window.location.origin === "http://localhost:5173" || window.location.hostname === "localhost")) return;
  logActivityInFlight = true;
  import("@/integrations/supabase/client").then(({ supabase }) =>
    supabase.functions.invoke("log-activity", { body }).catch(() => { logActivityDisabled = true; }).finally(() => { logActivityInFlight = false; })
  );
}
