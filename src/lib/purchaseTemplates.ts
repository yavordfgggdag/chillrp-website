/**
 * Шаблони за бележка (Revolut/PayPal) и Discord DM — плейсхолдъри {{ключ}}.
 */

export function applyPurchaseTemplate(template: string, vars: Record<string, string | undefined | null>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    const val = v == null ? "" : String(v);
    out = out.split(`{{${k}}}`).join(val);
  }
  return out;
}

/** Ако шаблонът е празен — само референцията (съвместимост със старото поведение). */
export function resolveTransferNoteTemplate(raw: string | null | undefined): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  return t.length > 0 ? t : "{{reference}}";
}

export type TransferNoteLineInput = {
  slug: string;
  name: string;
  transferNoteTemplate?: string | null;
};

/**
 * За количка: ползва шаблона на първия ред с непразен шаблон; иначе първия продукт; иначе default.
 */
export function pickTransferNoteTemplateForLines(lines: TransferNoteLineInput[]): string {
  for (const line of lines) {
    const t = line.transferNoteTemplate?.trim();
    if (t) return t;
  }
  return "{{reference}}";
}
