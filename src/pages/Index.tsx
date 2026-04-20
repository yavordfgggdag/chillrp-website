import { useState, useEffect, useMemo } from "react";
import tlrBanner from "@/assets/tlr-banner.png";
import mcBundled from "@/assets/tlr-mc-logo.png";
import { Link } from "react-router-dom";
import {
  Users,
  Shield,
  Pickaxe,
  Copy,
  Gamepad2,
  ShoppingBag,
  MessageCircle,
  ChevronRight,
  Server,
  Sparkles,
  BookOpen,
  ThumbsUp,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DISCORD_INVITE,
  SITE_NAME,
  MINECRAFT_SERVER_ADDRESS,
  MINECRAFT_VERSION,
} from "@/lib/config";
import { collectSneakPeekEmbedUrls } from "@/lib/homeSneakPeekVideos";

const trustPills = [
  "SMP + Factions",
  "Ясни правила",
  "Активна общност",
  "Discord hub",
  "Магазин в сайта",
  "Premium опит",
];

const features = [
  { title: "SMP и Factions", desc: "Два свята на един сървър — общност и конкурентни фракции.", icon: Gamepad2 },
  { title: "Стабилен хост", desc: "Оптимизиран сървър и екип, който поддържа играта честна.", icon: Server },
  { title: "Икономика и прогрес", desc: "Награди за активност, евенти и смислена прогресия.", icon: Sparkles },
  { title: "Сигурност", desc: "Anti-cheat политика и бързи реакции при нарушения.", icon: Shield },
];

type LeaderboardRow = {
  id: string;
  board_type: string;
  rank: number;
  minecraft_username: string;
  value_text: string;
};

