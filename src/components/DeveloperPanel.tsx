import React, { useState, useEffect } from "react";
import {
  Cpu, ListTodo, History, Play, Edit2, Trash2, X, Loader2, RotateCcw,
  Plus, RefreshCw, ChevronDown, ChevronRight, Sparkles, CheckCircle2, Copy, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DevCustomAction = {
  id: string;
  name: string;
  description: string;
  type: "edge_function" | "url" | "task";
  payload: string;
  created_at?: string;
};

export type DevHistoryEntry = {
  id: string;
  timestamp: string;
  label: string;
  summary: string;
  revertData?: Record<string, unknown>;
};

const DEV_ACTIONS_KEY = "dev_custom_actions";
const DEV_HISTORY_KEY = "dev_action_history";
const MAX_HISTORY = 50;

type DeveloperPanelProps = {
  isStaffReadOnly: boolean;
  onLog?: (action: string, details: string) => void;
};

function getValidEdgeFunctionName(rawPayload: string | undefined, contextLabel: string): string | null {
  const raw = rawPayload || "";
  const fnName = raw.split("\n")[0].trim();

  if (!fnName || fnName === "/" || fnName === "//") {
    console.error("[DeveloperPanel] Invalid edge_function payload (empty name)", { context: contextLabel, rawPayload });
    return null;
  }

  const isValid = /^[a-zA-Z0-9_-]+$/.test(fnName);
  if (!isValid) {
    console.error("[DeveloperPanel] Invalid edge_function name", { context: contextLabel, fnName, rawPayload });
    return null;
  }

  return fnName;
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "току-що";
  if (mins < 60) return `преди ${mins} мин`;
  if (hours < 24) return `преди ${hours} ч`;
  if (days < 7) return `преди ${days} д`;
  return d.toLocaleDateString("bg-BG", { day: "numeric", month: "short", year: "numeric" });
}

/** Парсва отговора от chillbot или шаблон за име + описание */
function parseGeneratedPrompt(text: string): { name: string; description: string } {
  const t = text.trim();
  const nameMatch = t.match(/^име:\s*(.+?)(?=\n|$)/im) || t.match(/^(.+?)\s*[|\n]/m);
  const descMatch = t.match(/описание:\s*(.+?)(?=\n(?:payload|тип)|$)/ims) || t.match(/\|\s*(.+?)$/s);
  const name = (nameMatch ? nameMatch[1].trim() : t.split("\n")[0]?.trim() || "").slice(0, 120);
  const description = (descMatch ? descMatch[1].trim() : t).slice(0, 500);
  return { name: name || "Ново действие", description: description || t };
}

export default function DeveloperPanel({ isStaffReadOnly, onLog }: DeveloperPanelProps) {
  const [promptInput, setPromptInput] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [generateLoading, setGenerateLoading] = useState(false);
  const [customActions, setCustomActions] = useState<DevCustomAction[]>([]);
  const [actionHistory, setActionHistory] = useState<DevHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<DevCustomAction | null>(null);
  const [actionForm, setActionForm] = useState({ name: "", description: "", type: "edge_function" as DevCustomAction["type"], payload: "" });
  const [confirmRun, setConfirmRun] = useState<DevCustomAction | null>(null);
  const [running, setRunning] = useState(false);
  const [historyReverting, setHistoryReverting] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState({ actions: true, history: true });

  useEffect(() => {
    loadDevData();
  }, []);

  async function loadDevData() {
    setLoading(true);
    try {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", [DEV_ACTIONS_KEY, DEV_HISTORY_KEY]);
      const rows = data || [];
      const get = (k: string) => {
        const r = rows.find((x: { key: string }) => x.key === k) as { value?: string } | undefined;
        if (!r?.value) return null;
        try {
          return JSON.parse(r.value);
        } catch {
          return null;
        }
      };
      setCustomActions(Array.isArray(get(DEV_ACTIONS_KEY)) ? get(DEV_ACTIONS_KEY) : []);
      setActionHistory(Array.isArray(get(DEV_HISTORY_KEY)) ? get(DEV_HISTORY_KEY).slice(0, MAX_HISTORY) : []);
    } catch {
      toast.error("Грешка при зареждане на Developer данни.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCustomActions(actions: DevCustomAction[]) {
    const { error } = await supabase.from("site_settings").upsert(
      { key: DEV_ACTIONS_KEY, value: JSON.stringify(actions), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) toast.error("Грешка при запазване на действията.");
    else setCustomActions(actions);
  }

  async function saveActionHistory(history: DevHistoryEntry[]) {
    const { error } = await supabase.from("site_settings").upsert(
      { key: DEV_HISTORY_KEY, value: JSON.stringify(history.slice(0, MAX_HISTORY)), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) toast.error("Грешка при запазване на историята.");
    else setActionHistory(history);
  }

  /** Генерира промпт (шаблон) от описанието — готов за попълване в ново действие */
  function generatePrompt() {
    const raw = promptInput.trim();
    if (!raw) {
      toast.error("Напиши какво трябва да прави действието.");
      return;
    }
    setGenerateLoading(true);
    setGeneratedPrompt("");
    setTimeout(() => {
      const name = raw.charAt(0).toUpperCase() + raw.slice(1).trim().slice(0, 60);
      const desc = `Действие: ${raw}. Избери тип (Edge Function / URL / Задача) и попълни payload в формата за ново действие.`;
      setGeneratedPrompt(`Име: ${name}\nОписание: ${desc}`);
      toast.success("Промптът е подготвен.");
      onLog?.("dev_prompt_generated", raw.slice(0, 80));
      setGenerateLoading(false);
    }, 300);
  }

  function usePromptForNewAction() {
    if (!generatedPrompt.trim()) {
      toast.error("Първо генерирай промпт.");
      return;
    }
    const { name, description } = parseGeneratedPrompt(generatedPrompt);
    setActionForm({
      name,
      description,
      type: "edge_function",
      payload: "",
    });
    setActionModal({ id: "", name: "", description: "", type: "edge_function", payload: "" });
    toast.success("Попълнено от промпта. Довърши типа и payload.");
  }

  function copyPrompt() {
    if (!generatedPrompt.trim()) return;
    navigator.clipboard.writeText(generatedPrompt);
    toast.success("Копирано в клипборда.");
  }

  function addOrUpdateAction() {
    if (!actionForm.name.trim()) {
      toast.error("Име е задължително.");
      return;
    }
    const list = [...customActions];
    const existing = actionModal?.id ? list.find((a) => a.id === actionModal.id) : null;
    const payload: DevCustomAction = {
      id: existing?.id ?? crypto.randomUUID(),
      name: actionForm.name.trim(),
      description: actionForm.description.trim(),
      type: actionForm.type,
      payload: actionForm.payload.trim(),
      created_at: existing?.created_at ?? new Date().toISOString(),
    };
    if (existing) {
      const idx = list.findIndex((a) => a.id === existing.id);
      list[idx] = payload;
    } else {
      list.push(payload);
    }
    saveCustomActions(list);
    setActionModal(null);
    setActionForm({ name: "", description: "", type: "edge_function", payload: "" });
    toast.success(existing ? "Действието е обновено." : "Действието е добавено.");
  }

  function runAction(a: DevCustomAction) {
    setConfirmRun(a);
  }

  async function executeAction(a: DevCustomAction) {
    setRunning(true);
    try {
      if (a.type === "url") {
        window.open(a.payload || "#", "_blank");
        toast.success("Отворен линк в нов таб.");
      } else if (a.type === "edge_function") {
        const fnName = getValidEdgeFunctionName(a.payload, a.name || a.id);
        if (!fnName) {
          toast.error("Моля, въведи валидно име на Edge Function. Разрешени са букви, цифри, '-', '_'.");
          return;
        }

        const { error } = await supabase.functions.invoke(fnName, { body: { source: "dev_panel", action_id: a.id } });
        if (error) throw error;
        toast.success("Функцията е изпълнена.");
        const entry: DevHistoryEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          label: a.name,
          summary: `Edge function: ${fnName}`,
          revertData: { type: "edge_invoke", fn: fnName },
        };
        setActionHistory((h) => [entry, ...h]);
        saveActionHistory([entry, ...actionHistory]);
      } else {
        toast.info("Задачата е записана в История.");
        const entry: DevHistoryEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          label: a.name,
          summary: a.description || a.payload?.slice(0, 100) || "",
        };
        setActionHistory((h) => [entry, ...h]);
        saveActionHistory([entry, ...actionHistory]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Грешка при изпълнение");
    } finally {
      setRunning(false);
      setConfirmRun(null);
    }
  }

  function deleteAction(a: DevCustomAction) {
    saveCustomActions(customActions.filter((x) => x.id !== a.id));
    toast.success("Действието е изтрито.");
  }

  async function revertHistoryEntry(entry: DevHistoryEntry) {
    if (!entry.revertData) {
      toast.info("Няма записани данни за връщане за това действие.");
      return;
    }
    setHistoryReverting(entry.id);
    try {
      if ((entry.revertData as { type?: string }).type === "assistant_plan") {
        toast.success("Планът е отменен.");
      } else {
        toast.success("Действието е отменено от историята.");
      }
      setActionHistory((h) => h.filter((e) => e.id !== entry.id));
      await saveActionHistory(actionHistory.filter((e) => e.id !== entry.id));
    } finally {
      setHistoryReverting(null);
    }
  }

  const typeLabels: Record<DevCustomAction["type"], string> = {
    edge_function: "Edge Function",
    url: "URL",
    task: "Задача",
  };
  const typeColors: Record<DevCustomAction["type"], string> = {
    edge_function: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30",
    url: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    task: "bg-primary/15 text-primary border-primary/30",
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={32} className="animate-spin mb-4" />
        <p className="text-sm font-heading font-semibold">Зареждане...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* ─── ЛЯВ ПАНЕЛ: Промпт генератор ─── */}
      <div className="flex flex-col min-h-[420px]">
        <div className="rounded-2xl border border-neon-cyan/25 bg-gradient-to-b from-neon-cyan/10 to-transparent overflow-hidden shadow-lg shadow-neon-cyan/5 flex flex-col flex-1">
          <div className="px-5 py-4 border-b border-neon-cyan/20 bg-neon-cyan/10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-cyan/25 border border-neon-cyan/40">
              <Sparkles size={20} className="text-neon-cyan" />
            </div>
            <div>
              <h2 className="font-heading font-black text-sm tracking-widest uppercase text-neon-cyan">Промпт генератор</h2>
              <p className="text-[10px] text-muted-foreground font-body">Опиши действието → генерирай промпт → използвай за ново действие</p>
            </div>
          </div>
          <div className="p-5 flex flex-col flex-1 gap-4">
            <div>
              <label className="block text-xs font-heading font-bold uppercase text-muted-foreground mb-1.5">Какво трябва да прави действието?</label>
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Напр.: Синхронизирай стаф от Discord сървъра в админ панела"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-white/15 bg-white/5 text-sm text-foreground placeholder:text-muted-foreground focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 resize-none"
              />
            </div>
            <button
              type="button"
              onClick={generatePrompt}
              disabled={isStaffReadOnly || !promptInput.trim() || generateLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan font-heading font-bold text-sm hover:bg-neon-cyan/30 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {generateLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              Генерирай промпт
            </button>
            {generatedPrompt && (
              <>
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-heading font-bold uppercase text-muted-foreground">Генериран промпт (редактируем)</label>
                    <button
                      type="button"
                      onClick={() => setGeneratedPrompt("")}
                      className="flex items-center gap-1.5 py-1 px-2 rounded-lg border border-destructive/30 text-destructive text-[10px] font-heading font-bold hover:bg-destructive/10 transition-colors"
                      title="Изтрий промпта"
                      aria-label="Изтрий промпта"
                    >
                      <Trash2 size={12} />
                      Изтрий
                    </button>
                  </div>
                  <textarea
                    value={generatedPrompt}
                    onChange={(e) => setGeneratedPrompt(e.target.value)}
                    rows={5}
                    className="flex-1 min-h-[100px] w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-xs font-body text-foreground/90 placeholder:text-muted-foreground focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 resize-y"
                    placeholder="Редактирай текста тук преди да го използваш..."
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={copyPrompt}
                    className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/20 bg-white/5 text-muted-foreground text-xs font-heading font-semibold hover:bg-white/10 transition-colors"
                  >
                    <Copy size={14} />
                    Копирай
                  </button>
                  <button
                    type="button"
                    onClick={usePromptForNewAction}
                    disabled={isStaffReadOnly}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/20 border border-primary/40 text-primary text-xs font-heading font-bold hover:bg-primary/30 transition-colors disabled:opacity-50"
                  >
                    <FileText size={14} />
                    Вкарай като действие
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── ДЕСЕН ПАНЕЛ: Действия + История ─── */}
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-primary/25 bg-white/[0.02] overflow-hidden shadow-lg shadow-[0_6px_24px_rgba(16,185,129,0.12)] flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-primary/20 bg-primary/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/25 border border-primary/40">
                <ListTodo size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="font-heading font-black text-sm tracking-widest uppercase text-primary">Действия</h2>
                <p className="text-[10px] text-muted-foreground">{customActions.length} записа</p>
              </div>
            </div>
            {!isStaffReadOnly && (
              <button
                type="button"
                onClick={() => {
                  setActionForm({ name: "", description: "", type: "edge_function", payload: "" });
                  setActionModal({ id: "", name: "", description: "", type: "edge_function", payload: "" });
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/25 border border-primary/50 text-primary text-xs font-heading font-bold hover:bg-primary/35 transition-colors"
              >
                <Plus size={16} />
                Ново действие
              </button>
            )}
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-2 max-h-[280px]">
            {customActions.length === 0 ? (
              <div className="text-center py-8 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02]">
                <ListTodo size={32} className="text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-body">Няма действия</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Генерирай промпт отляво или добави ръчно</p>
              </div>
            ) : (
              customActions.map((a) => (
                <div
                  key={a.id}
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] hover:border-primary/25 p-3 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-bold text-foreground text-sm truncate">{a.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">{a.description || typeLabels[a.type]}</div>
                    <span className={`inline-block mt-1 text-[10px] font-heading font-bold px-2 py-0.5 rounded border ${typeColors[a.type]}`}>
                      {typeLabels[a.type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => runAction(a)}
                      disabled={isStaffReadOnly}
                      className="p-2 rounded-lg border border-neon-green/30 text-neon-green hover:bg-neon-green/10 transition-colors"
                      title="Стартирай"
                      aria-label="Стартирай"
                    >
                      <Play size={12} />
                    </button>
                    {!isStaffReadOnly && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setActionModal(a); setActionForm({ name: a.name, description: a.description, type: a.type, payload: a.payload }); }}
                          className="p-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                          title="Редактирай"
                          aria-label="Редактирай"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAction(a)}
                          className="p-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                          title="Изтрий"
                          aria-label="Изтрий"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* История */}
        <div className="rounded-2xl border border-amber-500/20 overflow-hidden shadow-lg flex-shrink-0">
          <button
            type="button"
            onClick={() => setSectionOpen((s) => ({ ...s, history: !s.history }))}
            className="w-full flex items-center justify-between px-5 py-3 bg-amber-500/10 border-b border-amber-500/15 hover:bg-amber-500/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History size={18} className="text-amber-500" />
              <span className="font-heading font-bold text-xs uppercase text-amber-500">История</span>
            </div>
            {sectionOpen.history ? <ChevronDown size={18} className="text-amber-500" /> : <ChevronRight size={18} className="text-amber-500" />}
          </button>
          {sectionOpen.history && (
            <div className="p-3 space-y-1 max-h-40 overflow-y-auto">
              {actionHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Няма записи</p>
              ) : (
                actionHistory.slice(0, 8).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg hover:bg-amber-500/5 border border-transparent hover:border-amber-500/10 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-heading font-bold text-foreground text-xs truncate">{entry.label}</div>
                      <div className="text-[10px] text-muted-foreground">{relativeTime(entry.timestamp)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => revertHistoryEntry(entry)}
                      disabled={isStaffReadOnly || historyReverting === entry.id}
                      className="shrink-0 px-2 py-1 rounded border border-amber-500/30 text-amber-500 text-[10px] font-heading font-bold hover:bg-amber-500/10 disabled:opacity-50"
                    >
                      {historyReverting === entry.id ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Добави/Редактирай действие */}
      {actionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/92 backdrop-blur-lg p-4" onClick={(e) => e.target === e.currentTarget && setActionModal(null)}>
          <div className="glass-strong border-2 border-primary/40 rounded-2xl max-w-lg w-full shadow-2xl shadow-[0_12px_40px_rgba(16,185,129,0.2)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/15 bg-primary/5">
              <h3 className="font-heading font-black text-lg uppercase text-primary tracking-wider">
                {actionModal.id ? "Редактирай действие" : "Ново действие"}
              </h3>
              <button type="button" aria-label="Затвори" onClick={() => setActionModal(null)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold uppercase text-muted-foreground mb-1.5">Име *</label>
                <input
                  value={actionForm.name}
                  onChange={(e) => setActionForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-sm focus:border-primary/50 focus:outline-none"
                  placeholder="Напр. Синхронизирай стаф"
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-bold uppercase text-muted-foreground mb-1.5">Описание</label>
                <textarea
                  value={actionForm.description}
                  onChange={(e) => setActionForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-sm resize-none focus:border-primary/50 focus:outline-none"
                  placeholder="За какво се използва"
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-bold uppercase text-muted-foreground mb-1.5">Тип</label>
                <select
                  aria-label="Тип действие"
                  value={actionForm.type}
                  onChange={(e) => setActionForm((f) => ({ ...f, type: e.target.value as DevCustomAction["type"] }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-sm focus:border-primary/50 focus:outline-none"
                >
                  <option value="edge_function">Edge Function</option>
                  <option value="url">URL (отвори линк)</option>
                  <option value="task">Задача</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-heading font-bold uppercase text-muted-foreground mb-1.5">
                  {actionForm.type === "url" ? "URL" : actionForm.type === "edge_function" ? "Име на функция" : "Описание"}
                </label>
                <textarea
                  value={actionForm.payload}
                  onChange={(e) => setActionForm((f) => ({ ...f, payload: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-sm resize-none focus:border-primary/50 focus:outline-none"
                  placeholder={actionForm.type === "url" ? "https://..." : actionForm.type === "edge_function" ? "sync-staff-from-discord" : "Текст"}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setActionModal(null)} className="flex-1 py-3 rounded-xl border border-white/15 text-muted-foreground font-heading font-semibold text-sm hover:bg-white/5">
                  Отказ
                </button>
                <button type="button" onClick={addOrUpdateAction} className="flex-1 py-3 rounded-xl bg-primary/20 text-primary border border-primary/40 font-heading font-bold text-sm hover:bg-primary/30 flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} />
                  Запази
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmRun && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/92 backdrop-blur-lg p-4" onClick={(e) => e.target === e.currentTarget && setConfirmRun(null)}>
          <div className="glass-strong border-2 border-neon-green/40 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-neon-green/20">
            <p className="text-sm text-muted-foreground mb-1">Стартиране на</p>
            <p className="font-heading font-bold text-lg text-neon-green mb-4">„{confirmRun.name}"</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmRun(null)} className="flex-1 py-3 rounded-xl border border-white/15 text-muted-foreground font-heading font-semibold text-sm hover:bg-white/5">
                Отказ
              </button>
              <button
                type="button"
                onClick={() => executeAction(confirmRun)}
                disabled={running}
                className="flex-1 py-3 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/40 font-heading font-bold text-sm flex items-center justify-center gap-2 hover:bg-neon-green/30 disabled:opacity-50"
              >
                {running ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                Стартирай
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
