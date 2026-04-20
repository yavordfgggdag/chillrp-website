import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDiscordOAuthSignInOptions } from "@/lib/discordOAuth";
import { isSupabaseConfiguredForAuth } from "@/lib/supabaseSiteUrl";
import DiscordBrandIcon from "@/components/DiscordBrandIcon";

/** Модал за вход с Discord – изключен от UI за сега, запазен за по-късно. */

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [discordLoading, setDiscordLoading] = useState(false);

  const handleDiscordLogin = async () => {
    if (!isSupabaseConfiguredForAuth()) {
      toast.error(
        "Липсва VITE_SUPABASE_URL в .env. Виж .env.example — после npm run build ако ползваш preview.",
      );
      return;
    }
    setDiscordLoading(true);
    try {
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      if (currentPath && currentPath !== "/auth/callback") {
        localStorage.setItem("chillrp_post_auth_path", currentPath);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: getDiscordOAuthSignInOptions(),
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
      <div className="glass-strong border border-primary/40 rounded-2xl max-w-sm w-full animate-slide-in-up p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading font-black text-lg tracking-widest uppercase text-primary">
              🔑 Влез в акаунта
            </h2>
            <p className="text-xs text-muted-foreground font-body mt-0.5">TLR Platform</p>
          </div>
          <button aria-label="Затвори" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <button
          onClick={handleDiscordLogin}
          disabled={discordLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/15 text-white font-heading font-bold text-sm tracking-wider transition-all disabled:opacity-50"
        >
          {discordLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <DiscordBrandIcon size={20} className="w-5 h-5 text-white" />
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
