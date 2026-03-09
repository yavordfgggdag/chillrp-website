import { Link } from "react-router-dom";
import chillrpLogo from "@/assets/chillrp-logo.png";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/5 py-10 px-4 mt-auto">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={chillrpLogo} alt="ChillRP" className="h-12 w-auto opacity-60" />
          <p className="text-xs text-muted-foreground font-mono tracking-widest text-center">
            © 2025 ChillRP • FiveM GTA Roleplay • България
          </p>
          <p className="text-xs text-muted-foreground/30 font-body text-center">
            Не е свързан с Rockstar Games
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-4 pt-4 border-t border-white/5">
          <Link
            to="/privacy"
            className="text-xs text-muted-foreground hover:text-neon-purple font-body transition-colors"
          >
            Политика за поверителност
          </Link>
          <Link
            to="/cookies"
            className="text-xs text-muted-foreground hover:text-neon-purple font-body transition-colors"
          >
            Бисквитки
          </Link>
          <Link
            to="/terms"
            className="text-xs text-muted-foreground hover:text-neon-purple font-body transition-colors"
          >
            Общи условия
          </Link>
        </div>
      </div>
    </footer>
  );
}
