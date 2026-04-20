import { useEffect, useRef } from "react";
import { useActivityLogger } from "@/hooks/useActivityLogger";

const CLICK_THROTTLE_MS = 600;
const MAX_DETAILS_LENGTH = 2000;

function getClickLabel(el: HTMLElement): string {
  const text = el.innerText?.trim().slice(0, 120) || "";
  const ariaLabel = el.getAttribute("aria-label") || "";
  const title = el.getAttribute("title") || "";
  const alt = (el as HTMLImageElement).alt || "";
  const placeholder = (el as HTMLInputElement).placeholder || "";
  const value = (el as HTMLInputElement).value;
  if (el.tagName === "INPUT" && (el as HTMLInputElement).type === "password") return "[password]";
  return text || ariaLabel || title || alt || placeholder || (value ? String(value).slice(0, 40) : "") || el.tagName.toLowerCase();
}

function getElementType(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  if (tag === "a") return "link";
  if (tag === "button") return "button";
  if (tag === "input") return `input_${(el as HTMLInputElement).type || "text"}`;
  if (tag === "select") return "select";
  if (tag === "textarea") return "textarea";
  if (tag === "img") return "image";
  if (el.getAttribute("role") === "button") return "button";
  if (el.closest("button")) return "button";
  if (el.closest("a")) return "link";
  return tag;
}

function buildRichClickDetails(el: HTMLElement, elType: string): string {
  const anchor = el.closest("a") as HTMLAnchorElement | null;
  const href = anchor?.getAttribute("href") || (el.getAttribute("href") ?? "");
  const id = el.id || "";
  const className = (el.className && typeof el.className === "string" ? el.className : "").slice(0, 150);
  const role = el.getAttribute("role") || "";
  const name = (el as HTMLInputElement).name || "";
  const type = (el as HTMLInputElement).type || "";
  const label = getClickLabel(el).replace(/\s+/g, " ").slice(0, 200);
  const dataAttrs: string[] = [];
  if (el.dataset) {
    for (const [k, v] of Object.entries(el.dataset)) {
      if (v !== undefined && v !== null && String(v).length < 100) dataAttrs.push(`${k}=${String(v).slice(0, 80)}`);
    }
  }
  const parent = el.closest("[data-testid], [data-page], section, main, nav, header, footer");
  const parentInfo = parent ? ` parent=${parent.tagName.toLowerCase()}${(parent as HTMLElement).dataset?.testid ? ` data-testid=${(parent as HTMLElement).dataset.testid}` : ""}` : "";

  const parts = [
    `type=${elType}`,
    label ? `text="${label}"` : "",
    href ? `href=${href}` : "",
    id ? `id=${id}` : "",
    className ? `class=${className}` : "",
    role ? `role=${role}` : "",
    name ? `name=${name}` : "",
    type ? `input_type=${type}` : "",
    dataAttrs.length ? `data=[${dataAttrs.join("; ")}]` : "",
    parentInfo.trim(),
  ].filter(Boolean);
  const str = parts.join(" | ");
  return str.length > MAX_DETAILS_LENGTH ? str.slice(0, MAX_DETAILS_LENGTH) + "…" : str;
}

export default function ActivityTracker() {
  const log = useActivityLogger();
  const lastClickKey = useRef("");
  const lastClickTime = useRef(0);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !target.tagName) return;

      const interactive = target.closest("button, a, [role='button'], input, select, textarea, [onclick]") as HTMLElement || target;
      const elType = getElementType(interactive);
      const key = `${interactive.tagName}:${(interactive.id || "").slice(0, 50)}:${getClickLabel(interactive).slice(0, 30)}`;
      const now = Date.now();
      if (key === lastClickKey.current && now - lastClickTime.current < CLICK_THROTTLE_MS) return;
      lastClickKey.current = key;
      lastClickTime.current = now;

      const details = buildRichClickDetails(interactive, elType);
      log("click", `🖱️ ${details}`);
    };

    let maxScroll = 0;
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      const scrollPercent = Math.round((window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)) * 100);
      if (scrollPercent > maxScroll + 15) {
        maxScroll = scrollPercent;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          log("scroll", `📜 Scroll: ${maxScroll}% | path=${window.location.pathname}`);
        }, 1200);
      }
    };

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const name = (target as HTMLInputElement).name || "";
      const type = (target as HTMLInputElement).type || "";
      const id = target.id || "";
      const placeholder = (target as HTMLInputElement).placeholder || "";
      const label = target.getAttribute("aria-label") || "";
      log("form_focus", `✏️ Поле: name=${name || "—"} type=${type || "—"} id=${id || "—"} placeholder=${placeholder ? placeholder.slice(0, 50) : "—"} aria-label=${label || "—"}`);
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const name = (target as HTMLInputElement).name || "";
      const type = (target as HTMLInputElement).type || "";
      if ((target as HTMLInputElement).type === "password") return;
      const val = (target as HTMLInputElement).value;
      const len = val ? val.length : 0;
      log("form_blur", `✏️ Напусна поле: name=${name || "—"} type=${type} | дължина=${len} (стойност не се логва)`);
    };

    const handleCopy = () => {
      const selection = window.getSelection()?.toString().trim().slice(0, 150) || "";
      log("copy", `📋 Копира: "${selection}"`);
    };

    const handleSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (!form?.tagName || form.tagName !== "FORM") return;
      const action = form.getAttribute("action") || "";
      const method = form.method || "get";
      log("form_submit", `📤 Form submit: method=${method} action=${action || "—"} | id=${form.id || "—"}`);
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("focusin", handleFocus, true);
    document.addEventListener("focusout", handleBlur, true);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("focusin", handleFocus, true);
      document.removeEventListener("focusout", handleBlur, true);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("submit", handleSubmit, true);
      clearTimeout(scrollTimeout);
    };
  }, [log]);

  return null;
}
