import { useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DISCORD_INVITE, MINECRAFT_SERVER_ADDRESS } from "@/lib/config";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getTimeLeft(launchDate: Date) {
  const t = launchDate.getTime();
  if (!Number.isFinite(t)) return null;
  const diff = t - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

export default function AnnouncementBar() {
  const [serverIp, setServerIp] = useState(MINECRAFT_SERVER_ADDRESS);
  const [launchDate, setLaunchDate] = useState(new Date("2026-03-27T20:00:00+02:00"));
  const [beforeText, setBeforeText] = useState("Скоро отваряне — следи Discord");
  const [liveText, setLiveText] = useState("🟢 Онлайн — копирай IP и влез в Minecraft");
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(new Date("2026-03-27T20:00:00+02:00")));

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select("key, value")
      .then(({ data, error }) => {
        if (error || !data) return;
        data.forEach((s) => {
          if (s.key === "minecraft_server_address" && s.value?.trim()) setServerIp(s.value.trim());
          if (s.key === "launch_date" && s.value?.trim()) {
            const d = new Date(s.value.trim());
            if (Number.isFinite(d.getTime())) setLaunchDate(d);
          }
          if (s.key === "announcement_text_before") setBeforeText(s.value);
          if (s.key === "announcement_text_live") setLiveText(s.value);
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(launchDate)), 1000);
    return () => clearInterval(id);
  }, [launchDate]);

  const copyIp = (e: React.MouseEvent) => {
    e.preventDefault();
    void navigator.clipboard.writeText(serverIp);
    toast.success("IP адресът е копиран в клипборда.");
  };

  return (
    <div className="relative z-10 flex w-full flex-wrap items-center justify-center gap-3 py-2 px-4 glass-strong border-b border-primary/25 bg-gradient-to-r from-primary/[0.08] via-emerald-950/40 to-primary/[0.08] text-[11px] font-heading font-black tracking-widest uppercase">
      <button
        type="button"
        onClick={copyIp}
        className="inline-flex items-center gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 py-1 text-primary hover:bg-primary/18 transition-colors cursor-pointer"
        title="Копирай IP"
      >
        <Copy size={11} className="shrink-0" />
        <span className="font-mono text-foreground/90 normal-case tracking-normal">{serverIp}</span>
      </button>

      <span className="text-primary/40 hidden sm:inline">|</span>

      <span className={`inline-flex h-2 w-2 shrink-0 rounded-full ${timeLeft ? "animate-ping bg-primary" : "bg-neon-green"}`} />

      {timeLeft ? (
        <>
          <span className="text-foreground/80">{beforeText}</span>
          <span className="text-primary/40">|</span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground/90">
            <span className="rounded border border-primary/40 bg-primary/15 px-1.5 py-0.5">
              {pad(timeLeft.days)}
              <span className="ml-0.5 text-[9px] text-primary/60">д</span>
            </span>
            <span className="text-primary/50">:</span>
            <span className="rounded border border-primary/40 bg-primary/15 px-1.5 py-0.5">
              {pad(timeLeft.hours)}
              <span className="ml-0.5 text-[9px] text-primary/60">ч</span>
            </span>
            <span className="text-primary/50">:</span>
            <span className="rounded border border-primary/40 bg-primary/15 px-1.5 py-0.5">
              {pad(timeLeft.minutes)}
              <span className="ml-0.5 text-[9px] text-primary/60">м</span>
            </span>
            <span className="text-primary/50">:</span>
            <span className="tabular-nums rounded border border-primary/40 bg-primary/15 px-1.5 py-0.5">
              {pad(timeLeft.seconds)}
              <span className="ml-0.5 text-[9px] text-primary/60">с</span>
            </span>
          </span>
        </>
      ) : (
        <span className="text-foreground/80">{liveText}</span>
      )}

      <a
        href={DISCORD_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary/90 hover:text-primary"
      >
        Discord
        <ExternalLink size={11} />
      </a>
    </div>
  );
}
