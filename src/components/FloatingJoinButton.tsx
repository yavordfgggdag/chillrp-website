import { useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { DISCORD_INVITE } from "@/lib/config";

export default function FloatingJoinButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl glass-strong border border-neon-purple/60 bg-neon-purple/15 text-foreground font-heading font-black tracking-widest uppercase text-sm hover:bg-neon-purple/28 glow-purple transition-all animate-pulse-neon shadow-2xl"
      >
        🎮 Влез в сървъра
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="glass-strong border border-neon-purple/30 rounded-2xl p-8 max-w-md w-full mx-4 relative animate-slide-in-up">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
            <div className="text-center space-y-4">
              <div className="text-5xl mb-2">🏙️</div>
              <h2 className="text-2xl font-heading font-bold text-neon-purple text-glow-purple tracking-widest uppercase">
                Скоро ще бъде пуснат.
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">Влез в Discord за роли, новини и старт.</p>
              <div className="sep-purple my-4" />
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl border border-neon-purple/60 bg-neon-purple/18 text-foreground font-heading font-black tracking-widest uppercase text-sm hover:bg-neon-purple/30 glow-purple transition-all"
              >
                <ExternalLink size={16} />
                Влез в Discord
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
