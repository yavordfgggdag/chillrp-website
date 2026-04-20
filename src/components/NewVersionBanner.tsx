import { useEffect, useRef, useState } from "react";

const VERSION_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 минути
const VERSION_URL = "/version.json";

type VersionPayload = { buildTime?: string; version?: string };

function getVersionKey(p: VersionPayload): string {
  return [p.buildTime, p.version].filter(Boolean).join("-") || "unknown";
}

export default function NewVersionBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const initialVersionRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (isLocalhost) return;

    const check = () => {
      fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: VersionPayload | null) => {
          if (!data) return;
          const key = getVersionKey(data);
          if (initialVersionRef.current === null) {
            initialVersionRef.current = key;
            return;
          }
          if (key !== initialVersionRef.current) setShowBanner(true);
        })
        .catch(() => {});
    };

    check();
    intervalRef.current = setInterval(check, VERSION_CHECK_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 bg-primary/95 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg"
      role="alert"
    >
      <span>Има нова версия на сайта. Презареди страницата за да видиш последните промени.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded bg-white/20 px-3 py-1 font-semibold hover:bg-white/30 transition-colors"
      >
        Презареди
      </button>
    </div>
  );
}
