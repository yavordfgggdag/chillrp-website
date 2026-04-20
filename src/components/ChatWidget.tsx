import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ExternalLink, Send, Loader2 } from "lucide-react";
import mcBundled from "@/assets/tlr-mc-logo.png";
import { DISCORD_INVITE } from "@/lib/config";
import { toast } from "sonner";
import { getSiteUrl } from "@/lib/siteUrl";
import { useBranding } from "@/hooks/useBranding";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const CHILLBOT_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/chillbot` : "";

/** Контекст за бота според текущата страница (legacy job subsites премахнати). */
function getPageContext(_pathname: string): null {
  return null;
}

type Msg = { from: "bot" | "user"; text: string; redirectStaff?: boolean };

const quickRepliesGeneral = [
  { label: "🎮 Как да се присъединя към сървъра?" },
  { label: "📋 Къде са правилата?" },
  { label: "⚔️ Как да регистрирам фракция?" },
  { label: "🛒 Какво има в магазина?" },
];
const quickRepliesSection = [
  { label: "Какви са правилата тук?" },
  { label: "Къде е ценоразписът?" },
  { label: "Обясни как работи секцията" },
];

// ✅ 100% маха кавички (всякакви)
const stripQuotes = (s: string) => String(s).replace(/["'“”‘’]/g, "");

// ✅ Нормализира линкове към текущия origin (localhost / preview / прод) + вътрешни пътища → пълен URL
const normalizeLinks = (s: string) => {
  let out = String(s);
  const siteUrl = getSiteUrl();

  // 1) Стари домейни / chill* → текущият origin (localhost или новият прод домейн)
  out = out.replace(/https?:\/\/[^\s)]+/gi, (url) => {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./i, "").toLowerCase();
      const legacyHost =
        host === "chillroleplay.shop" ||
        host === "chillroleplay.store" ||
        /chillroleplay/i.test(host) ||
        /chill/i.test(u.hostname);
      if (legacyHost) {
        return siteUrl + u.pathname + u.search + u.hash;
      }
      return url;
    } catch {
      return url;
    }
  });

  // 2) Ако ботът дава само пътища (/shop и т.н.) → правим пълен URL
  out = out.replace(
    /(^|\s)(\/(shop|profile|gangs|rules\/discord|rules\/server|rules\/crime))\b/gi,
    (_m, p1, path) => `${p1}${siteUrl}${path}`,
  );

  return out;
};

// ✅ Общ sanitize за bot output
const sanitizeBotText = (s: string) => normalizeLinks(stripQuotes(s));

const DEFAULT_BOT_GREETING =
  "Хей! Аз съм асистентът на сайта за Minecraft сървъра.\n\nПитай за IP, режими, правила или магазина — или избери бърз въпрос.";

export default function ChatWidget() {
  const { logoUrl } = useBranding();
  const resolvedLogo = logoUrl || mcBundled;
  const location = useLocation();
  const pageContext = getPageContext(location.pathname);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: DEFAULT_BOT_GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // При смяна на секция нулирай чата и покажи съответното приветствие
  const prevContext = useRef<typeof pageContext>(null);
  useEffect(() => {
    if (prevContext.current !== pageContext) {
      prevContext.current = pageContext;
      setMessages([{ from: "bot", text: DEFAULT_BOT_GREETING }]);
    }
  }, [pageContext]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");

    const userMsg: Msg = { from: "user", text: text.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    // Build API message history (only user/bot turns)
    // ✅ Санитайзваме и историята, за да не се "заразява" контекстът с кавички/грешни линкове
    const apiMessages = history
      .filter((m) => m.from === "user" || m.from === "bot")
      .map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: sanitizeBotText(m.text.replace("[REDIRECT_STAFF]", "").trim()),
      }));

    let assistantText = "";
    let redirectStaff = false;

    try {
      if (!CHILLBOT_URL) {
        toast.error("Чат ботът не е конфигуриран.");
        setLoading(false);
        return;
      }
      const resp = await fetch(CHILLBOT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages, page: pageContext }),
      });

      if (resp.status === 429) {
        toast.error("TLR RP бот е претоварен. Опитай след малко.");
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("TLR RP бот временно не е достъпен.");
        setLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      // Add empty bot message to update progressively
      setMessages((prev) => [...prev, { from: "bot", text: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = parsed.choices?.[0]?.delta?.content as string | undefined;

            if (chunk) {
              assistantText += chunk;
              if (assistantText.includes("[REDIRECT_STAFF]")) redirectStaff = true;

              // ✅ Санитайз в реално време (махаме кавички + оправяме линкове)
              const displayText = sanitizeBotText(assistantText.replace("[REDIRECT_STAFF]", "").trim());

              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { from: "bot", text: displayText, redirectStaff };
                return updated;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      const finalText = sanitizeBotText(assistantText.replace("[REDIRECT_STAFF]", "").trim());

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { from: "bot", text: finalText || "Нямам отговор.", redirectStaff };
        return updated;
      });
    } catch (e) {
      console.error(e);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          from: "bot",
          text: "Нещо се обърка. Опитай отново или се свържи с стаф.",
          redirectStaff: true,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-6 z-[60] h-12 w-12 [filter:drop-shadow(0_0_12px_rgba(16,185,129,0.5))_drop-shadow(0_0_24px_rgba(4,120,87,0.35))_drop-shadow(0_4px_14px_rgba(0,0,0,0.65))]">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="shape-hex relative h-full w-full overflow-hidden bg-black transition-[opacity,transform] hover:opacity-95 active:scale-[0.97]"
          aria-label={open ? "Затвори чат" : "Отвори чат с асистента"}
        >
          <img
            src={resolvedLogo}
            alt=""
            className="logo-hex-fg pointer-events-none absolute left-1/2 top-1/2 z-10 h-full w-full max-h-none max-w-none -translate-x-1/2 -translate-y-1/2 origin-center object-contain select-none scale-[1.92]"
            draggable={false}
            onError={(e) => {
              if (logoUrl) (e.currentTarget as HTMLImageElement).src = mcBundled;
            }}
          />
        </button>
      </div>

      {open && (
        <div
          className="fixed bottom-[6.25rem] left-6 z-[60] w-80 glass-strong border-2 border-primary/50 rounded-xl overflow-hidden animate-slide-in-up shadow-2xl flex flex-col [filter:drop-shadow(0_12px_40px_rgba(0,0,0,0.55))]"
          style={{ maxHeight: "480px" }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-primary/20 bg-primary/10 flex items-center gap-3 shrink-0">
            <div className="shape-hex relative h-14 w-14 shrink-0 overflow-hidden bg-black">
              <img
                src={resolvedLogo}
                alt=""
                className="logo-hex-fg absolute left-1/2 top-1/2 h-full w-full max-h-none max-w-none -translate-x-1/2 -translate-y-1/2 origin-center object-contain scale-[2.02]"
                draggable={false}
                onError={(e) => {
                  if (logoUrl) (e.currentTarget as HTMLImageElement).src = mcBundled;
                }}
              />
            </div>
            <div>
              <div className="text-sm font-heading font-semibold text-foreground">TLR RP бот</div>
              <div className="text-xs text-neon-green flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green inline-block animate-pulse" />
                AI асистент
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.from === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[88%] px-3 py-2 rounded-xl text-xs whitespace-pre-line leading-relaxed ${
                    msg.from === "user"
                      ? "bg-primary/20 border border-primary/30 text-foreground"
                      : "bg-muted border border-border text-muted-foreground"
                  }`}
                >
                  {msg.text ||
                    (loading && i === messages.length - 1 ? (
                      <span className="flex gap-1 items-center py-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </span>
                    ) : (
                      ""
                    ))}
                </div>

                {msg.redirectStaff && msg.from === "bot" && (
                  <a
                    href={DISCORD_INVITE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary text-[10px] font-heading font-semibold tracking-wider hover:bg-primary/30 transition-colors"
                  >
                    <ExternalLink size={10} /> Свържи се с стаф в Discord
                  </a>
                )}
              </div>
            ))}

            {loading && messages[messages.length - 1]?.from === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted border border-border px-3 py-2.5 rounded-xl text-xs text-muted-foreground flex gap-1 items-center">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick replies — shown only when 1 message */}
          {messages.length <= 1 && (
            <div className="px-3 pt-1 pb-2 border-t border-border/30 shrink-0">
              <div className="text-[10px] text-muted-foreground mb-1.5 font-heading uppercase tracking-wider">
                Бързи въпроси
              </div>
              <div className="flex flex-col gap-1">
                {(pageContext ? quickRepliesSection : quickRepliesGeneral).map((r) => (
                  <button
                    key={r.label}
                    onClick={() => sendMessage(r.label)}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-lg border border-primary/20 text-left text-foreground/70 hover:text-primary hover:bg-primary/10 hover:border-primary/40 transition-colors font-body disabled:opacity-50"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-border/30 shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                placeholder="Пиши тук..."
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-xl glass border border-white/10 focus:border-primary/50 focus:outline-none text-xs font-body text-foreground placeholder:text-muted-foreground bg-transparent disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="shape-hex w-8 h-8 overflow-hidden bg-primary/35 text-primary ring-1 ring-inset ring-primary/50 flex items-center justify-center hover:bg-primary/50 transition-colors disabled:opacity-40 shrink-0 [filter:drop-shadow(0_0_6px_rgba(16,185,129,0.35))]"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>

            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2 mt-2 rounded-lg bg-transparent border border-white/10 text-muted-foreground/60 text-[10px] font-heading tracking-wider hover:border-primary/30 hover:text-primary transition-colors"
            >
              <ExternalLink size={10} /> Свържи се директно с стаф
            </a>
          </div>
        </div>
      )}
    </>
  );
}