export default function Index() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [topVoters, setTopVoters] = useState<LeaderboardRow[]>([]);
  const [topSupporters, setTopSupporters] = useState<LeaderboardRow[]>([]);
  const [mcOnline, setMcOnline] = useState<boolean | null>(null);
  const [mcPlayers, setMcPlayers] = useState<{ current: number; max: number } | null>(null);

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select("key, value")
      .then(({ data, error }) => {
        if (error || !data) return;
        const map: Record<string, string> = {};
        data.forEach((row) => {
          map[row.key] = row.value;
        });
        setSettings(map);
      })
      .catch(() => {
        /* Supabase не е конфигуриран или мрежата е недостъпна — ползваме fallback от config */
      });
  }, []);

  useEffect(() => {
    void Promise.all([
      supabase
        .from("mc_leaderboard_entries")
        .select("id,board_type,rank,minecraft_username,value_text")
        .eq("board_type", "voter")
        .order("rank", { ascending: true })
        .limit(5),
      supabase
        .from("mc_leaderboard_entries")
        .select("id,board_type,rank,minecraft_username,value_text")
        .eq("board_type", "supporter")
        .order("rank", { ascending: true })
        .limit(5),
      supabase.from("mc_server_status").select("is_online,players_current,players_max").eq("id", 1).maybeSingle(),
    ]).then(([v, s, st]) => {
      if (v.data) setTopVoters(v.data as LeaderboardRow[]);
      if (s.data) setTopSupporters(s.data as LeaderboardRow[]);
      const row = st.data as { is_online?: boolean; players_current?: number; players_max?: number } | null;
      if (row) {
        setMcOnline(!!row.is_online);
        setMcPlayers({ current: row.players_current ?? 0, max: row.players_max ?? 0 });
      }
    });
  }, []);

  const s = (key: string, fallback: string) => settings[key] || fallback;
  const discordLink = s("discord_invite", DISCORD_INVITE);
  const serverIp = s("minecraft_server_address", MINECRAFT_SERVER_ADDRESS);
  const mcVersion = s("minecraft_version", MINECRAFT_VERSION);
  const logoUrl = s("site_logo_url", "").trim() || mcBundled;
  const bannerUrl = s("site_banner_url", "") || tlrBanner;

  const sneakPeekEmbeds = useMemo(
    () => collectSneakPeekEmbedUrls(settings.sneak_peek_urls ?? ""),
    [settings]
  );

  const copyIp = () => {
    void navigator.clipboard.writeText(serverIp);
    toast.success("IP адресът е копиран.");
  };

  /** Отстъп под фиксирания header (AnnouncementBar + Navbar ~h-16). Без това hero се забива под лентата. */
  const heroTopPad =
    "pt-[max(8.25rem,calc(6.5rem+env(safe-area-inset-top,0px)))] sm:pt-[max(7.75rem,calc(6.25rem+env(safe-area-inset-top,0px)))]";

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <section
        id="join"
        className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden scroll-mt-32 ${heroTopPad} pb-14 sm:pb-16`}
      >
        <div
          className="absolute inset-0 bg-cover bg-[center_top] md:bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bannerUrl})` }}
        />
        <div className="absolute inset-0 hero-banner-overlay" />
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 scanlines opacity-30" />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center pb-4 md:pb-6">
          <div className="w-full rounded-[2rem] border border-primary/20 bg-background/40 backdrop-blur-md px-5 py-8 md:px-10 md:py-10 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)_inset]">
          <img
            src={logoUrl}
            alt={SITE_NAME}
            className="h-32 sm:h-40 md:h-48 w-auto mx-auto mb-6 md:mb-8 logo-neon-bloom-lg animate-float"
            onError={(e) => {
              if (logoUrl && (e.currentTarget as HTMLImageElement).src !== mcBundled) {
                (e.currentTarget as HTMLImageElement).src = mcBundled;
              }
            }}
          />

          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-heading font-black tracking-wide uppercase leading-[1.08] mb-4">
            <span className="text-foreground">{s("hero_title_1", "Minecraft")} </span>
            <span className="gradient-text">{s("hero_title_2", "общност")}</span>
            <br />
            <span className="text-foreground">{s("hero_title_3", "SMP и")} </span>
            <span className="text-primary text-glow-accent">{s("hero_title_4", "Factions")}</span>
          </h1>

          <p className="text-base md:text-lg text-foreground/70 font-body max-w-2xl mx-auto mb-6 leading-relaxed">
            {s(
              "hero_subtitle",
              "Сериозен сървър за играчи, които искат чист геймплей, ясни правила и силна общност.",
            )}
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {trustPills.map((p) => (
              <span
                key={p}
                className="px-3 py-1 rounded-full border border-white/10 bg-black/30 text-[11px] font-heading font-bold tracking-wider uppercase text-muted-foreground"
              >
                {p}
              </span>
            ))}
          </div>

          {/* IP + version */}
          <div className="w-full max-w-lg glass border border-primary/30 rounded-2xl p-4 mb-8 text-left mx-auto">
            <div className="text-[10px] font-heading font-black tracking-widest uppercase text-primary mb-2">
              IP адрес (Java)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 min-w-0 font-mono text-sm text-foreground bg-black/40 border border-white/10 rounded-lg px-3 py-2 truncate">
                {serverIp}
              </code>
              <button
                type="button"
                onClick={copyIp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/50 bg-primary/15 text-primary font-heading font-bold text-xs tracking-widest uppercase hover:bg-primary/25 transition-colors"
              >
                <Copy size={14} /> Копирай
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground font-body">
              Версия: <span className="text-foreground/90 font-mono">{mcVersion}</span> · Онлайн играчи и статус — в Discord.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center w-full max-w-2xl">
            <button
              type="button"
              onClick={copyIp}
              className="px-8 py-4 rounded-xl border border-primary/60 bg-primary/20 text-foreground font-heading font-black tracking-widest uppercase text-sm hover:bg-primary/32 glow-accent transition-all inline-flex items-center justify-center gap-2 min-h-[3rem]"
            >
              <Pickaxe size={18} /> Влез в сървъра
            </button>
            <a
              href={discordLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-xl glass border border-white/12 text-foreground font-heading font-semibold tracking-widest uppercase text-sm hover:border-primary/35 hover:text-primary transition-all inline-flex items-center justify-center gap-2 min-h-[3rem]"
            >
              <MessageCircle size={18} /> Discord
            </a>
            <Link
              to="/shop"
              className="px-8 py-4 rounded-xl glass border border-white/12 text-foreground/80 font-heading font-semibold tracking-widest uppercase text-sm hover:border-primary/35 hover:text-primary transition-all inline-flex items-center justify-center gap-2 min-h-[3rem]"
            >
              <ShoppingBag size={18} /> Магазин
            </Link>
            <Link
              to="/vote"
              className="px-8 py-4 rounded-xl glass border border-white/12 text-foreground/80 font-heading font-semibold tracking-widest uppercase text-sm hover:border-primary/35 hover:text-primary transition-all inline-flex items-center justify-center gap-2 min-h-[3rem]"
            >
              <ThumbsUp size={18} /> Гласувай
            </Link>
          </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-25 animate-bounce">
          <div className="w-0.5 h-10 bg-gradient-to-b from-primary/60 to-transparent" />
        </div>
      </section>

      {/* STATUS + LEADERBOARDS */}
      <section className="py-16 px-4 border-t border-white/5 bg-background/80">
        <div className="container mx-auto max-w-5xl">
          <div className="sep-accent mb-8" />
          <h2 className="text-2xl md:text-4xl font-heading font-black tracking-widest uppercase text-center mb-10">
            <span className="text-foreground">Статус </span>
            <span className="text-primary text-glow-accent">и топове</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="glass border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-[10px] font-heading font-black tracking-widest uppercase text-muted-foreground mb-3">
                <Server size={14} className="text-primary" /> Сървър
              </div>
              {mcOnline != null && mcPlayers ? (
                <>
                  <div className={`text-sm font-heading font-black uppercase ${mcOnline ? "text-neon-green" : "text-destructive"}`}>
                    {mcOnline ? "● Онлайн" : "○ Офлайн"}
                  </div>
                  <p className="text-xs text-muted-foreground font-body mt-2">
                    Играчи (примерно от екипа): {mcPlayers.current} / {mcPlayers.max}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground font-body">Няма записан статус — виж Discord за live информация.</p>
              )}
            </div>
            <div className="glass border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-[10px] font-heading font-black tracking-widest uppercase text-muted-foreground mb-3">
                <Trophy size={14} className="text-neon-yellow" /> Топ гласували
              </div>
              {topVoters.length === 0 ? (
                <p className="text-xs text-muted-foreground font-body">Очаквай обновление от екипа.</p>
              ) : (
                <ul className="space-y-2">
                  {topVoters.map((r) => (
                    <li key={r.id} className="flex justify-between gap-2 text-xs font-body text-foreground/90">
                      <span className="font-mono truncate">
                        #{r.rank} {r.minecraft_username}
                      </span>
                      <span className="text-primary shrink-0">{r.value_text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="glass border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-[10px] font-heading font-black tracking-widest uppercase text-muted-foreground mb-3">
                <Users size={14} className="text-neon-cyan" /> Топ подкрепа
              </div>
              {topSupporters.length === 0 ? (
                <p className="text-xs text-muted-foreground font-body">Очаквай обновление от екипа.</p>
              ) : (
                <ul className="space-y-2">
                  {topSupporters.map((r) => (
                    <li key={r.id} className="flex justify-between gap-2 text-xs font-body text-foreground/90">
                      <span className="font-mono truncate">
                        #{r.rank} {r.minecraft_username}
                      </span>
                      <span className="text-neon-cyan shrink-0">{r.value_text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MODES */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="container mx-auto max-w-5xl">
          <div className="sep-accent mb-10" />
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl md:text-5xl font-heading font-black tracking-wider uppercase text-foreground mb-2">
                Сървъри
              </h2>
              <p className="text-muted-foreground font-body text-sm max-w-md">
                Избери стила си — спокоен SMP свят или PvP фокус във Factions.
              </p>
            </div>
            <Link
              to="/servers"
              className="inline-flex items-center gap-2 text-primary font-heading font-bold text-xs tracking-widest uppercase hover:underline shrink-0"
            >
              Виж детайли <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              to="/servers"
              className="glass border border-emerald-500/20 rounded-2xl p-6 hover:border-primary/35 transition-colors text-left block group"
            >
              <div className="text-primary font-heading font-black text-xl tracking-widest uppercase mb-2 flex items-center justify-between gap-2">
                SMP
                <ChevronRight size={18} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                Общност, бази, икономика и евенти — подреден сървър с premium усещане.
              </p>
            </Link>
            <Link
              to="/servers"
              className="glass border border-primary/25 rounded-2xl p-6 hover:border-primary/40 transition-colors text-left block group"
            >
              <div className="text-primary font-heading font-black text-xl tracking-widest uppercase mb-2 flex items-center justify-between gap-2">
                Factions
                <ChevronRight size={18} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                Рейдове, територии, отборна стратегия и конкуренция при ясни правила.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(160_84%_39%/0.06)_0%,transparent_65%)]" />
        <div className="container mx-auto max-w-5xl relative">
          <div className="sep-accent mb-12" />
          <h2 className="text-3xl md:text-5xl font-heading font-black tracking-wider uppercase text-center mb-12">
            <span className="text-foreground">Защо </span>
            <span className="text-primary text-glow-accent">{SITE_NAME}</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map(({ title, desc, icon: Icon }) => (
              <div
                key={title}
                className="glass border border-white/8 rounded-xl p-5 flex gap-4 items-start hover:border-primary/25 transition-colors"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/12 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-bold tracking-wide uppercase text-sm text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {sneakPeekEmbeds.length > 0 && (
        <section className="py-16 px-4 border-t border-white/5">
          <div className="container mx-auto max-w-5xl">
            <div className="sep-accent mb-8" />
            <h2 className="text-2xl font-heading font-black tracking-widest uppercase text-center mb-8">Клипове</h2>
            <div className={`grid gap-6 ${sneakPeekEmbeds.length > 1 ? "md:grid-cols-2" : "max-w-3xl mx-auto"}`}>
              {sneakPeekEmbeds.map((embedUrl, i) => (
                <div key={embedUrl} className="relative aspect-video rounded-2xl overflow-hidden border border-primary/25 glass">
                  <iframe
                    title={`Clip ${i + 1}`}
                    src={`${embedUrl}${embedUrl.includes("?") ? "&" : "?"}rel=0`}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STORE + RULES */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="container mx-auto max-w-5xl grid sm:grid-cols-2 gap-6">
          <div className="glass border border-white/10 rounded-2xl p-7 flex flex-col">
            <ShoppingBag className="text-primary mb-4" size={28} />
            <h2 className="text-xl font-heading font-black tracking-widest uppercase mb-3">Магазин</h2>
            <p className="text-sm text-muted-foreground font-body mb-6 leading-relaxed flex-1">
              Рангове, ключове и пакети — подкрепи сървъра без токсичен pay-to-win.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/50 bg-primary/12 text-primary font-heading font-bold text-xs tracking-widest uppercase hover:bg-primary/20 w-fit"
            >
              Към магазина <ChevronRight size={14} />
            </Link>
          </div>
          <div className="glass border border-white/10 rounded-2xl p-7 flex flex-col">
            <BookOpen className="text-primary mb-4" size={28} />
            <h2 className="text-xl font-heading font-black tracking-widest uppercase mb-3">Правила</h2>
            <p className="text-sm text-muted-foreground font-body mb-6 leading-relaxed flex-1">
              SMP, Factions, чат, Discord и anti-cheat — прочети преди да влезеш.
            </p>
            <Link
              to="/rules"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/12 text-foreground font-heading font-bold text-xs tracking-widest uppercase hover:border-primary/35 hover:text-primary w-fit"
            >
              Към правилата <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-4 relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(160_84%_39%/0.12)_0%,transparent_60%)]" />
        <div className="container mx-auto max-w-3xl relative text-center">
          <div className="sep-accent mb-10" />
          <h2 className="text-4xl md:text-5xl font-heading font-black tracking-wide uppercase text-foreground mb-4">
            Готов ли си за <span className="text-primary text-glow-accent">свят</span>?
          </h2>
          <p className="text-muted-foreground font-body mb-8 max-w-md mx-auto">
            Копирай IP, влез в Minecraft и хвани роля в Discord — там са новините и логистика на общността.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={copyIp}
              className="px-10 py-4 rounded-xl border border-primary/55 bg-primary/18 text-foreground font-heading font-black tracking-widest uppercase hover:bg-primary/28 glow-accent transition-all"
            >
              Копирай IP
            </button>
            <a
              href={discordLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-4 rounded-xl glass border border-white/12 font-heading font-bold tracking-widest uppercase text-sm hover:border-primary/35"
            >
              Discord
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
