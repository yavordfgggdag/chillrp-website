import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getTimeLeft(launchDate: Date) {
  const diff = launchDate.getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

export default function AnnouncementBar() {
  const [discordInvite, setDiscordInvite] = useState("https://discord.gg/chillroleplay");
  const [launchDate, setLaunchDate] = useState(new Date("2026-03-20T20:00:00+02:00"));
  const [beforeText, setBeforeText] = useState("⚡ 50% НАМАЛЕНИЕ ПРЕДИ СТАРТА");
  const [liveText, setLiveText] = useState("🟢 СЪРВЪРЪТ Е ПУСНАТ — ВЛЕЗ СЕГА!");
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(new Date("2026-03-20T20:00:00+02:00")));

  useEffect(() => {
    supabase.from("site_settings").select("key, value").then(({ data }) => {
      if (data) {
        data.forEach(s => {
          if (s.key === "discord_invite") setDiscordInvite(s.value);
          if (s.key === "launch_date") setLaunchDate(new Date(s.value));
          if (s.key === "announcement_text_before") setBeforeText(s.value);
          if (s.key === "announcement_text_live") setLiveText(s.value);
        });
      }
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(launchDate)), 1000);
    return () => clearInterval(id);
  }, [launchDate]);

  return (
    <a
      href={discordInvite}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-3 py-2 px-4 glass-strong border-b border-neon-purple/30 text-neon-purple font-heading font-black text-[11px] tracking-widest uppercase cursor-pointer hover:bg-neon-purple/10 transition-colors flex-wrap"
    >
      <span className={`w-2 h-2 rounded-full animate-ping shrink-0 ${timeLeft ? 'bg-neon-purple' : 'bg-green-500'}`} />

      {timeLeft ? (
        <>
          <span className="text-foreground/80">{beforeText}</span>
          <span className="text-neon-purple/40">|</span>
          <span>СКОРО ПУСКАМЕ — ВЛЕЗ В DISCORD</span>
        </>
      ) : (
        <span className="text-foreground/80">{liveText}</span>
      )}

      {timeLeft && (
        <>
          <span className="text-neon-purple/40">|</span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
            <span className="bg-neon-purple/20 border border-neon-purple/40 rounded px-1.5 py-0.5 text-foreground">
              {pad(timeLeft.days)}<span className="text-neon-purple/60 text-[9px] ml-0.5">д</span>
            </span>
            <span className="text-neon-purple/50">:</span>
            <span className="bg-neon-purple/20 border border-neon-purple/40 rounded px-1.5 py-0.5 text-foreground">
              {pad(timeLeft.hours)}<span className="text-neon-purple/60 text-[9px] ml-0.5">ч</span>
            </span>
            <span className="text-neon-purple/50">:</span>
            <span className="bg-neon-purple/20 border border-neon-purple/40 rounded px-1.5 py-0.5 text-foreground">
              {pad(timeLeft.minutes)}<span className="text-neon-purple/60 text-[9px] ml-0.5">м</span>
            </span>
            <span className="text-neon-purple/50">:</span>
            <span className="bg-neon-purple/20 border border-neon-purple/40 rounded px-1.5 py-0.5 text-foreground tabular-nums">
              {pad(timeLeft.seconds)}<span className="text-neon-purple/60 text-[9px] ml-0.5">с</span>
            </span>
          </span>
        </>
      )}

      <ExternalLink size={11} className="shrink-0" />
    </a>
  );
}
