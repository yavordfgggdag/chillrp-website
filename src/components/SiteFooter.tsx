import { Link } from "react-router-dom";
import mcBundled from "@/assets/tlr-mc-logo.png";
import { useBranding } from "@/hooks/useBranding";
import { DISCORD_INVITE, SITE_NAME } from "@/lib/config";

export default function SiteFooter() {
  const { logoUrl } = useBranding();
  return (
    <footer className="border-t border-white/5 py-12 px-4 mt-auto bg-black/20">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <img
            src={logoUrl || mcBundled}
            alt={SITE_NAME}
            className="h-12 w-auto opacity-90 logo-neon-bloom-sm"
            onError={(e) => {
              if (logoUrl) (e.currentTarget as HTMLImageElement).src = mcBundled;
            }}
          />
          <div className="text-center md:text-right">
            <p className="text-xs text-muted-foreground font-mono tracking-widest">
              © {new Date().getFullYear()} {SITE_NAME} · Minecraft roleplay · България
            </p>
            <p className="text-xs text-muted-foreground/50 font-body mt-1">Не е свързан с Mojang или Microsoft.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-8 pt-6 border-t border-white/5">
          <Link to="/privacy" className="text-xs text-muted-foreground hover:text-primary font-body transition-colors">
            Политика за поверителност
          </Link>
          <Link to="/cookies" className="text-xs text-muted-foreground hover:text-primary font-body transition-colors">
            Бисквитки
          </Link>
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-primary font-body transition-colors">
            Общи условия
          </Link>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary font-body transition-colors"
          >
            Discord
          </a>
          <Link to="/rules" className="text-xs text-muted-foreground hover:text-primary font-body transition-colors">
            Правила
          </Link>
        </div>
      </div>
    </footer>
  );
}
