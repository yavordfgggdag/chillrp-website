import { useState, useEffect, useMemo } from "react";
import chillrpBanner from "@/assets/chillrp-banner.png";
import chillrpLogo from "@/assets/chillrp-logo.png";
import { Link } from "react-router-dom";
import { Users, ChevronRight, Zap, ShoppingBag, Shield, ShoppingCart } from "lucide-react";
import StaffSection from "@/components/StaffSection";
import { supabase } from "@/integrations/supabase/client";

import { DISCORD_INVITE } from "@/lib/config";

const trustPills = [
  "🛡️ Ясни правила",
  "🎭 Качествен RP",
  "🤝 Активен стаф",
  "🏙️ Жив свят",
  "💰 Реалистична икономика",
  "🔫 Crime RP",
];

const journeySteps = [
  {
    n: "01",
    title: "Влизаш без нищо",
    desc: "Нов персонаж, нова история. Нулата е началото на всичко.",
    color: "text-foreground/60",
  },
  {
    n: "02",
    title: "Избираш пътя си",
    desc: "Закон или улица. Власт или сянка. Всяко решение формира съдбата ти.",
    color: "text-neon-purple",
  },
  {
    n: "03",
    title: "Изграждаш репутация",
    desc: "В ChillRP думата е закон. Действията ти те определят.",
    color: "text-foreground/80",
  },
  {
    n: "04",
    title: "Ставаш легенда",
    desc: "Малцина оставят следа. Ще бъдеш ли един от тях?",
    color: "text-neon-white",
  },
];

const gangTypes = [
  {
    name: "Ballas",
    emoji: "🟣",
    color: "text-neon-purple",
    bg: "border-neon-purple/30 bg-[hsl(271_76%_65%/0.07)]",
    desc: "Street",
  },
  {
    name: "Vagos",
    emoji: "🟡",
    color: "text-neon-yellow",
    bg: "border-neon-yellow/30 bg-[hsl(45_90%_55%/0.07)]",
    desc: "Street",
  },
  {
    name: "The Families",
    emoji: "🟢",
    color: "text-neon-green",
    bg: "border-neon-green/30 bg-[hsl(145_70%_48%/0.07)]",
    desc: "Grove",
  },
  {
    name: "Marabunta Grande",
    emoji: "🔵",
    color: "text-neon-cyan",
    bg: "border-neon-cyan/30 bg-[hsl(182_80%_55%/0.07)]",
    desc: "Street",
  },
  { name: "The Lost MC", emoji: "⚫", color: "text-muted-foreground", bg: "border-border bg-muted/20", desc: "Biker" },
];

const shopItems = [
  { emoji: "⚡", name: "VIP DONOR", desc: "Приоритетен слот, 100 000$ и много други,", badge: "ПОПУЛЯРЕН" },
  { emoji: "🎨", name: "Custom номера", desc: "Уникален номер за автомобил", badge: null },
  { emoji: "🏠", name: "Имот", desc: "Цяла вила за теб и тойте приятели", badge: null },
  { emoji: "💎", name: "Custom Cars", desc: "Подкрепи развитието на сървъра и получи ексклузивни коли", badge: "ТОП" },
];

