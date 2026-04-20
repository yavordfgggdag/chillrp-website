import { useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DISCORD_INVITE, MINECRAFT_SERVER_ADDRESS } from "@/lib/config";

export default function FloatingJoinButton() {
  const [serverIp, setServerIp] = useState(MINECRAFT_SERVER_ADDRESS);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .eq("key", "minecraft_server_address")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value?.trim()) setServerIp(data.value.trim());
      });
  }, []);

  const copyIp = () => {
    void navigator.clipboard.writeText(serverIp);
    toast.success("IP копиран. Постави го в Minecraft → Multiplayer.");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={copyIp}
        className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl glass-strong border border-primary/50 bg-primary/12 text-foreground font-heading font-black tracking-widest uppercase text-sm hover:bg-primary/22 glow-accent transition-all shadow-2xl"
      >
        <Copy size={16} className="shrink-0 opacity-90 text-primary" />
        Копирай IP
      </button>
      <a
        href={DISCORD_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[10px] font-heading font-bold tracking-wider uppercase text-muted-foreground hover:text-primary px-1"
      >
        Discord
        <ExternalLink size={10} />
      </a>
    </div>
  );
}
