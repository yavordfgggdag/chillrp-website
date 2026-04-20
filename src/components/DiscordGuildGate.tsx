import { useState } from "react";
import { ExternalLink, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth, isDiscordOAuthSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DISCORD_INVITE } from "@/lib/config";
import { getDiscordOAuthSignInOptions } from "@/lib/discordOAuth";
import DiscordBrandIcon from "@/components/DiscordBrandIcon";
import { useBranding } from "@/hooks/useBranding";
import mcBundled from "@/assets/tlr-mc-logo.png";

/**
 * Показва се след успешен Discord вход, ако ботът не те намира в официалния Discord сървър.
 */
export default function DiscordGuildGate() {
  const { session, refreshSiteRole } = useAuth();
  const [busy, setBusy] = useState<"join" | "refresh" | "oauth" | null>(null);
  const { logoUrl } = useBranding();

  const discordAccessToken = session?.provider_token ?? null;

  const tryBotAdd = async () => {
    if (!session?.access_token) {
      toast.error("Няма активна сесия.");
      return;
    }
    if (!discordAccessToken) {
      toast.error(
        "Липсва Discord разрешение за добавяне в сървъра. Излез и влез отново с Discord (ще се поиска съгласие за „Добавяне в сървъри“).",
      );
      return;
    }
    setBusy("join");
    try {
      const { data, error } = await supabase.functions.invoke("add-discord-guild-member", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { discord_access_token: discordAccessToken },
      });
      if (error) {
        toast.error("Заявката не успя. Провери дали функцията е deploy-ната и Secrets (DISCORD_BOT_TOKEN, DISCORD_GUILD_ID).");
        console.error(error);
        return;
      }
      const err = (data as { error?: string })?.error;
      if (err === "discord_token_invalid" || err === "discord_mismatch") {
        toast.error("Discord токенът е невалиден или не съвпада с акаунта. Излез и влез отново.");
        return;
      }
      if (data && (data as { ok?: boolean }).ok === true) {
        toast.success("Готово — опитай „Провери отново“.");
        await refreshSiteRole();
        return;
      }
      const detail = (data as { error?: string; detail?: string })?.error;
      toast.error(detail === "discord_add_member_failed" ? "Ботът не можа да те добави (права в Discord или вече си в сървъра). Ползвай поканата." : "Discord не прие добавянето. Влез през поканата по-долу и опитай пак.");
    } finally {
      setBusy(null);
    }
  };

  const onRefresh = async () => {
    setBusy("refresh");
    try {
      await refreshSiteRole();
      toast.message("Проверката е обновена.");
    } finally {
      setBusy(null);
    }
  };

  const onReauthorize = async () => {
    setBusy("oauth");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: getDiscordOAuthSignInOptions(),
      });
      if (error) {
        toast.error("Грешка при повторен Discord вход.");
        console.error(error);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,hsl(160_84%_39%/0.14)_0%,transparent_60%)]" />
      <div className="absolute inset-0 scanlines" />
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg gap-5">
        <img
          src={logoUrl || mcBundled}
          alt=""
          className="h-24 md:h-28 w-auto logo-neon-bloom"
          onError={(e) => {
            if (logoUrl) (e.currentTarget as HTMLImageElement).src = mcBundled;
          }}
        />
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2 text-xs font-heading font-bold uppercase tracking-widest text-amber-200">
          Не си в официалния Discord
        </div>
        <h1 className="text-2xl md:text-3xl font-heading font-black tracking-widest uppercase text-foreground">
          Влез в Discord сървъра
        </h1>
        <p className="text-muted-foreground font-body text-sm leading-relaxed">
          Сайтът е вързан към общността в Discord. Присъедини се през поканата, после натисни „Провери отново“. Ако си напуснал сървъра и искаш ботът да те върне с твоето съгласие, ползвай бутона с щит (изисква разрешение при вход с Discord).
        </p>

        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-heading font-bold text-sm tracking-widest uppercase transition-colors w-full max-w-sm"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          Отвори покана за Discord
        </a>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <button
            type="button"
            disabled={busy !== null}
            onClick={onRefresh}
            className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 font-heading font-bold text-xs uppercase tracking-wider disabled:opacity-50"
          >
            {busy === "refresh" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Провери отново
          </button>
          <button
            type="button"
            disabled={busy !== null || !isDiscordOAuthSession(session)}
            onClick={tryBotAdd}
            className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 rounded-xl border border-primary/40 bg-primary/15 hover:bg-primary/25 text-primary font-heading font-bold text-xs uppercase tracking-wider disabled:opacity-50"
            title={!session?.provider_token ? "Първо влез отново с Discord за да се поиска разрешение" : undefined}
          >
            {busy === "join" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Ботът да ме добави
          </button>
        </div>

        <button
          type="button"
          disabled={busy !== null}
          onClick={onReauthorize}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline font-body"
        >
          <DiscordBrandIcon size={16} />
          Няма разрешение за бота? Влез отново с Discord
        </button>
      </div>
    </div>
  );
}