export default function Index() {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("site_settings").select("key, value").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((s) => { map[s.key] = s.value; });
        setSettings(map);
      }
    });
  }, []);

  const s = (key: string, fallback: string) => settings[key] || fallback;
  const discordLink = s("discord_invite", DISCORD_INVITE);

  return (
    <div className="min-h-screen bg-background">
      {/* ══════════════════════════════ HERO ══════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${chillrpBanner})` }}
        />
        <div className="absolute inset-0 bg-background/62" />
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 scanlines" />
        {/* Purple ambient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,hsl(271_76%_53%/0.12)_0%,transparent_60%)]" />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
          <img
            src={chillrpLogo}
            alt="ChillRP"
            className="h-52 md:h-72 w-auto mx-auto mb-12 mt-24 drop-shadow-[0_0_60px_rgba(160,100,255,0.55)] animate-float"
          />

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-black tracking-wide uppercase leading-tight mb-6">
            <span className="text-foreground">{s("hero_title_1", "Не е просто")} </span>
            <span className="gradient-text">{s("hero_title_2", "игра.")}</span>
            <br />
            <span className="text-foreground">{s("hero_title_3", "Това е")} </span>
            <span className="text-neon-purple text-glow-purple">{s("hero_title_4", "живот.")}</span>
          </h1>

          <p className="text-base md:text-lg text-foreground/65 font-body max-w-2xl mx-auto mb-2 leading-relaxed">
            {s("hero_subtitle", "Сървър създаден от 0 лата — скриптове, каквито не сте виждали никъде другаде.")}
          </p>
          <p className="text-foreground/40 font-body text-sm mb-10">
            {s("hero_sub_text", "Влез сега → получи роля → бъди на стартовата линия.")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={discordLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-9 py-4 rounded-xl border border-neon-purple/60 bg-[hsl(271_76%_53%/0.18)] text-foreground font-heading font-black tracking-widest uppercase text-base hover:bg-[hsl(271_76%_53%/0.3)] glow-purple transition-all"
            >
              {s("hero_cta_text", "🎮 Влез в Discord сега")}
            </a>
            <Link
              to="/rules/server"
              className="px-9 py-4 rounded-xl glass border border-white/10 text-foreground/60 font-heading font-semibold tracking-widest uppercase text-base hover:border-white/25 hover:text-foreground/80 transition-all"
            >
              Прочети правилата
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 animate-bounce">
          <div className="w-0.5 h-10 bg-gradient-to-b from-white/60 to-transparent" />
        </div>
      </section>

      {/* ══════════════════════════════ STORY SECTION ══════════════════════════════ */}
      <section className="py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_50%,hsl(271_76%_53%/0.05)_0%,transparent_60%)]" />
        <div className="container mx-auto max-w-4xl relative">
          <div className="sep-purple mb-16" />
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neon-purple/30 bg-[hsl(271_76%_53%/0.1)] text-neon-purple text-xs font-heading font-bold tracking-widest uppercase mb-6">
                ✦ Твоята история
              </div>
              <h2 className="text-4xl md:text-5xl font-heading font-black tracking-wider uppercase text-foreground leading-tight mb-6">
                {s("story_title_1", "Всеки влиза")}
                <br />
                <span className="gradient-text-purple">{s("story_title_2", "като нищо.")}</span>
                <br />
                {s("story_title_3", "Малцина")}
                <br />
                <span className="text-foreground text-glow-white">{s("story_title_4", "стават легенди.")}</span>
              </h2>
              <p className="text-muted-foreground font-body leading-loose mb-4">
                {s("story_desc_1", "В ChillRP не се раждаш с власт. Изграждаш я. Чрез решения, съюзи и истории, които другите помнят.")}
              </p>
              <p className="text-muted-foreground font-body leading-loose">
                {s("story_desc_2", "Всеки разговор има смисъл. Всяка сделка може да те издигне или унищожи.")}
              </p>
            </div>
            <div className="space-y-3">
              {journeySteps.map((step) => (
                <div
                  key={step.n}
                  className="glass border border-white/6 rounded-xl p-4 flex gap-4 items-start group hover:border-neon-purple/30 transition-all"
                >
                  <div className={`text-2xl font-heading font-black ${step.color} shrink-0 w-10`}>{step.n}</div>
                  <div>
                    <div className="font-heading font-bold tracking-wider uppercase text-sm text-foreground/90 mb-1">
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground font-body leading-relaxed">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ TRAILER SECTION ══════════════════════════════ */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(271_76%_53%/0.07)_0%,transparent_70%)]" />
        <div className="container mx-auto max-w-4xl relative text-center">
          <div className="sep-purple mb-12" />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neon-purple/30 bg-[hsl(271_76%_53%/0.1)] text-neon-purple text-xs font-heading font-bold tracking-widest uppercase mb-5">
            ✦ Официален Трейлър
          </div>
          <h2 className="text-4xl md:text-5xl font-heading font-black tracking-wider uppercase text-foreground leading-tight mb-4">
            {s("trailer_title_1", "Почувствай")}
            <br />
            <span className="gradient-text-purple">{s("trailer_title_2", "света.")}</span>
          </h2>
          <p className="text-muted-foreground font-body mb-10 max-w-xl mx-auto leading-relaxed">
            {s("trailer_desc", "Трейлърът на ChillRP е на път. Очаквайте скоро.")}
          </p>

          {/* YouTube placeholder */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-neon-purple/20 glass flex items-center justify-center group cursor-not-allowed select-none">
            {/* Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(271_76%_53%/0.12)_0%,transparent_70%)]" />
            {/* Play icon */}
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full border-2 border-neon-purple/50 bg-[hsl(271_76%_53%/0.15)] flex items-center justify-center backdrop-blur-sm group-hover:bg-[hsl(271_76%_53%/0.25)] transition-all duration-300">
                <svg className="w-8 h-8 text-neon-purple ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="font-heading font-black text-lg tracking-widest uppercase text-foreground/80">
                  Очаквайте скоро
                </span>
                <span className="text-xs text-muted-foreground font-body tracking-wider">
                  Трейлърът се снима — скоро в YouTube
                </span>
              </div>
            </div>
            {/* Corner decoration */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-neon-purple/30 rounded-tl" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-neon-purple/30 rounded-tr" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-neon-purple/30 rounded-bl" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-neon-purple/30 rounded-br" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ GANG PREVIEW ══════════════════════════════ */}
      <section className="py-20 px-4 relative border-t border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_100%_50%,hsl(271_76%_53%/0.05)_0%,transparent_60%)]" />
        <div className="container mx-auto max-w-4xl relative">
          <div className="sep-purple mb-12" />
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neon-purple/30 bg-[hsl(271_76%_53%/0.1)] text-neon-purple text-xs font-heading font-bold tracking-widest uppercase mb-5">
                <Users size={12} /> Безплатен Генг
              </div>
              <h2 className="text-4xl md:text-5xl font-heading font-black tracking-widest uppercase leading-tight mb-5">
                {s("gang_title_1", "Искаш")}
                <br />
                <span className="gradient-text-purple">{s("gang_title_2", "властта?")}</span>
                <br />
                <span className="text-foreground">{s("gang_title_3", "Спечели я.")}</span>
              </h2>
              <p className="text-muted-foreground font-body leading-loose mb-8">
                {s("gang_desc", "Организацията не се купува — заслужава се. Оригинална концепция, активен RP, максимум 6 члена.")}
              </p>
              <Link
                to="/gangs"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-neon-purple/50 bg-[hsl(271_76%_53%/0.12)] text-neon-purple font-heading font-bold tracking-widest uppercase text-sm hover:bg-[hsl(271_76%_53%/0.22)] glow-purple transition-all"
              >
                <Users size={15} /> Кандидатствай
              </Link>
            </div>
            <div className="space-y-2.5">
              {gangTypes.map((gang) => (
                <div
                  key={gang.name}
                  className={`glass border ${gang.bg} rounded-xl px-4 py-3.5 flex items-center gap-4`}
                >
                  <span className="text-xl">{gang.emoji}</span>
                  <div className="flex-1">
                    <div className={`font-heading font-bold tracking-wider text-sm ${gang.color}`}>{gang.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{gang.desc}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                    FREE <Zap size={11} className={gang.color} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ STAFF SECTION ══════════════════════════════ */}
      <StaffSection />

      {/* ══════════════════════════════ SHOP PREVIEW ══════════════════════════════ */}
      <section className="py-20 px-4 relative border-t border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(271_76%_53%/0.06)_0%,transparent_60%)]" />
        <div className="container mx-auto max-w-4xl relative">
          <div className="sep-purple mb-12" />
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neon-purple/30 bg-[hsl(271_76%_53%/0.1)] text-neon-purple text-xs font-heading font-bold tracking-widest uppercase mb-5">
              <ShoppingBag size={12} /> Магазин
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-black tracking-widest uppercase text-foreground mb-3">
              {s("shop_title", "Подкрепи ChillRP")}
            </h2>
            <p className="text-muted-foreground font-body max-w-lg mx-auto">
              {s("shop_desc", "Вземи ексклузивни предимства и помогни за развитието на сървъра.")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {shopItems.map((item) => (
              <div
                key={item.name}
                className="glass border border-white/8 rounded-xl p-5 group hover:border-neon-purple/40 hover:bg-[hsl(271_76%_53%/0.05)] transition-all duration-300 relative"
              >
                {item.badge && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-neon-purple/30 border border-neon-purple/50 text-neon-purple text-[10px] font-heading font-bold tracking-widest">
                    {item.badge}
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="text-3xl mb-3">{item.emoji}</div>
                  <ShoppingCart
                    size={14}
                    className="text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all duration-300 mt-1"
                  />
                </div>
                <h3 className="font-heading font-bold tracking-wider text-foreground/90 group-hover:text-neon-purple transition-colors mb-1.5 text-sm uppercase">
                  {item.name}
                </h3>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-foreground/60 font-heading font-semibold tracking-widest uppercase text-sm hover:border-neon-purple/40 hover:text-neon-purple transition-all"
            >
              <ShoppingBag size={15} /> Виж Магазина <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ FINAL CTA ══════════════════════════════ */}
      <section className="py-28 px-4 relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(271_76%_53%/0.1)_0%,transparent_65%)]" />
        <div className="absolute inset-0 scanlines" />
        <div className="container mx-auto max-w-4xl relative text-center">
          <div className="sep-purple mb-12" />
          <div className="text-5xl mb-6">🏙️</div>
          <h2 className="text-4xl md:text-6xl font-heading font-black tracking-wide uppercase text-foreground mb-5 leading-tight">
            Градът те
            <br />
            <span className="text-neon-purple text-glow-purple">чака.</span>
          </h2>
          <p className="text-lg text-muted-foreground font-body mb-2 max-w-lg mx-auto leading-relaxed">
            Влез в Discord, вземи ролята си и бъди готов за старта.
          </p>
          <p className="text-sm text-neon-purple/60 font-mono tracking-widest mb-10 animate-pulse-neon">
            ⚡ СЪРВЪРЪТ СКОРО ЩЕ БЪДЕ ПУСНАТ ⚡
          </p>
          <a
            href={discordLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl border border-neon-purple/60 bg-[hsl(271_76%_53%/0.18)] text-foreground font-heading font-black tracking-widest uppercase text-lg hover:bg-[hsl(271_76%_53%/0.3)] glow-purple transition-all"
          >
            🎮 Влез в сървъра
          </a>
        </div>
      </section>
    </div>
  );
}
