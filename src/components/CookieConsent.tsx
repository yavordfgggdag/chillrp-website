import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "chillrp_cookie_consent";
export type ConsentStatus = "accepted" | "rejected" | null;

export function getCookieConsent(): ConsentStatus {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "accepted" || raw === "rejected") return raw;
  return null;
}

export function setCookieConsent(value: "accepted" | "rejected") {
  localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: value }));
}

export default function CookieConsent() {
  const [status, setStatus] = useState<ConsentStatus>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStatus(getCookieConsent());
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = () => setStatus(getCookieConsent());
    window.addEventListener("cookie-consent-change", handler);
    return () => window.removeEventListener("cookie-consent-change", handler);
  }, []);

  const accept = () => {
    setCookieConsent("accepted");
    setStatus("accepted");
  };

  const reject = () => {
    setCookieConsent("rejected");
    setStatus("rejected");
  };

  if (!mounted || status !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Съгласие за бисквитки"
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-5 glass-strong border-t border-white/10 shadow-2xl animate-fade-in"
    >
      <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="rounded-lg bg-neon-purple/15 p-2 shrink-0">
            <Cookie className="h-5 w-5 text-neon-purple" aria-hidden />
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground tracking-wide mb-1">
              Използваме бисквитки
            </h3>
            <p className="text-sm text-muted-foreground font-body">
              За да работи сайтът правилно и за анализиране на трафика използваме бисквитки в съответствие с Регламент (ЕС) 2016/679 (GDPR) и ePrivacy. Можете да приемате всички или да отхвърлите неизправните за съгласие.{" "}
              <Link to="/cookies" className="text-neon-purple hover:underline font-semibold">
                Политика за бисквитки
              </Link>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-muted-foreground hover:text-foreground"
            onClick={reject}
          >
            Отхвърли неизправни
          </Button>
          <Button
            size="sm"
            className="bg-neon-purple hover:bg-neon-purple/90 text-white glow-purple"
            onClick={accept}
          >
            Приемам всички
          </Button>
        </div>
      </div>
    </div>
  );
}
