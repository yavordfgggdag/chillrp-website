import { useEffect } from "react";
import { useActivityLogger } from "@/hooks/useActivityLogger";

function getClickLabel(el: HTMLElement): string {
  // Try to get meaningful text from the clicked element
  const text = el.innerText?.trim().slice(0, 80) || "";
  const ariaLabel = el.getAttribute("aria-label") || "";
  const title = el.getAttribute("title") || "";
  const alt = (el as HTMLImageElement).alt || "";
  const placeholder = (el as HTMLInputElement).placeholder || "";
  
  return text || ariaLabel || title || alt || placeholder || el.tagName.toLowerCase();
}

function getElementType(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  if (tag === "a") return "link";
  if (tag === "button") return "button";
  if (tag === "input") return `input[${(el as HTMLInputElement).type || "text"}]`;
  if (tag === "select") return "select";
  if (tag === "textarea") return "textarea";
  if (tag === "img") return "image";
  if (el.getAttribute("role") === "button") return "button";
  if (el.closest("button")) return "button";
  if (el.closest("a")) return "link";
  return tag;
}

function getHref(el: HTMLElement): string {
  const anchor = el.closest("a");
  if (anchor) return anchor.getAttribute("href") || "";
  return "";
}

export default function ActivityTracker() {
  const log = useActivityLogger();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Find the closest interactive element
      const interactive = target.closest("button, a, [role='button'], input, select, textarea") as HTMLElement || target;
      
      const elType = getElementType(interactive);
      const label = getClickLabel(interactive);
      const href = getHref(interactive);
      
      // Skip logging for non-interactive elements deep in the DOM
      if (!["button", "link", "input[checkbox]", "input[radio]", "input[submit]", "select", "image"].includes(elType) && !interactive.closest("button, a")) {
        return;
      }

      const details = [
        `🖱️ [${elType.toUpperCase()}]`,
        `"${label.slice(0, 60)}"`,
        href ? `→ ${href}` : "",
      ].filter(Boolean).join(" ");

      log("click", details);
    };

    // Track scroll depth
    let maxScroll = 0;
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
      if (scrollPercent > maxScroll + 20) {
        maxScroll = scrollPercent;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          log("scroll", `📜 Scroll дълбочина: ${maxScroll}%`);
        }, 1500);
      }
    };

    // Track form focus
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const label = (target as HTMLInputElement).name || (target as HTMLInputElement).placeholder || target.getAttribute("aria-label") || target.tagName;
      log("form_focus", `✏️ Фокус на поле: "${label}"`);
    };

    // Track copy events
    const handleCopy = () => {
      const selection = window.getSelection()?.toString().slice(0, 60) || "";
      log("copy", `📋 Копира: "${selection}"`);
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("focusin", handleFocus, true);
    document.addEventListener("copy", handleCopy, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("focusin", handleFocus, true);
      document.removeEventListener("copy", handleCopy, true);
      clearTimeout(scrollTimeout);
    };
  }, [log]);

  return null;
}
