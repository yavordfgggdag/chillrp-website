import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import chillrpLogo from "@/assets/chillrp-logo.png";

const DISCORD_ICON = "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/discord.svg";

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [discordLoading, setDiscordLoading] = useState(false);

  const handleDiscordLogin = async () => {
    setDiscordLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error("Грешка при вход с Discord.");
        console.error(error);
      }
    } catch (err) {
      toast.error("Грешка при вход с Discord.");
      console.error(err);
    } finally {
      setDiscordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-4">
        <div className="w-12 h-12 rounded-xl border border-neon-purple/40 bg-neon-purple/10 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-neon-purple animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground font-body">Зареждане...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,hsl(271_76%_53%/0.12)_0%,transparent_60%)]" />
        <div className="absolute inset-0 scanlines" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <img
            src={chillrpLogo}
            alt="ChillRP"
            className="h-28 md:h-36 w-auto mb-8 drop-shadow-[0_0_40px_rgba(160,100,255,0.4)]"
          />
          <h1 className="text-2xl md:text-3xl font-heading font-black tracking-widest uppercase text-foreground mb-2">
            Влез в ChillRP
          </h1>
          <p className="text-muted-foreground font-body text-sm mb-8">
            За да използваш сайта, влез с Discord акаунта си. Ролите ти в сървъра определят достъпа до съдържанието.
          </p>
          <button
            onClick={handleDiscordLogin}
            disabled={discordLoading}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-heading font-bold text-base tracking-widest uppercase transition-all disabled:opacity-50 glow-purple border border-white/10"
          >
            {discordLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <img src={DISCORD_ICON} alt="" className="w-6 h-6 invert" width={24} height={24} />
                Влез с Discord
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground/60 font-body mt-6">
            Нямаш акаунт? Присъедини се към Discord сървъра и след това влез тук.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
