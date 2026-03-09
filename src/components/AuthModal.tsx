import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Модал за вход с Discord – изключен от UI за сега, запазен за по-късно. */
const DISCORD_ICON = "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/discord.svg";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
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

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-strong border border-neon-purple/40 rounded-2xl max-w-sm w-full animate-slide-in-up p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading font-black text-lg tracking-widest uppercase text-neon-purple">
              🔑 Влез в акаунта
            </h2>
            <p className="text-xs text-muted-foreground font-body mt-0.5">ChillRP Platform</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <button
          onClick={handleDiscordLogin}
          disabled={discordLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-heading font-bold text-sm tracking-wider transition-all disabled:opacity-50"
        >
          {discordLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <img src={DISCORD_ICON} alt="" className="w-5 h-5 invert" width={20} height={20} />
              Влез с Discord
            </>
          )}
        </button>

        <p className="text-[10px] text-muted-foreground/40 text-center font-body mt-4">
          Входът е само с Discord. Ролите ти в сървъра определят достъпа до наръчника и админ панела.
        </p>
      </div>
    </div>
  );
}
