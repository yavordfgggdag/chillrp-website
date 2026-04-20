import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, CheckCircle, XCircle, LogIn, LogOut, Eye, BarChart3, ShoppingBag, Euro, TrendingUp,
  Download, Users, Trash2, Search, UserCog, Crown, AlertTriangle, Plus, Edit2, X, Loader2, Upload,
  BookOpen, Settings, FileText, Activity, Cpu, LogIn as LogInIcon, MessageCircle, Send, CheckSquare, Square, Bookmark, LayoutDashboard, PanelLeftClose, Package
} from "lucide-react";
import DeveloperPanel from "@/components/DeveloperPanel";
import DiscordBrandIcon from "@/components/DiscordBrandIcon";
import { toast } from "sonner";
import { getDiscordOAuthSignInOptions } from "@/lib/discordOAuth";
import { isSupabaseConfiguredForAuth } from "@/lib/supabaseSiteUrl";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { applyPurchaseTemplate } from "@/lib/purchaseTemplates";
import { shopSeedProducts } from "@/lib/shopSeedProducts";
import { slugifyProductSlug } from "@/lib/productSlug";
import {
  assertImageFileForUpload,
  assertFileAllowedForUpload,
  resolveUploadMimeType,
  getMaxUploadSizeMb,
} from "@/lib/db/mediaAssets";
import { normalizeStoragePublicUrl } from "@/lib/normalizeStorageUrl";
import { SERVER_RULES } from "@/lib/server-rules";
import { DISCORD_RULES } from "@/lib/discord-rules";
import { CHILLRP_POLICE_DISCORD_ROLE_ID } from "@/lib/discordConstants";
import { areGangApplicationsOpen } from "@/lib/gangApplicationsSettings";
import { DISCORD_INVITE } from "@/lib/config";

type Application = {
  id: string; name: string; gang_type: string; leader: string; members: string;
  goal: string; history: string; rules: string; rp_examples: string;
  status: string; admin_note: string | null; discord_username: string | null;
  submitted_at: string; reviewed_at: string | null;
};

type Purchase = {
  id: string; product_name: string; category: string | null;
  price_eur: number | null; discord_username: string | null;
  stripe_session_id: string | null; created_at: string; user_id: string | null;
};

type PendingRevolutPayment = {
  id: string;
  reference: string;
  user_id: string;
  discord_username: string | null;
  amount_eur: number;
  summary: string;
  status: string;
  created_at: string;
  items_json?: unknown;
  payment_method?: string | null;
  transfer_note_full?: string | null;
};

type ShopTicketCheckout = {
  id: string;
  ticket_code: string;
  user_id: string;
  discord_username: string | null;
  product_slug: string;
  product_name: string;
  amount_display: string;
  status: string;
  created_at: string;
  paid_at: string | null;
};

type SmsDepositRequest = {
  id: string;
  user_id: string;
  tier_id: string;
  entered_code: string;
  status: string;
  created_at: string;
  credited_cents?: number | null;
  minecraft_username?: string | null;
};

type McJsonApplication = {
  id: string;
  user_id: string | null;
  status: string;
  submitted_at: string;
  answers: Record<string, unknown> | null;
  admin_note?: string | null;
};

type Profile = {
  id: string;
  username: string | null;
  created_at: string | null;
  discord_username?: string | null;
  discord_id?: string | null;
  /** Попълва се от send-discord-dm-admin при Discord 50007 — скрива се от списъка „достъпни“. */
  discord_dm_blocked_at?: string | null;
};

type UserRole = {
  id: string; user_id: string; role: "admin" | "moderator";
};

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  image_url: string | null;
  product_media_urls?: string[] | null;
  price: string;
  original_price: string;
  description: string;
  long_description: string;
  includes: string[];
  badge: string | null;
  category: string;
  stripe_price: string | null;
  opcrime_gc_amount?: number | null;
  opcrime_use_redeem_code?: boolean | null;
  opcrime_org_money_amount?: number | null;
  opcrime_org_money_account?: string | null;
  ingame_grants_json?: unknown;
  ingame_player_hint?: string | null;
  transfer_note_template?: string | null;
  discord_purchase_dm_template?: string | null;
  sort_order: number;
  is_active: boolean;
};

type RuleSection = {
  id: string; page: string; emoji: string; title: string; color: string;
  items: string[]; note: string | null; sort_order: number; is_active: boolean;
};

type SiteSetting = {
  id: string; key: string; value: string; description: string | null;
};

type TopProduct = { name: string; count: number; revenue: number };
type DayRevenue = { date: string; revenue: number; count: number };

const CATEGORY_OPTIONS = ["vip", "donor", "cosmetics", "keys", "kits", "perks", "bundles", "seasonal", "other"] as const;
const RULE_COLOR_OPTIONS = ["red", "cyan", "yellow", "accent", "green"];
const RULE_PAGE_OPTIONS = [
  { value: "discord", label: "Discord" },
  { value: "server", label: "Сървър" },
];
const GANG_TYPE_OPTIONS = [
  "PvP / Raid",
  "Builder / Base",
  "Търговци / Икономика",
  "Roleplay / Lore",
  "Смесена",
  "Друго",
];

/** Всички ключове за site_settings, използвани по сайта (начална, банер). При „Добави липсващи“ се вмъкват само тези, които липсват. */
const DEFAULT_SITE_SETTINGS: { key: string; value: string; description: string }[] = [
  { key: "site_logo_url", value: "", description: "URL на лого (ако е празно се ползва вграденото). Качи от таб Настройки → Branding." },
  { key: "site_banner_url", value: "", description: "URL на hero банер (ако е празно се ползва вграденият). Качи от таб Настройки → Branding." },
  { key: "discord_invite", value: DISCORD_INVITE, description: "Линк за покана Discord (начална, банер, бот)" },
  { key: "minecraft_server_address", value: "play.example.net", description: "Java сървър IP/домейн (банер, начална, floating бутон)" },
  { key: "minecraft_version", value: "1.21+", description: "Текст за версия на началната страница" },
  { key: "fivem_cfx_join_url", value: "", description: "Legacy FiveM CFX (не се ползва в Minecraft UI; остави празно)" },
  { key: "launch_date", value: "2026-03-27T20:00:00+02:00", description: "Дата и час на откриване (банер обратно броене, TLR бот)" },
  { key: "trailer_date", value: "скоро — точна дата ще бъде в Discord и на сайта", description: "Текст за трейлър (TLR бот / настройки)" },
  { key: "chillbot_extra", value: "", description: "TLR RP бот (чат): допълнителни факти — редактираш тук в Настройки, ботът ги ползва при следващ чат" },
  { key: "announcement_text_before", value: "⚡ 50% НАМАЛЕНИЕ ПРЕДИ СТАРТА", description: "Текст в банера преди старт" },
  { key: "announcement_text_live", value: "🟢 СЪРВЪРЪТ Е ПУСНАТ — ВЛЕЗ СЕГА!", description: "Текст в банера след старт" },
  { key: "hero_title_1", value: "Не е просто", description: "Hero заглавие ред 1" },
  { key: "hero_title_2", value: "игра.", description: "Hero заглавие ред 2" },
  { key: "hero_title_3", value: "Това е", description: "Hero заглавие ред 3" },
  { key: "hero_title_4", value: "живот.", description: "Hero заглавие ред 4" },
  { key: "hero_subtitle", value: "Сървър създаден от 0 лата — скриптове, каквито не сте виждали никъде другаде.", description: "Hero подзаглавие" },
  { key: "hero_sub_text", value: "Влез сега → получи роля → бъди на стартовата линия.", description: "Hero доп. текст" },
  { key: "hero_cta_text", value: "🎮 Влез в Discord сега", description: "Hero бутон" },
  { key: "story_title_1", value: "Всеки влиза", description: "Секция История заглавие 1" },
  { key: "story_title_2", value: "като нищо.", description: "Секция История заглавие 2" },
  { key: "story_title_3", value: "Малцина", description: "Секция История заглавие 3" },
  { key: "story_title_4", value: "стават легенди.", description: "Секция История заглавие 4" },
  { key: "story_desc_1", value: "В TLR не се раждаш с власт. Изграждаш я. Чрез решения, съюзи и истории, които другите помнят.", description: "Секция История параграф 1" },
  { key: "story_desc_2", value: "Всеки разговор има смисъл. Всяка сделка може да те издигне или унищожи.", description: "Секция История параграф 2" },
  { key: "sneak_peek_badge", value: "Sneak Peek", description: "Етикет над секцията (начална страница)" },
  { key: "sneak_peek_title_1", value: "Първи", description: "Sneak peek заглавие ред 1" },
  { key: "sneak_peek_title_2", value: "поглед.", description: "Sneak peek заглавие ред 2" },
  { key: "sneak_peek_desc", value: "Кадри директно от TLR — вградени в сайта.", description: "Sneak peek кратко описание" },
  {
    key: "sneak_peek_urls",
    value: "",
    description:
      "Sneak peek YouTube линкове за началната страница — по един на ред (watch, Shorts, youtu.be). Допълва HOME_SNEAK_PEEK_VIDEO_URLS в кода и VITE_HOME_SNEAK_PEEK_URLS.",
  },
  { key: "gang_title_1", value: "Искаш", description: "Секция Генг заглавие 1" },
  { key: "gang_title_2", value: "властта?", description: "Секция Генг заглавие 2" },
  { key: "gang_title_3", value: "Спечели я.", description: "Секция Генг заглавие 3" },
  { key: "gang_desc", value: "Организацията не се купува — заслужава се. Оригинална концепция, активен RP, максимум 6 члена.", description: "Секция Генг описание" },
  { key: "gang_applications_open", value: "true", description: "FREE GANG /gangs: true = приемаме кандидатури; false = формата е затворена (слотовете заети)." },
  { key: "gang_applications_closed_message", value: "", description: "Опционален текст на /gangs при затворени кандидатури (празно = стандартно съобщение + Discord)." },
  { key: "dev_custom_actions", value: "[]", description: "Developer Panel: персонализирани действия (JSON масив)" },
  { key: "dev_action_history", value: "[]", description: "Developer Panel: история за връщане назад (JSON масив)" },
];

type TabId = "apps" | "stats" | "users" | "products" | "rules" | "settings" | "logs" | "messages" | "developer";

// Стабилни компоненти за полета — извън AdminPanel, за да не се пресъздават при ререндер и да не губят фокус
function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 rounded-xl glass border border-border focus:border-primary/50 focus:outline-none text-sm font-body text-foreground placeholder:text-muted-foreground bg-transparent" />
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, required, type = "text" }: { label: string; value: string | number; onChange: (v: string | number) => void; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">{label}{required && " *"}</label>
      <input type={type} value={value} onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder} className="w-full px-3 py-2 rounded-xl glass border border-border focus:border-primary/50 focus:outline-none text-sm font-body text-foreground bg-transparent" />
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full px-3 py-2 rounded-xl glass border border-border focus:border-primary/50 focus:outline-none text-sm font-body text-foreground bg-transparent resize-none" />
    </div>
  );
}

export default function AdminPanelFull() {
  const [session, setSession] = useState<Session | null>(null);
  const [discordLoginLoading, setDiscordLoginLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabId>("apps");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [siteRole, setSiteRole] = useState<"citizen" | "staff" | "administrator" | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [roleCheckError, setRoleCheckError] = useState<string | null>(null);
  const checkRoleInProgress = useRef(false);
  const isAdmin = siteRole === "staff" || siteRole === "administrator";
  const isStaffReadOnly = false; // Всички с достъп до админ панела могат да редактират

  const [apps, setApps] = useState<Application[]>([]);
  const [selected, setSelected] = useState<Application | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // Gang edit
  const [gangEditModal, setGangEditModal] = useState<Application | null>(null);
  const [gangEditForm, setGangEditForm] = useState({ name: "", gang_type: "", leader: "", members: "", goal: "", history: "", rules: "", rp_examples: "", discord_username: "", status: "pending", admin_note: "" });
  const [gangEditSaving, setGangEditSaving] = useState(false);

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [pendingRevolut, setPendingRevolut] = useState<PendingRevolutPayment[]>([]);
  const [shopTicketCheckouts, setShopTicketCheckouts] = useState<ShopTicketCheckout[]>([]);
  const [shopTicketFilter, setShopTicketFilter] = useState<"pending" | "all">("pending");
  const [smsDeposits, setSmsDeposits] = useState<SmsDepositRequest[]>([]);
  const [builderApps, setBuilderApps] = useState<McJsonApplication[]>([]);
  const [helperApps, setHelperApps] = useState<McJsonApplication[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Products
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [productModal, setProductModal] = useState<DbProduct | null>(null);
  const [productSyncLoading, setProductSyncLoading] = useState(false);
  const [productForm, setProductForm] = useState({
    slug: "",
    name: "",
    subtitle: "",
    price: "",
    original_price: "",
    description: "",
    long_description: "",
    includes: "",
    badge: "",
    category: "other",
    stripe_price: "",
    sort_order: 0,
    is_active: true,
    product_media_urls: "",
    opcrime_gc_amount: "",
    opcrime_use_redeem_code: false,
    opcrime_org_money_amount: "",
    opcrime_org_money_account: "",
    ingame_grants_json: "",
    ingame_player_hint: "",
    transfer_note_template: "",
    discord_purchase_dm_template: "",
  });
  const [productSaving, setProductSaving] = useState(false);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productGalleryUploading, setProductGalleryUploading] = useState(false);
  const [productAdvancedOpen, setProductAdvancedOpen] = useState(false);

  // Rules
  const [ruleSections, setRuleSections] = useState<RuleSection[]>([]);
  const [ruleModal, setRuleModal] = useState<RuleSection | null>(null);
  const [ruleForm, setRuleForm] = useState({ page: "discord", emoji: "", title: "", color: "accent", items: "", note: "", sort_order: 0, is_active: true });
  const [ruleSaving, setRuleSaving] = useState(false);
  const [rulePageFilter, setRulePageFilter] = useState<string>("all");

  // Site Settings
  const [siteSettings, setSiteSettings] = useState<SiteSetting[]>([]);
  const [settingModal, setSettingModal] = useState<SiteSetting | null>(null);
  const [settingForm, setSettingForm] = useState({ key: "", value: "", description: "" });
  const [settingSaving, setSettingSaving] = useState(false);
  const [settingsSeedLoading, setSettingsSeedLoading] = useState(false);
  const [brandingLogoFile, setBrandingLogoFile] = useState<File | null>(null);
  const [brandingBannerFile, setBrandingBannerFile] = useState<File | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);

  // Search states
  const [searchApps, setSearchApps] = useState("");
  const [searchUsers, setSearchUsers] = useState("");
  const [searchPurchases, setSearchPurchases] = useState("");
  const [searchProducts, setSearchProducts] = useState("");
  const [searchRules, setSearchRules] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: string } | null>(null);

  // Web logs (всички действия по сайта)
  type WebLogRow = { id: string; event: string; details: string; page: string; user_id: string | null; user_email: string | null; module: string | null; created_at: string };
  const [webLogs, setWebLogs] = useState<WebLogRow[]>([]);
  const [webLogsCount, setWebLogsCount] = useState<number>(0);
  const [webLogsLoading, setWebLogsLoading] = useState(false);
  const webLogsTableMissingRef = useRef(false);
  const pendingRevolutTableMissingRef = useRef(false);
  const shopTicketTableMissingRef = useRef(false);
  const [logsModuleFilter, setLogsModuleFilter] = useState<string>("all");
  const [searchLogs, setSearchLogs] = useState("");

  // Аналитика: период и логове за статистики
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 10);
  });
  const [analyticsDateTo, setAnalyticsDateTo] = useState(() => {
    const d = new Date(); return d.toISOString().slice(0, 10);
  });
  const [analyticsLogs, setAnalyticsLogs] = useState<WebLogRow[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Съобщения (Discord DM от админ)
  type DmGroup = { id: string; name: string; profileIds: string[]; discordRoleId?: string };
  const [dmGroups, setDmGroups] = useState<DmGroup[]>([]);
  const [messageSelectedIds, setMessageSelectedIds] = useState<Set<string>>(new Set());
  const [discordIdsFromRole, setDiscordIdsFromRole] = useState<string[]>([]);
  const [policeRoleListLoading, setPoliceRoleListLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [messageLastResult, setMessageLastResult] = useState<{ sent: number; failed: number } | null>(null);
  const [dmGroupSaveModal, setDmGroupSaveModal] = useState(false);
  const [dmGroupSaveName, setDmGroupSaveName] = useState("");
  const [searchMessages, setSearchMessages] = useState("");

  /** Vite dev = true на всеки host (вкл. 192.168.x при npm run dev); плюс localhost / override. */
  const isLocalhostOrDev =
    import.meta.env.DEV ||
    import.meta.env.VITE_LOCAL_ADMIN_BYPASS === "true" ||
    (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(window.location.origin)));

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      if (isLocalhostOrDev) {
        // В dev/localhost не разчитаме на Edge функцията – пускаме всеки влязъл като админ.
        setSiteRole("administrator");
        setRoleChecked(true);
        setRoleCheckError(null);
      } else {
        checkSiteRole();
      }
    } else {
      setSiteRole(null);
      setRoleChecked(false);
    }
  }, [session]);

  useEffect(() => {
    if (session && isAdmin) {
      fetchPurchases(); fetchPendingRevolut(); fetchShopTicketCheckouts(); fetchProfiles(); fetchUserRoles(); void fetchProducts();
      fetchRules(); fetchSettings();
      supabase.from("web_logs").select("id", { count: "exact", head: true }).then(({ count }) => setWebLogsCount(count ?? 0)).catch(() => setWebLogsCount(0));
    }
  }, [session, isAdmin]);

  useEffect(() => {
    if (session && isAdmin) fetchApps();
  }, [session, isAdmin, filter]);

  useEffect(() => {
    if (!session || !isAdmin || tab !== "apps") return;
    void (async () => {
      const [sms, b, h] = await Promise.all([
        supabase.from("sms_deposit_requests").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("builder_applications").select("*").order("submitted_at", { ascending: false }).limit(100),
        supabase.from("helper_applications").select("*").order("submitted_at", { ascending: false }).limit(100),
      ]);
      if (sms.data) setSmsDeposits(sms.data as SmsDepositRequest[]);
      if (b.data) setBuilderApps(b.data as McJsonApplication[]);
      if (h.data) setHelperApps(h.data as McJsonApplication[]);
    })();
  }, [session, isAdmin, tab]);

  useEffect(() => {
    if (session && isAdmin && tab === "logs" && !webLogsTableMissingRef.current) fetchWebLogs();
  }, [session, isAdmin, tab]);

  useEffect(() => {
    if (session && isAdmin && tab === "stats") fetchWebLogsForAnalytics();
  }, [session, isAdmin, tab, analyticsDateFrom, analyticsDateTo]);

  useEffect(() => {
    if (!session || !isAdmin || tab !== "messages") return;
    supabase.from("site_settings").select("value").eq("key", "dm_groups").maybeSingle().then(({ data }) => {
      try {
        const raw = (data as { value?: string } | null)?.value;
        const arr = raw ? JSON.parse(raw) : [];
        setDmGroups(Array.isArray(arr) ? arr : []);
      } catch {
        setDmGroups([]);
      }
    }).catch(() => setDmGroups([]));
  }, [session, isAdmin, tab]);

  useEffect(() => {
    if (session && isAdmin && tab === "products") void fetchProducts();
  }, [session, isAdmin, tab]);

  // Правила: при отваряне на таба ако няма данни – зареди автоматично стандартните
  useEffect(() => {
    if (!session || !isAdmin || isStaffReadOnly) return;
    if (tab === "rules") {
      fetchRules().then((count) => { if (count === 0) seedRules(); });
    }
  }, [session, isAdmin, tab]);

  // ── Admin log helper ──
  async function logAdminAction(action: string, details: string) {
    const account = session?.user?.email || session?.user?.user_metadata?.full_name || "неизвестен";
    const detailsWithAccount = `${details} | Акаунт: ${account}`;
    if (isLocalhostOrDev) return;
    try {
      await supabase.functions.invoke("notify-admin-log", {
        body: { action, details: detailsWithAccount, admin_email: account },
      });
    } catch {
      /* CORS or network – ignore on localhost */
    }
  }

  async function checkSiteRole() {
    if (!session?.access_token) return;
    if (checkRoleInProgress.current) return;
    checkRoleInProgress.current = true;
    setRoleChecked(false);
    setRoleCheckError(null);
    try {
      const runCheck = async (retry = false): Promise<{ role: string | null; errCode: string } | null> => {
        const { data: refreshData } = await supabase.auth.refreshSession();
        const token = refreshData.session?.access_token ?? session.access_token;
        if (!token) return { role: null, errCode: "invalid_session" };
        const { data, error } = await supabase.functions.invoke("check-site-role", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (error) console.error("[AdminPanel] check-site-role invoke error:", error);
        const role = data?.role ?? null;
        const errCode =
          data?.error ??
          (typeof (error as { message?: string })?.message === "string" && (error as { message: string }).message.includes("non-2xx")
            ? "invalid_session"
            : null) ??
          (error?.message ? String((error as { message: string }).message) : null) ??
          (error ? "request_failed" : null) ??
          "unknown";
        return { role, errCode };
      };

      let result = await runCheck();
      if (result?.errCode === "invalid_session" && !result?.role) {
        await new Promise((r) => setTimeout(r, 300));
        result = await runCheck(true);
      }

      if (result) {
        const { role, errCode } = result;
        if (role && role !== "citizen") {
          setSiteRole(role as "citizen" | "staff" | "administrator");
          setRoleCheckError(role === "citizen" ? errCode : null);
        } else {
          setSiteRole("citizen");
          setRoleCheckError(errCode);
        }
      }
    } catch (e) {
      console.error("[AdminPanel] checkSiteRole catch:", e);
      setSiteRole("citizen");
      setRoleCheckError("network");
    } finally {
      checkRoleInProgress.current = false;
      setRoleChecked(true);
    }
  }

  async function fetchApps() {
    let q = supabase.from("gang_applications").select("*").order("submitted_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    if (data) setApps(data as Application[]);
  }

  async function reloadMcAdminLists() {
    const [sms, b, h] = await Promise.all([
      supabase.from("sms_deposit_requests").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("builder_applications").select("*").order("submitted_at", { ascending: false }).limit(100),
      supabase.from("helper_applications").select("*").order("submitted_at", { ascending: false }).limit(100),
    ]);
    if (sms.data) setSmsDeposits(sms.data as SmsDepositRequest[]);
    if (b.data) setBuilderApps(b.data as McJsonApplication[]);
    if (h.data) setHelperApps(h.data as McJsonApplication[]);
  }

  async function approveSmsRequest(id: string) {
    const { data, error } = await supabase.rpc("approve_sms_deposit_request", { p_request_id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    const j = data as { ok?: boolean; error?: string };
    if (!j?.ok) {
      toast.error(j?.error || "Неуспех");
      return;
    }
    toast.success("Одобрено и кредитирано.");
    await reloadMcAdminLists();
  }

  async function rejectSmsRequest(id: string) {
    const { data, error } = await supabase.rpc("reject_sms_deposit_request", { p_request_id: id, p_note: null });
    if (error) {
      toast.error(error.message);
      return;
    }
    const j = data as { ok?: boolean; error?: string };
    if (!j?.ok) {
      toast.error(j?.error || "Неуспех");
      return;
    }
    toast.success("Отхвърлено.");
    await reloadMcAdminLists();
  }

  async function updateMcAppStatus(
    table: "builder_applications" | "helper_applications",
    id: string,
    status: string,
  ) {
    const { error } = await supabase.from(table).update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Статус обновен.");
    await reloadMcAdminLists();
  }

  async function fetchPurchases() {
    setStatsLoading(true);
    const { data } = await supabase.from("purchases").select("*").order("created_at", { ascending: false });
    if (data) setPurchases(data as Purchase[]);
    setStatsLoading(false);
  }

  async function fetchPendingRevolut() {
    if (pendingRevolutTableMissingRef.current) {
      setPendingRevolut([]);
      return;
    }
    const { data, error } = await supabase
      .from("pending_revolut_payments")
      .select("id,reference,user_id,discord_username,amount_eur,summary,status,created_at")
      .eq("status", "awaiting_transfer")
      .order("created_at", { ascending: false });
    if (error) {
      const errAny = error as { message?: string; details?: string; hint?: string; code?: string };
      const raw = [errAny.message, errAny.details, errAny.hint].filter(Boolean).join(" ");
      const missing =
        errAny.code === "PGRST205" ||
        /could not find the table/i.test(raw) ||
        (/schema cache/i.test(raw) && /pending_revolut/i.test(raw));
      if (missing) {
        setPendingRevolut([]);
        pendingRevolutTableMissingRef.current = true;
        toast.info(
          "Таблицата pending_revolut_payments липсва в базата. Изпълни веднъж supabase/RUN_THIS_revolut_pending_payments.sql в SQL Editor, после презареди страницата.",
          { id: "pending-revolut-table-missing" }
        );
        return;
      }
      console.warn("pending_revolut_payments:", raw || error.message);
      setPendingRevolut([]);
      return;
    }
    pendingRevolutTableMissingRef.current = false;
    setPendingRevolut((data as PendingRevolutPayment[]) ?? []);
  }

  function parsePendingItemSlugs(itemsJson: unknown): string[] {
    if (!Array.isArray(itemsJson)) return [];
    const out: string[] = [];
    for (const x of itemsJson) {
      if (x && typeof x === "object" && "slug" in x) {
        const s = String((x as { slug?: string }).slug || "").trim();
        if (s) out.push(s);
      }
    }
    return [...new Set(out)];
  }

  async function markRevolutPaymentDone(id: string) {
    const row = pendingRevolut.find((r) => r.id === id);
    const { error } = await supabase.from("pending_revolut_payments").update({ status: "completed" }).eq("id", id);
    if (error) {
      toast.error("Грешка: " + error.message);
      return;
    }

    if (row?.discord_username?.trim()) {
      const slugs = parsePendingItemSlugs(row.items_json);
      let purchase_dm_description_override: string | null = null;
      let ingame_instruction: string | null = null;

      if (slugs.length > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("slug, name, discord_purchase_dm_template, ingame_player_hint")
          .in("slug", slugs);
        const pmap = new Map((prods || []).map((p) => [p.slug as string, p]));

        const hintLines: string[] = [];
        const seenHints = new Set<string>();
        for (const s of slugs) {
          const h = (pmap.get(s)?.ingame_player_hint as string | null | undefined)?.trim();
          if (h && !seenHints.has(h)) {
            seenHints.add(h);
            hintLines.push(h);
          }
        }
        ingame_instruction = hintLines.length ? hintLines.join("\n\n") : null;

        const dmVars: Record<string, string> = {
          product_name: row.summary.slice(0, 500),
          product_summary: row.summary,
          total_eur: Number(row.amount_eur).toFixed(2),
          discord_username: row.discord_username.trim(),
          redeem_code: "",
          price: `${Number(row.amount_eur).toFixed(2)} EUR`,
          category: "—",
          ingame_instruction: ingame_instruction || "",
          auto_gc_note: "",
          reference: row.reference,
        };
        const parts: string[] = [];
        for (const s of [...new Set(slugs)]) {
          const p = pmap.get(s);
          const t = (p?.discord_purchase_dm_template as string | null | undefined)?.trim();
          if (!t) continue;
          const name = (p?.name as string | undefined)?.trim() || s;
          parts.push(applyPurchaseTemplate(t, { ...dmVars, product_name: name }));
        }
        if (parts.length) purchase_dm_description_override = parts.join("\n\n────────\n\n");
      }

      const { error: invErr } = await supabase.functions.invoke("notify-discord-purchase", {
        body: {
          discord_username: row.discord_username.trim(),
          product_name: row.summary.slice(0, 250),
          price: Number(row.amount_eur),
          category: "—",
          redeem_code: null,
          ingame_instruction,
          auto_gc_note: null,
          needs_manual_staff: !purchase_dm_description_override && !ingame_instruction,
          purchase_dm_description_override,
        },
      });
      if (invErr) console.warn("notify-discord-purchase (ръчно плащане):", invErr);
    }

    toast.success("Маркирано като получено");
    await fetchPendingRevolut();
    logAdminAction("revolut_payment_confirmed", `Превод/PayPal поръчка ${id}`);
  }

  async function fetchShopTicketCheckouts() {
    if (shopTicketTableMissingRef.current) {
      setShopTicketCheckouts([]);
      return;
    }
    const { data, error } = await supabase
      .from("shop_ticket_checkouts")
      .select("id,ticket_code,user_id,discord_username,product_slug,product_name,amount_display,status,created_at,paid_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      const errAny = error as { message?: string; details?: string; hint?: string; code?: string };
      const raw = [errAny.message, errAny.details, errAny.hint].filter(Boolean).join(" ");
      const missing =
        errAny.code === "PGRST205" ||
        /could not find the table/i.test(raw) ||
        (/schema cache/i.test(raw) && /shop_ticket/i.test(raw));
      if (missing) {
        setShopTicketCheckouts([]);
        shopTicketTableMissingRef.current = true;
        return;
      }
      console.warn("shop_ticket_checkouts:", raw || error.message);
      setShopTicketCheckouts([]);
      return;
    }
    shopTicketTableMissingRef.current = false;
    setShopTicketCheckouts((data as ShopTicketCheckout[]) ?? []);
  }

  async function markShopTicketPaid(id: string) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("shop_ticket_checkouts")
      .update({ status: "paid", paid_at: now, updated_at: now })
      .eq("id", id);
    if (error) {
      toast.error("Грешка: " + error.message);
      return;
    }
    toast.success("Маркирано като платено");
    await fetchShopTicketCheckouts();
    logAdminAction("shop_ticket_paid", `Тикет поръчка ${id}`);
  }

  async function markShopTicketCancelled(id: string) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("shop_ticket_checkouts")
      .update({ status: "cancelled", updated_at: now })
      .eq("id", id);
    if (error) {
      toast.error("Грешка: " + error.message);
      return;
    }
    toast.success("Поръчката е отказана");
    await fetchShopTicketCheckouts();
    logAdminAction("shop_ticket_cancelled", `Тикет поръчка ${id}`);
  }

  async function fetchProfiles() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) setProfiles(data as Profile[]);
  }

  async function fetchUserRoles() {
    const { data } = await supabase.from("user_roles").select("*");
    if (data) setUserRoles(data as UserRole[]);
  }

  async function fetchProducts() {
    const { data, error } = await supabase.from("products").select("*").order("sort_order", { ascending: true });
    if (error) {
      console.error("fetchProducts", error);
      toast.error("Грешка при зареждане на продукти: " + error.message);
      return;
    }
    setDbProducts((data || []) as DbProduct[]);
  }

  async function fetchRules(): Promise<number> {
    const { data, error } = await supabase.from("rule_sections").select("*").order("sort_order", { ascending: true });
    if (error) {
      if (error.code !== "42501" && error.code !== "PGRST301") toast.error("Грешка при зареждане на правила: " + error.message);
      setRuleSections([]);
      return 0;
    }
    const list = (data || []) as RuleSection[];
    setRuleSections(list);
    return list.length;
  }

  async function fetchSettings() {
    const { data, error } = await supabase.from("site_settings").select("*").order("key", { ascending: true });
    if (error) {
      console.error("fetchSettings", error);
      toast.error("Грешка при зареждане на настройки: " + error.message);
      return;
    }
    setSiteSettings((data || []) as SiteSetting[]);
  }

  async function fetchWebLogs() {
    setWebLogsLoading(true);
    webLogsTableMissingRef.current = false;
    const { data, error } = await supabase
      .from("web_logs")
      .select("id, event, details, page, user_id, user_email, module, created_at")
      .order("created_at", { ascending: false })
      .limit(2500);
    if (error) {
      const tableMissing =
        error.code === "PGRST205" ||
        (typeof error.code === "string" && error.code.includes("205")) ||
        (error.message && (error.message.includes("Could not find the table") || (error.message.includes("web_logs") && error.message.includes("schema cache"))));
      if (tableMissing) {
        webLogsTableMissingRef.current = true;
        setWebLogs([]);
        toast.info("Таблицата web_logs липсва. Пусни RUN_THIS_web_logs.sql в Supabase → SQL Editor.");
      } else {
        console.error("fetchWebLogs", error);
        toast.error("Грешка при зареждане на логове: " + error.message);
        setWebLogs([]);
      }
    } else {
      const list = (data || []) as WebLogRow[];
      setWebLogs(list);
      setWebLogsCount(list.length);
    }
    setWebLogsLoading(false);
  }

  async function fetchWebLogsForAnalytics() {
    setAnalyticsLoading(true);
    const fromISO = `${analyticsDateFrom}T00:00:00.000Z`;
    const toISO = `${analyticsDateTo}T23:59:59.999Z`;
    const { data, error } = await supabase
      .from("web_logs")
      .select("id, event, details, page, user_id, user_email, module, created_at")
      .gte("created_at", fromISO)
      .lte("created_at", toISO)
      .order("created_at", { ascending: true });
    if (error) {
      if (error.message && (error.message.includes("Could not find the table") || error.message.includes("web_logs"))) {
        toast.info("Таблицата web_logs липсва. Пусни RUN_THIS_web_logs.sql в Supabase.");
      } else {
        toast.error("Грешка при зареждане на аналитика: " + error.message);
      }
      setAnalyticsLogs([]);
    } else {
      setAnalyticsLogs((data || []) as WebLogRow[]);
    }
    setAnalyticsLoading(false);
  }

  const profilesWithDiscordId = useMemo(() => profiles.filter((p) => p.discord_id), [profiles]);

  /** Потребители с Discord ID, които не са маркирани като „спрели DM към бота“. */
  const profilesReachableForDm = useMemo(
    () => profiles.filter((p) => p.discord_id && !p.discord_dm_blocked_at),
    [profiles],
  );

  const blockedDiscordIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of profiles) {
      if (p.discord_id && p.discord_dm_blocked_at) s.add(p.discord_id);
    }
    return s;
  }, [profiles]);

  const discordIdsFromRoleReachable = useMemo(
    () => discordIdsFromRole.filter((id) => !blockedDiscordIds.has(id)),
    [discordIdsFromRole, blockedDiscordIds],
  );

  const profilesDmBlockedCount = useMemo(
    () => profiles.filter((p) => p.discord_id && p.discord_dm_blocked_at).length,
    [profiles],
  );

  useEffect(() => {
    const reachableIds = new Set(profilesReachableForDm.map((p) => p.id));
    setMessageSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (reachableIds.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [profilesReachableForDm]);

  async function fetchPoliceDiscordRecipients(
    roleId: string = CHILLRP_POLICE_DISCORD_ROLE_ID,
    opts?: { silent?: boolean }
  ) {
    setPoliceRoleListLoading(true);
    try {
      await supabase.auth.refreshSession();
      let ids: string[] = [];
      // Dev: Vite proxy към Supabase (same-origin) — избягва CORS preflight от localhost към *.supabase.co
      if (import.meta.env.DEV && typeof window !== "undefined") {
        const anon =
          import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
        const { data: sess } = await supabase.auth.getSession();
        const bearer = sess.session?.access_token ?? anon;
        const res = await fetch(`${window.location.origin}/__sb-fn/list-discord-role-members`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(anon ? { apikey: anon } : {}),
            Authorization: `Bearer ${bearer}`,
          },
          body: JSON.stringify({ role_id: roleId }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          discord_user_ids?: string[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        ids = json.discord_user_ids ?? [];
      } else {
        const { data, error } = await supabase.functions.invoke("list-discord-role-members", {
          body: { role_id: roleId },
        });
        if (error) throw error;
        ids = (data?.discord_user_ids as string[] | undefined) ?? [];
      }
      setDiscordIdsFromRole(ids);
      if (!opts?.silent) {
        toast.success(`Заредени ${ids.length} потребителя с тази Discord роля.`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const looksLikeNetworkOrCors =
        msg.includes("Failed to send a request") ||
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("FunctionsFetchError");
      const looksLikeMissingFn = /HTTP 404|not found|NOT_FOUND/i.test(msg);
      if (looksLikeNetworkOrCors) {
        toast.error(
          "Edge функцията list-discord-role-members не отговаря (често: не е деплойната или CORS/preflight). Деплой: npx --yes supabase@latest functions deploy list-discord-role-members — и в config.toml е verify_jwt = false."
        );
      } else if (looksLikeMissingFn) {
        toast.error(
          "list-discord-role-members липсва или връща 404. Деплой: npx --yes supabase@latest functions deploy list-discord-role-members"
        );
      } else {
        toast.error(msg || "Грешка при зареждане от Discord");
      }
      setDiscordIdsFromRole([]);
    } finally {
      setPoliceRoleListLoading(false);
    }
  }

  async function savePoliceDiscordGroupPreset() {
    const name = "Discord роля (preset)";
    const filtered = dmGroups.filter((g) => g.discordRoleId !== CHILLRP_POLICE_DISCORD_ROLE_ID);
    const newGroup: DmGroup = {
      id: crypto.randomUUID(),
      name,
      profileIds: [],
      discordRoleId: CHILLRP_POLICE_DISCORD_ROLE_ID,
    };
    const updated = [...filtered, newGroup];
    const { error } = await supabase.from("site_settings").upsert(
      { key: "dm_groups", value: JSON.stringify(updated), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) {
      toast.error("Грешка при запазване на групата.");
      return;
    }
    setDmGroups(updated);
    toast.success(`Групата „${name}“ е запазена. Зареди я от списъка вдясно.`);
  }

  async function sendDiscordDmToSelected() {
    const ids = Array.from(messageSelectedIds);
    const targets = profilesReachableForDm.filter((p) => ids.includes(p.id));
    const fromProfiles = targets.map((p) => p.discord_id!).filter(Boolean);
    const discordIds = [...new Set([...fromProfiles, ...discordIdsFromRoleReachable])];
    if (discordIds.length === 0) {
      toast.error("Избери от checklist и/или зареди получатели от Discord роля.");
      return;
    }
    if (!messageText.trim()) {
      toast.error("Въведи текст на съобщението.");
      return;
    }
    setMessageSending(true);
    setMessageLastResult(null);
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        toast.error("Сесията е изтекла. Влез отново в акаунта си.");
        setMessageLastResult({ sent: 0, failed: discordIds.length });
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-discord-dm-admin", {
        body: { discord_user_ids: discordIds, message: messageText.trim() },
      });
      if (error) throw error;
      const sent = (data?.sent as string[] | undefined)?.length ?? 0;
      const failed = (data?.failed as { discord_id: string; error: string }[] | undefined)?.length ?? 0;
      setMessageLastResult({ sent, failed });
      if (failed > 0) toast.warning(`Изпратени: ${sent}. Неуспешни: ${failed}.`);
      else toast.success(`Съобщението е изпратено до ${sent} потребител/и.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Грешка при изпращане");
      setMessageLastResult({ sent: 0, failed: 1 });
    } finally {
      setMessageSending(false);
      await fetchProfiles();
    }
  }

  function csvEscapeCell(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }

  function downloadCsvFile(filename: string, lines: string[]) {
    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /** Експорт за оперативни нужди (напр. нова Discord гилдия): всички профили със записан Discord ID. Конфиденциално — само за админи. */
  function exportAllProfilesDiscordIdsCsv() {
    const rows = profiles.filter((p) => p.discord_id?.trim());
    if (rows.length === 0) {
      toast.error("Няма профили със записан Discord ID.");
      return;
    }
    const header = "discord_id,discord_username,profile_user_id,dm_blocked";
    const lines = rows.map((p) =>
      [
        csvEscapeCell(p.discord_id!.trim()),
        csvEscapeCell(p.discord_username || p.username || ""),
        csvEscapeCell(p.id),
        csvEscapeCell(p.discord_dm_blocked_at ? "yes" : "no"),
      ].join(","),
    );
    downloadCsvFile(`tlr-discord-profiles-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines]);
    toast.success(`Експортирани ${rows.length} реда (поверителни данни).`);
  }

  /** Същият набор Discord ID като при „Изпрати“: избрани от checklist + заредена роля (без дубли). */
  function exportCurrentMessageRecipientsCsv() {
    const ids = Array.from(messageSelectedIds);
    const targets = profilesReachableForDm.filter((p) => ids.includes(p.id));
    const fromProfiles = targets.map((p) => p.discord_id!.trim()).filter(Boolean);
    const merged = [
      ...new Set([...fromProfiles, ...discordIdsFromRoleReachable.map((x) => String(x).trim()).filter(Boolean)]),
    ];
    if (merged.length === 0) {
      toast.error("Няма получатели — избери от checklist и/или зареди Discord роля.");
      return;
    }
    const profileByDiscord = new Map(
      profiles.filter((p) => p.discord_id?.trim()).map((p) => [p.discord_id!.trim(), p]),
    );
    const header = "discord_id,discord_username,profile_user_id";
    const lines = merged.map((did) => {
      const p = profileByDiscord.get(did);
      if (p) {
        return [csvEscapeCell(did), csvEscapeCell(p.discord_username || p.username || ""), csvEscapeCell(p.id)].join(",");
      }
      return [csvEscapeCell(did), csvEscapeCell(""), csvEscapeCell("")].join(",");
    });
    downloadCsvFile(`tlr-discord-recipients-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines]);
    toast.success(`Експортирани ${merged.length} Discord ID (чеклист + роля).`);
  }

  async function loadDmGroup(group: DmGroup) {
    setMessageSelectedIds(new Set(group.profileIds));
    if (group.discordRoleId) {
      await fetchPoliceDiscordRecipients(group.discordRoleId, { silent: true });
      toast.info(`Група „${group.name}“: заредени получатели от Discord роля.`);
    } else {
      setDiscordIdsFromRole([]);
    }
  }

  async function saveDmGroupAs() {
    if (!dmGroupSaveName.trim()) {
      toast.error("Въведи име на групата.");
      return;
    }
    const newGroup: DmGroup = {
      id: crypto.randomUUID(),
      name: dmGroupSaveName.trim(),
      profileIds: Array.from(messageSelectedIds),
    };
    const updated = [...dmGroups, newGroup];
    const { error } = await supabase.from("site_settings").upsert(
      { key: "dm_groups", value: JSON.stringify(updated), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) {
      toast.error("Грешка при запазване на групата.");
      return;
    }
    setDmGroups(updated);
    setDmGroupSaveModal(false);
    setDmGroupSaveName("");
    toast.success("Групата е запазена.");
  }

  async function deleteDmGroup(groupId: string) {
    const updated = dmGroups.filter((g) => g.id !== groupId);
    const { error } = await supabase.from("site_settings").upsert(
      { key: "dm_groups", value: JSON.stringify(updated), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) toast.error("Грешка при изтриване.");
    else {
      setDmGroups(updated);
      toast.success("Групата е изтрита.");
    }
  }

  async function uploadFile(
    file: File,
    folder: string,
    mode: "image" | "media" = "image"
  ): Promise<string | null> {
    try {
      if (mode === "image") assertImageFileForUpload(file);
      else assertFileAllowedForUpload(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Файлът не е позволен за качване.");
      return null;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const contentType = resolveUploadMimeType(file);
    const { error } = await supabase.storage
      .from("uploads")
      .upload(path, file, { upsert: true, contentType });
    if (error) {
      const hint = (error.message && /policy|bucket|row-level|403|400/i.test(error.message))
        ? " Провери: bucket 'uploads' и политиките в Supabase (RUN_THIS_storage_uploads.sql)."
        : "";
      toast.error("Грешка при качване на файл: " + error.message + hint);
      console.error("Storage upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
    return urlData.publicUrl;
  }

  async function setSiteSetting(key: string, value: string, description?: string) {
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        { key, value, description: description ?? null, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
  }

  async function uploadBranding(kind: "logo" | "banner") {
    const file = kind === "logo" ? brandingLogoFile : brandingBannerFile;
    if (!file) {
      toast.error("Избери файл.");
      return;
    }
    setBrandingSaving(true);
    try {
      const url = await uploadFile(file, "branding", "image");
      if (!url) return;
      const key = kind === "logo" ? "site_logo_url" : "site_banner_url";
      await setSiteSetting(key, url, kind === "logo" ? "URL на лого (качено в storage/uploads/branding)" : "URL на hero банер (качено в storage/uploads/branding)");
      toast.success(kind === "logo" ? "Логото е качено." : "Банерът е качен.");
      if (kind === "logo") setBrandingLogoFile(null);
      else setBrandingBannerFile(null);
      await fetchSiteSettings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Грешка при качване.");
    } finally {
      setBrandingSaving(false);
    }
  }

  // ── Gang Application CRUD ──
  function openGangEdit(app: Application) {
    setGangEditModal(app);
    setGangEditForm({
      name: app.name, gang_type: app.gang_type, leader: app.leader, members: app.members,
      goal: app.goal, history: app.history, rules: app.rules, rp_examples: app.rp_examples,
      discord_username: app.discord_username || "", status: app.status, admin_note: app.admin_note || "",
    });
  }

  async function saveGangEdit() {
    if (!gangEditForm.name || !gangEditForm.leader) { toast.error("Попълни име и лидер!"); return; }
    setGangEditSaving(true);
    const payload = {
      name: gangEditForm.name, gang_type: gangEditForm.gang_type, leader: gangEditForm.leader,
      members: gangEditForm.members, goal: gangEditForm.goal, history: gangEditForm.history,
      rules: gangEditForm.rules, rp_examples: gangEditForm.rp_examples,
      discord_username: gangEditForm.discord_username || null,
      status: gangEditForm.status, admin_note: gangEditForm.admin_note || null,
      reviewed_at: gangEditForm.status !== gangEditModal?.status ? new Date().toISOString() : gangEditModal?.reviewed_at,
    };
    const { error } = await supabase.from("gang_applications").update(payload).eq("id", gangEditModal!.id);
    if (error) { toast.error("Грешка: " + error.message); setGangEditSaving(false); return; }
    toast.success("✅ Кандидатурата е обновена");
    logAdminAction("update_gang_application", `Обновена кандидатура: ${gangEditForm.name} (${gangEditForm.status})`);
    setGangEditModal(null); setGangEditSaving(false); setSelected(null);
    await fetchApps();
  }

  async function handleProductGalleryFilesChange(files: FileList | null) {
    if (!files?.length) return;
    setProductGalleryUploading(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const u = await uploadFile(files[i], "products", "media");
        if (u) urls.push(normalizeStoragePublicUrl(u));
      }
      if (urls.length) {
        setProductForm((f) => {
          const lines = f.product_media_urls.trim() ? f.product_media_urls.split("\n").filter(Boolean) : [];
          return { ...f, product_media_urls: [...lines, ...urls].join("\n") };
        });
      }
    } finally {
      setProductGalleryUploading(false);
    }
  }

  function grantsJsonToFormString(v: unknown): string {
    if (v == null) return "";
    if (typeof v === "string") return v;
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return "";
    }
  }

  // ── Product CRUD ──
  function openProductCreate() {
    setProductModal({} as DbProduct);
    setProductAdvancedOpen(false);
    setProductForm({
      slug: "",
      name: "",
      subtitle: "",
      price: "",
      original_price: "",
      description: "",
      long_description: "",
      includes: "",
      badge: "",
      category: "other",
      stripe_price: "",
      sort_order: dbProducts.length + 1,
      is_active: true,
      product_media_urls: "",
      opcrime_gc_amount: "",
      opcrime_use_redeem_code: false,
      opcrime_org_money_amount: "",
      opcrime_org_money_account: "",
      ingame_grants_json: "",
      ingame_player_hint: "",
      transfer_note_template: "",
      discord_purchase_dm_template: "",
    });
    setProductImageFile(null);
  }

  function openProductEdit(p: DbProduct) {
    setProductModal(p);
    setProductAdvancedOpen(false);
    setProductForm({
      slug: p.slug,
      name: p.name,
      subtitle: p.subtitle,
      price: p.price,
      original_price: p.original_price,
      description: p.description,
      long_description: p.long_description,
      includes: (p.includes || []).join("\n"),
      badge: p.badge || "",
      category: p.category,
      stripe_price: p.stripe_price || "",
      sort_order: p.sort_order,
      is_active: p.is_active,
      product_media_urls: (p.product_media_urls || []).filter(Boolean).join("\n"),
      opcrime_gc_amount: p.opcrime_gc_amount != null ? String(p.opcrime_gc_amount) : "",
      opcrime_use_redeem_code: Boolean(p.opcrime_use_redeem_code),
      opcrime_org_money_amount: p.opcrime_org_money_amount != null ? String(p.opcrime_org_money_amount) : "",
      opcrime_org_money_account: p.opcrime_org_money_account?.trim() || "",
      ingame_grants_json: grantsJsonToFormString(p.ingame_grants_json),
      ingame_player_hint: p.ingame_player_hint || "",
      transfer_note_template: p.transfer_note_template || "",
      discord_purchase_dm_template: p.discord_purchase_dm_template || "",
    });
    setProductImageFile(null);
  }

  async function saveProduct() {
    if (!productForm.name || !productForm.slug || !productForm.price) {
      toast.error("Попълни име, slug и цена!");
      return;
    }
    let ingame_grants_json: unknown = null;
    const grantsRaw = productForm.ingame_grants_json.trim();
    if (grantsRaw) {
      try {
        ingame_grants_json = JSON.parse(grantsRaw) as unknown;
      } catch {
        toast.error("Невалиден JSON в „In-game grants“.");
        return;
      }
    }
    const gcParsed = productForm.opcrime_gc_amount.trim() ? Number(productForm.opcrime_gc_amount) : null;
    const orgMoneyParsed = productForm.opcrime_org_money_amount.trim() ? Number(productForm.opcrime_org_money_amount) : null;
    if (productForm.opcrime_gc_amount.trim() && Number.isNaN(gcParsed as number)) {
      toast.error("Невалидно число за GC amount.");
      return;
    }
    if (productForm.opcrime_org_money_amount.trim() && Number.isNaN(orgMoneyParsed as number)) {
      toast.error("Невалидно число за org money amount.");
      return;
    }
    const mediaUrls = productForm.product_media_urls
      .split("\n")
      .map((s) => normalizeStoragePublicUrl(s.trim()))
      .filter(Boolean);

    setProductSaving(true);
    let image_url = productModal?.image_url || null;
    if (productImageFile) {
      const up = await uploadFile(productImageFile, "products", "image");
      if (!up) {
        setProductSaving(false);
        return;
      }
      image_url = normalizeStoragePublicUrl(up);
    }

    const payload = {
      slug: productForm.slug.trim(),
      name: productForm.name.trim(),
      subtitle: productForm.subtitle,
      price: productForm.price,
      original_price: productForm.original_price,
      description: productForm.description,
      long_description: productForm.long_description,
      includes: productForm.includes.split("\n").filter(Boolean),
      badge: productForm.badge.trim() || null,
      category: productForm.category,
      stripe_price: productForm.stripe_price.trim() || null,
      sort_order: productForm.sort_order,
      is_active: productForm.is_active,
      image_url,
      product_media_urls: mediaUrls,
      opcrime_gc_amount: gcParsed,
      opcrime_use_redeem_code: productForm.opcrime_use_redeem_code,
      opcrime_org_money_amount: orgMoneyParsed,
      opcrime_org_money_account: productForm.opcrime_org_money_account.trim() || "",
      ingame_grants_json,
      ingame_player_hint: productForm.ingame_player_hint.trim() || null,
      transfer_note_template: productForm.transfer_note_template.trim() || null,
      discord_purchase_dm_template: productForm.discord_purchase_dm_template.trim() || null,
    };

    const isEdit = !!productModal?.id;
    if (isEdit) {
      const { error } = await supabase.from("products").update(payload).eq("id", productModal.id);
      if (error) {
        toast.error("Грешка: " + error.message);
        setProductSaving(false);
        return;
      }
      toast.success("✅ Продуктът е обновен");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) {
        toast.error("Грешка: " + error.message);
        setProductSaving(false);
        return;
      }
      toast.success("✅ Нов продукт добавен");
    }
    logAdminAction(isEdit ? "update_product" : "create_product", `${isEdit ? "Обновен" : "Създаден"} продукт: ${productForm.name}`);
    setProductModal(null);
    setProductSaving(false);
    await fetchProducts();
  }

  async function deleteProduct(id: string) {
    const prod = dbProducts.find((p) => p.id === id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error("Грешка при изтриване");
      return;
    }
    toast.success("🗑️ Продуктът е изтрит");
    setDeleteConfirm(null);
    await fetchProducts();
    logAdminAction("delete_product", `Изтрит продукт: ${prod?.name || id}`);
  }

  function seedToProductPayload(seed: (typeof shopSeedProducts)[number]) {
    return {
      slug: seed.slug,
      name: seed.name,
      subtitle: seed.subtitle,
      price: seed.price,
      original_price: seed.original_price,
      description: seed.description,
      long_description: seed.long_description,
      includes: seed.includes,
      badge: seed.badge,
      category: seed.category,
      image_url: seed.image_url,
      product_media_urls: (seed.product_media_urls || []).filter(Boolean),
      sort_order: seed.sort_order,
      is_active: seed.is_active,
      stripe_price: seed.stripe_price,
      opcrime_org_money_account: "",
      opcrime_use_redeem_code: false,
    };
  }

  async function syncSeedProducts() {
    if (shopSeedProducts.length === 0) {
      toast.info("Няма записи в shopSeedProducts — добави продукти в src/lib/shopSeedProducts.ts или създай ръчно.");
      return;
    }
    setProductSyncLoading(true);
    try {
      const payloads = shopSeedProducts.map(seedToProductPayload);
      const { error } = await supabase.from("products").upsert(payloads, { onConflict: "slug", ignoreDuplicates: false });
      if (error) {
        if (error.code === "42501" || error.message?.includes("row-level security")) {
          toast.error("Нямаш право за запис в products. Провери user_roles / RLS.");
          await fetchProducts();
          setProductSyncLoading(false);
          return;
        }
        const { data: existingData } = await supabase.from("products").select("id, slug");
        const bySlug = new Map(((existingData || []) as { id: string; slug: string }[]).map((p) => [p.slug, p.id]));
        let done = 0;
        for (const seed of shopSeedProducts) {
          const payload = seedToProductPayload(seed);
          const existingId = bySlug.get(seed.slug);
          if (existingId) {
            const { error: upErr } = await supabase.from("products").update(payload).eq("id", existingId);
            if (!upErr) done++;
          } else {
            const { error: insErr } = await supabase.from("products").insert(payload);
            if (!insErr) {
              done++;
              bySlug.set(seed.slug, "");
            }
          }
        }
        toast.success(`Синхронизирани продукти: ${done} от ${shopSeedProducts.length}.`);
        logAdminAction("sync_seed_products", `Seed продукти (fallback): ${done}`);
      } else {
        toast.success(`Синхронизирани всички продукти (${payloads.length}).`);
        logAdminAction("sync_seed_products", `Seed продукти: ${payloads.length}`);
      }
      await fetchProducts();
    } catch (e) {
      const err = e as { code?: string };
      if (err?.code !== "42501") toast.error(e instanceof Error ? e.message : "Грешка при синхронизация на продукти.");
    }
    setProductSyncLoading(false);
  }

  // ── Rule CRUD ──
  function openRuleCreate() {
    setRuleModal({} as RuleSection);
    setRuleForm({ page: "discord", emoji: "", title: "", color: "accent", items: "", note: "", sort_order: ruleSections.length + 1, is_active: true });
  }
  function openRuleEdit(r: RuleSection) {
    setRuleModal(r);
    setRuleForm({ page: r.page, emoji: r.emoji, title: r.title, color: r.color, items: (r.items || []).join("\n"), note: r.note || "", sort_order: r.sort_order, is_active: r.is_active });
  }
  async function saveRule() {
    if (!ruleForm.title) { toast.error("Попълни заглавие!"); return; }
    setRuleSaving(true);
    const payload = {
      page: ruleForm.page, emoji: ruleForm.emoji, title: ruleForm.title, color: ruleForm.color,
      items: ruleForm.items.split("\n").filter(Boolean), note: ruleForm.note || null,
      sort_order: ruleForm.sort_order, is_active: ruleForm.is_active,
    };
    const isEdit = !!ruleModal?.id;
    if (isEdit) {
      const { error } = await supabase.from("rule_sections").update(payload).eq("id", ruleModal.id);
      if (error) { toast.error("Грешка: " + error.message); setRuleSaving(false); return; }
      toast.success("✅ Правилото е обновено");
    } else {
      const { error } = await supabase.from("rule_sections").insert(payload);
      if (error) { toast.error("Грешка: " + error.message); setRuleSaving(false); return; }
      toast.success("✅ Ново правило добавено");
    }
    logAdminAction(isEdit ? "update_rule" : "create_rule", `${isEdit ? "Обновено" : "Създадено"} правило: ${ruleForm.title} (${ruleForm.page})`);
    setRuleModal(null); setRuleSaving(false);
    await fetchRules();
  }
  async function deleteRule(id: string) {
    const rule = ruleSections.find(r => r.id === id);
    const { error } = await supabase.from("rule_sections").delete().eq("id", id);
    if (error) { toast.error("Грешка при изтриване"); return; }
    toast.success("🗑️ Правилото е изтрито"); setDeleteConfirm(null);
    await fetchRules();
    logAdminAction("delete_rule", `Изтрито правило: ${rule?.title || id}`);
  }

  // ── Принудително зареди стандартни правила (изтрива текущите и добавя стандартните) ──
  async function forceSeedRules() {
    if (!window.confirm("Това ще изтрие всички текущи правила и ще добави стандартните за Minecraft (само записи в rule_sections). Продължаваш ли?")) return;
    try {
      const { data: all } = await supabase.from("rule_sections").select("id");
      if (all && all.length > 0) {
        const { error: delErr } = await supabase.from("rule_sections").delete().in("id", all.map((x) => x.id));
        if (delErr) throw delErr;
      }
      const toInsert: { page: string; emoji: string; title: string; color: string; items: string[]; note: string | null; sort_order: number; is_active: boolean }[] = [];
      SERVER_RULES.forEach((r, i) => {
        toInsert.push({ page: "server", emoji: r.emoji, title: r.title, color: r.color, items: r.items, note: r.note ?? null, sort_order: i, is_active: true });
      });
      DISCORD_RULES.forEach((r, i) => {
        toInsert.push({ page: "discord", emoji: r.emoji, title: r.title, color: r.color, items: r.items, note: r.note ?? null, sort_order: i, is_active: true });
      });
      const { error } = await supabase.from("rule_sections").insert(toInsert);
      if (error) throw error;
      toast.success("Стандартните правила са заредени (текущите са премахнати).");
      logAdminAction(
        "force_seed_rules",
        `Принудително заредени: server ${SERVER_RULES.length}, discord ${DISCORD_RULES.length} (остани раздели са статични в кода)`
      );
      fetchRules();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err?.code === "42501") {
        toast.error("Нямате право за запис в rule_sections. Добави потребителя си като админ: Supabase → Table Editor → user_roles → добави ред с твоя user_id и role 'admin'.");
      } else if (err?.message?.includes("violates check constraint") || err?.message?.includes("rule_sections")) {
        toast.error(
          "Таблицата rule_sections отхвърля някои page стойности. Пусни в SQL Editor: ALTER TABLE rule_sections DROP CONSTRAINT IF EXISTS rule_sections_page_check; после добави CHECK с нужните страници (discord, server, chat, smp, factions, anticheat, punishments).",
        );
      } else {
        toast.error(e instanceof Error ? e.message : "Грешка при зареждане на правила");
      }
    }
  }

  // ── Seed правила от стандартните списъци (ако няма записи) ──
  async function seedRules() {
    const { data: existing } = await supabase.from("rule_sections").select("id").limit(1);
    if (existing && existing.length > 0) {
      toast.info("Вече има правила. Seed се пропуска.");
      return;
    }
    try {
      const toInsert: { page: string; emoji: string; title: string; color: string; items: string[]; note: string | null; sort_order: number; is_active: boolean }[] = [];
      SERVER_RULES.forEach((r, i) => {
        toInsert.push({ page: "server", emoji: r.emoji, title: r.title, color: r.color, items: r.items, note: r.note ?? null, sort_order: i, is_active: true });
      });
      DISCORD_RULES.forEach((r, i) => {
        toInsert.push({ page: "discord", emoji: r.emoji, title: r.title, color: r.color, items: r.items, note: r.note ?? null, sort_order: i, is_active: true });
      });
      const { error } = await supabase.from("rule_sections").insert(toInsert);
      if (error) throw error;
      toast.success("Стандартните правила са добавени.");
      logAdminAction(
        "seed_rules",
        `Добавени правила: server ${SERVER_RULES.length}, discord ${DISCORD_RULES.length}`
      );
      fetchRules();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err?.code === "42501") {
        toast.error("Нямате право за запис в rule_sections. Добави потребителя си като админ: Supabase → Table Editor → user_roles → добави ред с твоя user_id и role 'admin'.");
      } else if (err?.message?.includes("violates check constraint") || err?.message?.includes("rule_sections")) {
        toast.error(
          "Таблицата rule_sections отхвърля някои page стойности. Пусни в SQL Editor: ALTER TABLE rule_sections DROP CONSTRAINT IF EXISTS rule_sections_page_check; после добави CHECK с нужните страници (discord, server, chat, smp, factions, anticheat, punishments).",
        );
      } else {
        toast.error(e instanceof Error ? e.message : "Грешка при зареждане на правила");
      }
    }
  }

  // ── Settings CRUD ──
  function openSettingCreate() {
    setSettingModal({} as SiteSetting);
    setSettingForm({ key: "", value: "", description: "" });
  }
  function openSettingEdit(s: SiteSetting) {
    setSettingModal(s);
    setSettingForm({ key: s.key, value: s.value, description: s.description || "" });
  }
  async function saveSetting() {
    if (!settingForm.key || !settingForm.value) { toast.error("Попълни ключ и стойност!"); return; }
    setSettingSaving(true);
    const payload = { key: settingForm.key, value: settingForm.value, description: settingForm.description || null };
    const isEdit = !!settingModal?.id;
    if (isEdit) {
      const { error } = await supabase.from("site_settings").update(payload).eq("id", settingModal.id);
      if (error) { toast.error("Грешка: " + error.message); setSettingSaving(false); return; }
      toast.success("✅ Настройката е обновена");
    } else {
      const { error } = await supabase.from("site_settings").insert(payload);
      if (error) { toast.error("Грешка: " + error.message); setSettingSaving(false); return; }
      toast.success("✅ Нова настройка добавена");
    }
    logAdminAction(isEdit ? "update_setting" : "create_setting", `${isEdit ? "Обновена" : "Създадена"} настройка: ${settingForm.key}`);
    setSettingModal(null); setSettingSaving(false);
    await fetchSettings();
  }
  async function deleteSetting(id: string) {
    const setting = siteSettings.find(s => s.id === id);
    const { error } = await supabase.from("site_settings").delete().eq("id", id);
    if (error) { toast.error("Грешка при изтриване"); return; }
    toast.success("🗑️ Настройката е изтрита"); setDeleteConfirm(null);
    await fetchSettings();
    logAdminAction("delete_setting", `Изтрита настройка: ${setting?.key || id}`);
  }

  /** Добавя в site_settings всички ключове от DEFAULT_SITE_SETTINGS, които все още липсват. */
  async function seedSiteSettings() {
    setSettingsSeedLoading(true);
    try {
      const existingKeys = new Set(siteSettings.map((s) => s.key));
      const toInsert = DEFAULT_SITE_SETTINGS.filter((d) => !existingKeys.has(d.key)).map((d) => ({
        key: d.key,
        value: d.value,
        description: d.description,
      }));
      if (toInsert.length === 0) {
        toast.success("Всички настройки вече съществуват.");
        setSettingsSeedLoading(false);
        return;
      }
      const { error } = await supabase
        .from("site_settings")
        .upsert(toInsert, { onConflict: "key" });
      if (error) throw error;
      toast.success(`Добавени ${toInsert.length} липсващи настройки.`);
      logAdminAction("seed_site_settings", `Добавени ${toInsert.length} настройки: ${toInsert.map((x) => x.key).join(", ")}`);
      fetchSettings();
    } catch (e) {
      console.error("seedSiteSettings", e);
      toast.error(e instanceof Error ? e.message : "Грешка при добавяне на настройки.");
    }
    setSettingsSeedLoading(false);
  }

  // ── Delete application ──
  async function deleteApp(id: string) {
    const app = apps.find(a => a.id === id);
    const { error } = await supabase.from("gang_applications").delete().eq("id", id);
    if (error) { toast.error("Грешка при изтриване"); return; }
    toast.success("🗑️ Кандидатурата е изтрита"); setDeleteConfirm(null); setSelected(null); fetchApps();
    logAdminAction("delete_gang_application", `Изтрита кандидатура: ${app?.name || id}`);
  }

  async function saveGangApplicationsOpen(next: boolean) {
    if (isStaffReadOnly) {
      toast.error("Нямате права за промяна.");
      return;
    }
    const { error } = await supabase.from("site_settings").upsert(
      {
        key: "gang_applications_open",
        value: next ? "true" : "false",
        description: "FREE GANG: прием на кандидатури (true) / слотовете заети — формата затворена (false).",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
    if (error) {
      toast.error("Грешка при запис на настройката.");
      return;
    }
    logAdminAction("gang_applications_gate", next ? "FREE GANG: отворени кандидатури" : "FREE GANG: затворени кандидатури");
    await fetchSettings();
    toast.success(next ? "Сайтът приема нови кандидатури за фракции." : "Формата на /applications е затворена — играчите виждат съобщение вместо форма.");
  }

  // ── User role management ──
  async function toggleRole(userId: string, role: "admin" | "moderator") {
    const existing = userRoles.find(r => r.user_id === userId && r.role === role);
    const profile = profiles.find(p => p.id === userId);
    if (existing) {
      if (role === "admin" && userId === session?.user?.id) { toast.error("Не можеш да премахнеш собствената си админ роля!"); return; }
      const { error } = await supabase.from("user_roles").delete().eq("id", existing.id);
      if (error) { toast.error("Грешка"); return; }
      toast.success(`Ролята ${role} е премахната`);
      logAdminAction("role_change", `Премахната роля ${role} на ${profile?.username || userId}`);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) { toast.error("Грешка при добавяне на роля"); return; }
      toast.success(`Ролята ${role} е добавена`);
      logAdminAction("role_change", `Добавена роля ${role} на ${profile?.username || userId}`);
    }
    fetchUserRoles();
  }

  function getUserRole(userId: string): string[] {
    return userRoles.filter(r => r.user_id === userId).map(r => r.role);
  }

  // ── Computed stats ──
  const totalRevenue = purchases.reduce((s, p) => s + (p.price_eur || 0), 0);

  const topProducts: TopProduct[] = useMemo(() =>
    Object.values(
      purchases.reduce((acc, p) => {
        const key = p.product_name;
        if (!acc[key]) acc[key] = { name: key, count: 0, revenue: 0 };
        acc[key].count += 1;
        acc[key].revenue += p.price_eur || 0;
        return acc;
      }, {} as Record<string, TopProduct>)
    ).sort((a, b) => b.count - a.count).slice(0, 5),
    [purchases]
  );

  const chartData: DayRevenue[] = useMemo(() => {
    const days: Record<string, DayRevenue> = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { date: key, revenue: 0, count: 0 };
    }
    purchases.forEach((p) => {
      const key = p.created_at.slice(0, 10);
      if (days[key]) { days[key].revenue += p.price_eur || 0; days[key].count += 1; }
    });
    return Object.values(days).map((d) => ({ ...d, date: new Date(d.date).toLocaleDateString("bg-BG", { day: "2-digit", month: "2-digit" }) }));
  }, [purchases]);

  // Аналитика: изчислени статистики от analyticsLogs
  type DailyStat = { date: string; dateLabel: string; logins: number; pageViews: number; uniqueUsers: number };
  const analyticsDaily: DailyStat[] = useMemo(() => {
    const byDate: Record<string, { logins: number; pageViews: number; userIds: Set<string> }> = {};
    const start = new Date(analyticsDateFrom);
    const end = new Date(analyticsDateTo);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      byDate[key] = { logins: 0, pageViews: 0, userIds: new Set() };
    }
    analyticsLogs.forEach((log) => {
      const key = log.created_at.slice(0, 10);
      if (!byDate[key]) return;
      if (log.event === "login") byDate[key].logins += 1;
      if (log.event === "page_view") {
        byDate[key].pageViews += 1;
        if (log.user_id) byDate[key].userIds.add(log.user_id);
      }
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date]) => ({
        date,
        dateLabel: new Date(date + "Z").toLocaleDateString("bg-BG", { day: "2-digit", month: "2-digit" }),
        logins: byDate[date].logins,
        pageViews: byDate[date].pageViews,
        uniqueUsers: byDate[date].userIds.size,
      }));
  }, [analyticsLogs, analyticsDateFrom, analyticsDateTo]);

  type HourStat = { hour: number; label: string; count: number };
  const analyticsByHour: HourStat[] = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${h}:00`, count: 0 }));
    analyticsLogs.forEach((log) => {
      const h = new Date(log.created_at).getUTCHours();
      arr[h].count += 1;
    });
    return arr;
  }, [analyticsLogs]);

  type PageStat = { page: string; count: number };
  const analyticsTopPages: PageStat[] = useMemo(() => {
    const map: Record<string, number> = {};
    analyticsLogs.forEach((log) => {
      if (log.event === "page_view") {
        const p = log.page || "/";
        map[p] = (map[p] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [analyticsLogs]);

  type VisitorStat = { user_id: string | null; user_email: string | null; discord: string | null; lastSeen: string; visitCount: number };
  const analyticsVisitors: VisitorStat[] = useMemo(() => {
    const byUser: Record<string, { user_email: string | null; lastSeen: string; visitCount: number }> = {};
    analyticsLogs.forEach((log) => {
      const id = log.user_id || log.user_email || "guest";
      if (!byUser[id]) byUser[id] = { user_email: log.user_email || null, lastSeen: log.created_at, visitCount: 0 };
      byUser[id].visitCount += 1;
      if (log.created_at > byUser[id].lastSeen) byUser[id].lastSeen = log.created_at;
    });
    return Object.entries(byUser)
      .filter(([id]) => id !== "guest")
      .map(([key]) => {
        const u = byUser[key];
        const isUuid = key.length === 36 && key.includes("-");
        const profile = isUuid ? profiles.find((p) => p.id === key) : null;
        return {
          user_id: isUuid ? key : null,
          user_email: u.user_email ?? (key.includes("@") ? key : null),
          discord: profile?.discord_username || profile?.username || null,
          lastSeen: u.lastSeen,
          visitCount: u.visitCount,
        };
      })
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 100);
  }, [analyticsLogs, profiles]);

  const analyticsSummary = useMemo(() => {
    const logins = analyticsLogs.filter((l) => l.event === "login").length;
    const pageViews = analyticsLogs.filter((l) => l.event === "page_view").length;
    const uniqueUserIds = new Set(analyticsLogs.filter((l) => l.user_id).map((l) => l.user_id)).size;
    return { logins, pageViews, uniqueUserIds, totalEvents: analyticsLogs.length };
  }, [analyticsLogs]);

  // ── Filtered data ──
  const filteredApps = apps.filter(a =>
    !searchApps || a.name.toLowerCase().includes(searchApps.toLowerCase()) || a.leader.toLowerCase().includes(searchApps.toLowerCase()) || (a.discord_username || "").toLowerCase().includes(searchApps.toLowerCase())
  );
  const filteredUsers = profiles.filter(p => !searchUsers || (p.username || "").toLowerCase().includes(searchUsers.toLowerCase()));
  const filteredPurchases = purchases.filter(p => !searchPurchases || p.product_name.toLowerCase().includes(searchPurchases.toLowerCase()) || (p.discord_username || "").toLowerCase().includes(searchPurchases.toLowerCase()));
  const filteredProducts = dbProducts.filter(
    (p) =>
      !searchProducts ||
      p.name.toLowerCase().includes(searchProducts.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchProducts.toLowerCase()) ||
      p.category.toLowerCase().includes(searchProducts.toLowerCase()),
  );
  const filteredRules = ruleSections.filter(r => (!searchRules || r.title.toLowerCase().includes(searchRules.toLowerCase())) && (rulePageFilter === "all" || r.page === rulePageFilter));
  const filteredWebLogs = webLogs.filter(log => {
    const matchModule = logsModuleFilter === "all" || (log.module || "site") === logsModuleFilter;
    const matchSearch = !searchLogs || [log.event, log.details, log.page, log.user_email || ""].some(s => s.toLowerCase().includes(searchLogs.toLowerCase()));
    return matchModule && matchSearch;
  });

  function exportCSV() {
    const headers = ["Дата", "Продукт", "Категория", "Цена (EUR)", "Discord", "Stripe Session ID"];
    const rows = purchases.map((p) => [
      new Date(p.created_at).toLocaleString("bg-BG", { timeZone: "Europe/Sofia" }),
      p.product_name, p.category || "—", p.price_eur != null ? p.price_eur.toFixed(2) : "—",
      p.discord_username || "—", p.stripe_session_id || "—",
    ]);
    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `tlr-rp-purchases-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function login() {
    if (!isSupabaseConfiguredForAuth()) {
      toast.error(
        "Липсва VITE_SUPABASE_URL в .env. Копирай Project URL от Supabase → Settings → API; за preview — npm run build след .env.",
      );
      return;
    }
    setDiscordLoginLoading(true);
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    if (currentPath && currentPath !== "/auth/callback") {
      localStorage.setItem("chillrp_post_auth_path", currentPath);
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: getDiscordOAuthSignInOptions(),
    });
    if (error) toast.error("Грешка при вход с Discord.");
    setDiscordLoginLoading(false);
  }

  async function logout() { await supabase.auth.signOut(); }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("gang_applications").update({ status, admin_note: adminNote || null, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Грешка при обновяване"); return; }
    toast.success(status === "approved" ? "✅ Одобрено!" : "❌ Отказано");
    logAdminAction(status === "approved" ? "approve_gang" : "reject_gang", `${status === "approved" ? "Одобрена" : "Отказана"} кандидатура: ${selected?.name} (${selected?.discord_username || "—"})`);
    if (selected?.discord_username) {
      try {
        const { error: dmError } = await supabase.functions.invoke("notify-discord-dm", { body: { discord_username: selected.discord_username, gang_name: selected.name, status, admin_note: adminNote || null } });
        if (dmError) toast.warning("⚠️ Статусът е обновен, но Discord DM не беше изпратен.");
        else toast.success("💬 Discord DM изпратен до кандидата!");
      } catch (err) { console.warn("Discord DM грешка:", err); }
    }
    setSelected(null); setAdminNote("");
    await fetchApps();
  }

  const statusColor = (s: string) =>
    s === "pending" ? "text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10" :
    s === "approved" ? "text-neon-green border-neon-green/30 bg-neon-green/10" :
    "text-destructive border-destructive/30 bg-destructive/10";
  const statusLabel = (s: string) =>
    s === "pending" ? "⏳ Изчакване" : s === "approved" ? "✅ Одобрено" : "❌ Отказано";
  const gangApplicationsAccepting = useMemo(
    () => areGangApplicationsOpen(siteSettings.find((s) => s.key === "gang_applications_open")?.value),
    [siteSettings]
  );

  function categoryLabel(cat: string) {
    const labels: Record<string, string> = {
      vip: "VIP рангове",
      donor: "Donor",
      cosmetics: "Козметика",
      keys: "Crate keys",
      kits: "Kits",
      perks: "Perks",
      bundles: "Bundles",
      seasonal: "Сезонни",
      other: "Други",
    };
    return labels[cat] || cat;
  }

  const SaveButton = ({ onClick, saving, label = "Запази", disabled = false }: { onClick: () => void; saving: boolean; label?: string; disabled?: boolean }) => (
    <button type="button" aria-label={label} onClick={onClick} disabled={saving || disabled} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-heading font-black text-sm text-primary-foreground glow-accent hover:opacity-90 transition-all disabled:opacity-50 bg-gradient-to-br from-server-dark to-server shadow-server-glow-sm">
      {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />} {label}
    </button>
  );

  const DeleteBtn = ({ id, type, onDelete, disabled }: { id: string; type: string; onDelete: (id: string) => void; disabled?: boolean }) => (
    disabled ? null : deleteConfirm?.id === id && deleteConfirm?.type === type ? (
      <div className="flex items-center gap-1">
        <button onClick={() => onDelete(id)} className="px-2 py-1.5 rounded-lg border border-destructive/50 bg-destructive/15 text-destructive text-xs font-heading font-bold">Да</button>
        <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-heading font-bold">Не</button>
      </div>
    ) : (
      <button type="button" aria-label="Изтрий" onClick={() => setDeleteConfirm({ id, type })} className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button>
    )
  );

  // ── Login screen ──
  if (!session) return (
    <div className="min-h-screen bg-background pt-20 flex items-center justify-center px-4">
      <div className="glass border border-primary/30 rounded-2xl p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <Shield size={36} className="text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-heading font-black tracking-widest uppercase text-foreground">Admin Panel</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">TLR — вход само с Discord</p>
        </div>
        <button
          type="button"
          aria-label="Влез с Discord"
          onClick={login}
          disabled={discordLoginLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/15 text-white font-heading font-bold text-sm tracking-wider transition-all disabled:opacity-50"
        >
          {discordLoginLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <DiscordBrandIcon size={20} className="w-5 h-5 text-white" />
              Влез с Discord
            </>
          )}
        </button>
        <p className="text-[10px] text-muted-foreground/60 text-center font-body mt-4">
          Достъп имат само ролите Staff и Administrator в Discord сървъра.
        </p>
      </div>
    </div>
  );

  // На localhost/dev позволяваме достъп до панела за всеки влязъл потребител,
  // за да можеш да тестваш без задължително настроени Discord роли и функции.
  if (!isLocalhostOrDev && roleChecked && !isAdmin) return (
    <div className="min-h-screen bg-background pt-20 flex items-center justify-center px-4">
      <div className="glass border border-primary/30 rounded-2xl p-8 max-w-sm w-full text-center">
        <Shield size={36} className="text-primary mx-auto mb-3" />
        <h1 className="text-xl font-heading font-black tracking-widest uppercase text-primary">Достъп отказан</h1>
        <button onClick={logout} className="mt-6 flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 text-sm font-heading font-semibold tracking-wider transition-colors">
          <LogOut size={15} /> Изход
        </button>
      </div>
    </div>
  );

  if (!roleChecked) return (
    <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
      <div className="text-muted-foreground font-body text-sm">Проверка на правата...</div>
    </div>
  );

  const tabs: [TabId, React.ReactNode, string][] = [
    ["apps", <Shield size={16} />, "Кандидатури"],
    ["stats", <BarChart3 size={16} />, "Статистика"],
    ["users", <Users size={16} />, "Потребители"],
    ["products", <Package size={16} />, "Продукти"],
    ["rules", <BookOpen size={16} />, "Правила"],
    ["logs", <Activity size={16} />, "Web логове"],
    ["messages", <MessageCircle size={16} />, "Съобщения"],
    ["settings", <Settings size={16} />, "Настройки"],
    ["developer", <Cpu size={16} />, "Developer"],
  ];

  const navGroups: { label: string; ids: TabId[] }[] = [
    { label: "Обобщение", ids: ["apps", "stats", "users"] },
    { label: "Съдържание", ids: ["products", "rules"] },
    { label: "Анализ и комуникация", ids: ["logs", "messages"] },
    { label: "Система", ids: ["settings", "developer"] },
  ];

  return (
    <div className="min-h-screen bg-background pt-20 flex">
      {/* Sidebar */}
      <aside
        className={`fixed top-20 left-0 z-40 h-[calc(100vh-5rem)] w-64 shrink-0 border-r border-white/10 bg-background/98 backdrop-blur-xl transition-transform duration-200 ease-out lg:translate-x-0 lg:static lg:z-0 overflow-visible shadow-[4px_0_24px_-4px_rgba(0,0,0,0.15)]
          ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
      >
        <div className="flex h-full flex-col pt-6">
          <div className="border-y border-white/10 px-4 py-4 mt-1 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <LayoutDashboard size={18} />
              </div>
              <span className="font-heading text-xs font-bold tracking-widest uppercase text-foreground/90">Админ панел</span>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin">
            {navGroups.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? "mt-6 pt-5 border-t border-white/5" : "mb-0"}>
                <div className="mb-2.5 px-2 text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground/90">
                  {group.label}
                </div>
                <div className="space-y-1">
                  {tabs.filter(([id]) => group.ids.includes(id)).map(([id, icon, label]) => (
                    <button
                      key={id}
                      onClick={() => { setTab(id); setDeleteConfirm(null); setSidebarOpen(false); }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200
                        ${tab === id
                          ? "bg-primary/20 text-primary border border-primary/40 shadow-sm"
                          : "text-muted-foreground hover:bg-white/8 hover:text-foreground border border-transparent hover:border-white/10"}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tab === id ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"}`}>
                        {icon}
                      </span>
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className={`container mx-auto px-4 py-6 lg:py-8 ${tab === "developer" ? "max-w-[1600px] xl:max-w-[1800px]" : "max-w-5xl"}`}>
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((o) => !o)}
                className="lg:hidden flex items-center justify-center h-10 w-10 rounded-xl border border-white/15 bg-white/5 text-foreground hover:bg-white/10 transition-colors"
                aria-label="Меню"
              >
                <PanelLeftClose size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-heading font-black tracking-widest text-foreground flex items-center gap-2">
                  <Shield size={24} className="text-primary" />
                  Admin Panel
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {isStaffReadOnly ? (
                    <span className="inline-flex items-center rounded-full border border-neon-yellow/40 bg-neon-yellow/10 px-2 py-0.5 text-[10px] font-heading font-bold uppercase text-neon-yellow">Само преглед</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-heading font-bold uppercase text-primary">Admin</span>
                  )}
                  <span className="inline-flex items-center rounded-full border border-neon-green/40 bg-neon-green/10 px-2 py-0.5 text-[10px] font-heading font-bold uppercase text-neon-green">Логове активни</span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-heading font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <LogOut size={16} />
              Изход
            </button>
          </div>
          {isStaffReadOnly && (
            <div className="mb-6 rounded-xl border border-neon-yellow/30 bg-neon-yellow/10 px-4 py-3 text-sm text-neon-yellow font-body">
              Вие имате роля <strong>Staff</strong> — преглед без право на редакция.
            </div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {[
              [apps.length, "Кандидатури", FileText, "text-primary", "border-primary/20 bg-primary/5"],
              [dbProducts.length, "Продукти", Package, "text-neon-purple", "border-neon-purple/20 bg-neon-purple/5"],
              [purchases.length, "Покупки", ShoppingBag, "text-neon-green", "border-neon-green/20 bg-neon-green/5"],
              [profiles.length, "Потребители", Users, "text-muted-foreground", "border-white/10 bg-white/5"],
              [webLogsCount, "Логове", Activity, "text-neon-cyan", "border-neon-cyan/20 bg-neon-cyan/5"],
            ].map(([value, label, Icon, iconCls, cardCls], i) => (
              <div key={i} className={`rounded-xl border ${cardCls} p-4 flex items-center gap-3 shadow-lg/5`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/50 ${iconCls}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-heading font-black tabular-nums text-foreground">{String(value)}</div>
                  <div className="text-[10px] font-heading tracking-widest uppercase text-muted-foreground truncate">{label}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground font-body mb-6">Действията се записват с вашия акаунт — виж „Web логове”. Правилата се зареждат при празна база.</p>

        {/* ─── APPLICATIONS TAB ─── */}
        {tab === "apps" && (
          <>
            <div className="glass border border-primary/25 rounded-xl p-4 sm:p-5 mb-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-heading font-black tracking-widest uppercase text-foreground mb-1">
                    FREE GANG — нови кандидатури
                  </h3>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">
                    Когато всички генг слотове са заети, изключи приема: на <span className="font-mono text-foreground/80">/gangs</span> няма да се изпраща форма.
                    Играчите виждат, че ще им пишете в Discord, когато има свободни места.
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 font-body mt-2">
                    За блокиране и на директни заявки към базата пусни SQL:{" "}
                    <span className="font-mono">supabase/RUN_THIS_gang_applications_gate.sql</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <span className="text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground">
                    Статус: {gangApplicationsAccepting ? "приемаме" : "затворено"}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isStaffReadOnly || gangApplicationsAccepting}
                      onClick={() => void saveGangApplicationsOpen(true)}
                      className="px-4 py-2 rounded-lg border text-xs font-heading font-bold tracking-wider uppercase transition-colors disabled:opacity-40 border-neon-green/50 bg-neon-green/15 text-neon-green hover:bg-neon-green/25"
                    >
                      Приемаме кандидатури
                    </button>
                    <button
                      type="button"
                      disabled={isStaffReadOnly || !gangApplicationsAccepting}
                      onClick={() => void saveGangApplicationsOpen(false)}
                      className="px-4 py-2 rounded-lg border text-xs font-heading font-bold tracking-wider uppercase transition-colors disabled:opacity-40 border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                    >
                      Слотовете са пълни
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {["pending", "approved", "rejected"].map((s) => (
                <div key={s} className={`glass border rounded-xl p-4 text-center ${statusColor(s)}`}>
                  <div className="text-2xl font-heading font-black">{apps.filter(a => a.status === s).length}</div>
                  <div className="text-xs font-heading font-semibold tracking-widest uppercase mt-1">{statusLabel(s)}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex gap-2 flex-wrap">
                {(["all", "pending", "approved", "rejected"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-heading font-bold tracking-widest uppercase border transition-colors
                      ${filter === f ? "border-primary/60 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-border/60"}`}>
                    {f === "all" ? "Всички" : statusLabel(f)}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-w-[200px]"><SearchInput value={searchApps} onChange={setSearchApps} placeholder="Търси по име, лидер, discord..." /></div>
            </div>
            <div className="space-y-2">
              {filteredApps.length === 0 && <div className="text-center py-16 text-muted-foreground font-body">Няма заявки.</div>}
              {filteredApps.map((app) => (
                <div key={app.id} className="glass border border-white/8 rounded-xl p-4 flex items-center gap-4 hover:border-primary/25 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-heading font-bold tracking-wider text-foreground">{app.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-heading font-bold tracking-wider ${statusColor(app.status)}`}>{statusLabel(app.status)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-body">{app.gang_type} • Лидер: {app.leader} • {app.discord_username || "—"} • {new Date(app.submitted_at).toLocaleDateString("bg-BG")}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { setSelected(app); setAdminNote(app.admin_note || ""); }} disabled={isStaffReadOnly} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-heading font-bold tracking-wider hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"><Eye size={13} /> Виж</button>
                    <button type="button" aria-label="Редактирай кандидатура" onClick={() => openGangEdit(app)} disabled={isStaffReadOnly} className="p-1.5 rounded-lg border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"><Edit2 size={14} /></button>
                    <DeleteBtn id={app.id} type="app" onDelete={deleteApp} disabled={isStaffReadOnly} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 space-y-3">
              <h3 className="text-sm font-heading font-black tracking-widest uppercase text-foreground">SMS зареждания</h3>
              {smsDeposits.length === 0 ? (
                <p className="text-xs text-muted-foreground font-body">Няма заявки или таблицата не е мигрирана.</p>
              ) : (
                <div className="space-y-2">
                  {smsDeposits.map((r) => (
                    <div key={r.id} className="glass border border-white/8 rounded-xl p-4 flex flex-wrap items-center gap-3 justify-between">
                      <div className="text-xs font-body text-muted-foreground min-w-0">
                        <span className="text-foreground font-mono">{r.entered_code}</span> · {r.tier_id} ·{" "}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-heading font-bold tracking-wider ${statusColor(r.status)}`}>
                          {r.status}
                        </span>
                        <br />
                        user <span className="font-mono text-[10px]">{r.user_id.slice(0, 8)}…</span> · {new Date(r.created_at).toLocaleString("bg-BG")}
                      </div>
                      {r.status === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={isStaffReadOnly}
                            onClick={() => void approveSmsRequest(r.id)}
                            className="px-3 py-1.5 rounded-lg border border-neon-green/40 text-neon-green text-xs font-heading font-bold uppercase hover:bg-neon-green/10 disabled:opacity-40"
                          >
                            Одобри
                          </button>
                          <button
                            type="button"
                            disabled={isStaffReadOnly}
                            onClick={() => void rejectSmsRequest(r.id)}
                            className="px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs font-heading font-bold uppercase hover:bg-destructive/10 disabled:opacity-40"
                          >
                            Отхвърли
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-10 space-y-3">
              <h3 className="text-sm font-heading font-black tracking-widest uppercase text-foreground">Builder кандидатури</h3>
              {builderApps.length === 0 ? (
                <p className="text-xs text-muted-foreground font-body">Няма записи.</p>
              ) : (
                <div className="space-y-2">
                  {builderApps.map((r) => (
                    <div key={r.id} className="glass border border-white/8 rounded-xl p-4 text-xs font-body text-muted-foreground space-y-2">
                      <div className="flex flex-wrap gap-2 justify-between">
                        <span className={`font-heading font-bold ${statusColor(r.status)}`}>{r.status}</span>
                        <span>{new Date(r.submitted_at).toLocaleString("bg-BG")}</span>
                      </div>
                      <pre className="text-[10px] font-mono whitespace-pre-wrap break-all text-foreground/80 bg-black/30 rounded-lg p-2 max-h-32 overflow-y-auto">
                        {JSON.stringify(r.answers ?? {}, null, 0)}
                      </pre>
                      <div className="flex flex-wrap gap-2">
                        {(["pending", "approved", "rejected"] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            disabled={isStaffReadOnly || r.status === st}
                            onClick={() => void updateMcAppStatus("builder_applications", r.id, st)}
                            className="px-2 py-1 rounded border border-white/15 text-[10px] font-heading font-bold uppercase hover:border-primary/40 disabled:opacity-30"
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-10 space-y-3 pb-8">
              <h3 className="text-sm font-heading font-black tracking-widest uppercase text-foreground">Helper кандидатури</h3>
              {helperApps.length === 0 ? (
                <p className="text-xs text-muted-foreground font-body">Няма записи.</p>
              ) : (
                <div className="space-y-2">
                  {helperApps.map((r) => (
                    <div key={r.id} className="glass border border-white/8 rounded-xl p-4 text-xs font-body text-muted-foreground space-y-2">
                      <div className="flex flex-wrap gap-2 justify-between">
                        <span className={`font-heading font-bold ${statusColor(r.status)}`}>{r.status}</span>
                        <span>{new Date(r.submitted_at).toLocaleString("bg-BG")}</span>
                      </div>
                      <pre className="text-[10px] font-mono whitespace-pre-wrap break-all text-foreground/80 bg-black/30 rounded-lg p-2 max-h-32 overflow-y-auto">
                        {JSON.stringify(r.answers ?? {}, null, 0)}
                      </pre>
                      <div className="flex flex-wrap gap-2">
                        {(["pending", "approved", "rejected"] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            disabled={isStaffReadOnly || r.status === st}
                            onClick={() => void updateMcAppStatus("helper_applications", r.id, st)}
                            className="px-2 py-1 rounded border border-white/15 text-[10px] font-heading font-bold uppercase hover:border-primary/40 disabled:opacity-30"
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── STATS TAB ─── */}
        {tab === "stats" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <div className="flex-1 min-w-[200px]"><SearchInput value={searchPurchases} onChange={setSearchPurchases} placeholder="Търси покупки по продукт, discord..." /></div>
              <button onClick={exportCSV} disabled={purchases.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-green/40 bg-neon-green/10 text-neon-green text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-green/20 transition-colors disabled:opacity-40 shrink-0">
                <Download size={14} /> Export CSV
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="glass border border-primary/25 rounded-xl p-5 text-center">
                <ShoppingBag size={22} className="text-primary mx-auto mb-2" />
                <div className="text-3xl font-heading font-black text-foreground">{purchases.length}</div>
                <div className="text-xs font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-1">Покупки</div>
              </div>
              <div className="glass border border-neon-green/25 rounded-xl p-5 text-center">
                <Euro size={22} className="text-neon-green mx-auto mb-2" />
                <div className="text-3xl font-heading font-black text-foreground">€{totalRevenue.toFixed(2)}</div>
                <div className="text-xs font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-1">Приходи</div>
              </div>
              <div className="glass border border-neon-yellow/25 rounded-xl p-5 text-center">
                <TrendingUp size={22} className="text-neon-yellow mx-auto mb-2" />
                <div className="text-3xl font-heading font-black text-foreground">{purchases.length > 0 ? `€${(totalRevenue / purchases.length).toFixed(2)}` : "—"}</div>
                <div className="text-xs font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-1">Средна Стойност</div>
              </div>
              <div className="glass border border-neon-cyan/25 rounded-xl p-5 text-center">
                <Users size={22} className="text-neon-cyan mx-auto mb-2" />
                <div className="text-3xl font-heading font-black text-foreground">{profiles.length}</div>
                <div className="text-xs font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-1">Потребители</div>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-heading font-black tracking-widest uppercase text-muted-foreground mb-4">📈 Приходи по ден (последните 30 дни)</h2>
              <div className="glass border border-white/8 rounded-xl p-5">
                {statsLoading ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground font-body text-sm">Зарежда...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs><linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.35} /><stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
                      <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px", color: "hsl(var(--foreground))" }} formatter={(v: number) => [`€${v.toFixed(2)}`, "Приход"]} labelFormatter={(label) => `📅 ${label}`} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(160 84% 39%)" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: "hsl(160 84% 39%)", stroke: "none" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-heading font-black tracking-widest uppercase text-muted-foreground mb-3">🏆 Топ продукти</h2>
              {purchases.length === 0 ? <div className="text-center py-8 text-muted-foreground font-body text-sm">Все още няма покупки.</div> : (
                <div className="space-y-2">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="glass border border-white/8 rounded-xl p-4 flex items-center gap-4">
                      <div className="text-lg font-heading font-black text-muted-foreground/40 w-6 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</div>
                      <div className="flex-1 min-w-0"><div className="font-heading font-bold tracking-wider text-foreground text-sm truncate">{p.name}</div><div className="text-xs text-muted-foreground font-body mt-0.5">{p.count} покупки</div></div>
                      <div className="text-right"><div className="text-sm font-heading font-black text-neon-green">€{p.revenue.toFixed(2)}</div><div className="text-[10px] text-muted-foreground font-body">приход</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-sm font-heading font-black tracking-widest uppercase text-muted-foreground mb-3">🕐 Последни покупки</h2>
              {filteredPurchases.length === 0 ? <div className="text-center py-8 text-muted-foreground font-body text-sm">Няма резултати.</div> : (
                <div className="space-y-2">
                  {filteredPurchases.slice(0, 30).map((p) => (
                    <div key={p.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0"><div className="font-heading font-semibold text-sm text-foreground truncate">{p.product_name}</div><div className="text-xs text-muted-foreground font-body mt-0.5">{p.discord_username || "Гост"} • {p.category || "—"}</div></div>
                      <div className="text-right shrink-0"><div className="text-sm font-heading font-bold text-neon-green">{p.price_eur != null ? `€${p.price_eur.toFixed(2)}` : "—"}</div><div className="text-[10px] text-muted-foreground font-body">{new Date(p.created_at).toLocaleDateString("bg-BG")}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-10">
              <h2 className="text-sm font-heading font-black tracking-widest uppercase text-muted-foreground mb-3">
                🏦 Чакащи Revolut / PayPal
              </h2>
              <p className="text-xs text-muted-foreground font-body mb-3">
                След като видиш плащането с правилната бележка, натисни „Получено“ — на купувача се изпраща Discord ЛС (шаблон от продукта, ако е зададен).
              </p>
              {pendingRevolut.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground font-body text-sm glass border border-white/8 rounded-xl">
                  Няма чакащи преводи.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingRevolut.map((r) => (
                    <div
                      key={r.id}
                      className="glass border border-neon-cyan/20 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold text-neon-cyan">{r.reference}</span>
                          {r.payment_method === "paypal" ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/15 text-primary font-heading font-bold">
                              PayPal
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/15 text-primary font-heading font-bold">
                              Revolut
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-body mt-1">{r.summary}</div>
                        {r.transfer_note_full ? (
                          <div className="text-[10px] text-muted-foreground font-mono mt-1 break-all line-clamp-2">
                            {r.transfer_note_full}
                          </div>
                        ) : null}
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {r.discord_username || "—"} • {new Date(r.created_at).toLocaleString("bg-BG")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-lg font-heading font-black text-neon-green">€{Number(r.amount_eur).toFixed(2)}</span>
                        {!isStaffReadOnly && (
                          <button
                            type="button"
                            onClick={() => markRevolutPaymentDone(r.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neon-green/40 bg-neon-green/10 text-neon-green text-xs font-heading font-bold uppercase tracking-wider hover:bg-neon-green/20"
                          >
                            <CheckCircle size={14} /> Получено
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-10">
              <h2 className="text-sm font-heading font-black tracking-widest uppercase text-muted-foreground mb-3">
                🎫 Магазин — кодове за тикет (Discord)
              </h2>
              <p className="text-xs text-muted-foreground font-body mb-3">
                Клиентът генерира код на страницата на продукта — записва се тук; ботът пише в staff канал с @роля + ЛС на играча (Edge{" "}
                <span className="font-mono text-[10px]">notify-shop-ticket-code</span>; опционално webhook{" "}
                <span className="font-mono text-[10px]">DISCORD_SHOP_TICKET_LOG_WEBHOOK_URL</span>; канал/роля{" "}
                <span className="font-mono text-[10px]">DISCORD_SHOP_TICKET_CHANNEL_ID</span> /{" "}
                <span className="font-mono text-[10px]">DISCORD_SHOP_TICKET_PING_ROLE_ID</span>). Пуска тикет и праща кода; ти изпращаш линк за плащане и натискаш „Платено“. Таблица{" "}
                <span className="font-mono text-[10px]">shop_ticket_checkouts</span> —{" "}
                <span className="font-mono text-[10px]">RUN_THIS_shop_ticket_checkouts.sql</span>.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setShopTicketFilter("pending")}
                  className={`text-xs font-heading font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${
                    shopTicketFilter === "pending"
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-white/10 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  Само чакащи
                </button>
                <button
                  type="button"
                  onClick={() => setShopTicketFilter("all")}
                  className={`text-xs font-heading font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${
                    shopTicketFilter === "all"
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-white/10 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  Всички
                </button>
                <button
                  type="button"
                  onClick={() => {
                    shopTicketTableMissingRef.current = false;
                    void fetchShopTicketCheckouts();
                  }}
                  className="text-xs font-heading font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/10 text-muted-foreground hover:border-white/20"
                >
                  Обнови
                </button>
              </div>
              {shopTicketCheckouts.filter((t) => shopTicketFilter === "all" || t.status === "pending").length === 0 ? (
                <div className="text-center py-6 text-muted-foreground font-body text-sm glass border border-white/8 rounded-xl">
                  {shopTicketTableMissingRef.current
                    ? "Таблицата липсва — изпълни RUN_THIS_shop_ticket_checkouts.sql."
                    : shopTicketFilter === "pending"
                      ? "Няма чакащи тикет поръчки."
                      : "Няма записи."}
                </div>
              ) : (
                <div className="space-y-2">
                  {shopTicketCheckouts
                    .filter((t) => shopTicketFilter === "all" || t.status === "pending")
                    .map((t) => (
                      <div
                        key={t.id}
                        className="glass border border-primary/20 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-primary">{t.ticket_code}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-heading font-bold ${
                                t.status === "paid"
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : t.status === "cancelled"
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-amber-500/15 text-amber-400"
                              }`}
                            >
                              {t.status === "paid" ? "Платено" : t.status === "cancelled" ? "Отказ" : "Чака"}
                            </span>
                          </div>
                          <div className="text-xs font-heading font-semibold text-foreground mt-1 truncate">{t.product_name}</div>
                          <div className="text-[10px] text-muted-foreground font-body mt-0.5">
                            {t.product_slug} · {t.amount_display}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {t.discord_username || "—"} · {new Date(t.created_at).toLocaleString("bg-BG")}
                            {t.paid_at ? ` · платено ${new Date(t.paid_at).toLocaleString("bg-BG")}` : ""}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {!isStaffReadOnly && t.status === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => void markShopTicketPaid(t.id)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-heading font-bold uppercase tracking-wider hover:bg-emerald-500/20"
                              >
                                <CheckCircle size={14} /> Платено
                              </button>
                              <button
                                type="button"
                                onClick={() => void markShopTicketCancelled(t.id)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-muted-foreground text-xs font-heading font-bold uppercase tracking-wider hover:bg-white/5"
                              >
                                <XCircle size={14} /> Отказ
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* ─── Аналитика (посещаемост) в Статистика ─── */}
            <div className="border-t border-white/10 pt-8 mt-8">
              <h2 className="text-sm font-heading font-black tracking-widest uppercase text-muted-foreground mb-4">📊 Аналитика (посещаемост)</h2>
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground">Период:</span>
                  <input
                    type="date"
                    aria-label="От дата"
                    value={analyticsDateFrom}
                    onChange={(e) => setAnalyticsDateFrom(e.target.value)}
                    className="px-3 py-2 rounded-lg glass border border-border text-sm bg-transparent"
                  />
                  <span className="text-muted-foreground">–</span>
                  <input
                    type="date"
                    aria-label="До дата"
                    value={analyticsDateTo}
                    onChange={(e) => setAnalyticsDateTo(e.target.value)}
                    className="px-3 py-2 rounded-lg glass border border-border text-sm bg-transparent"
                  />
                  {[
                    { label: "Днес", from: 0, to: 0 },
                    { label: "7 дни", from: 6, to: 0 },
                    { label: "30 дни", from: 29, to: 0 },
                    { label: "90 дни", from: 89, to: 0 },
                  ].map((preset) => {
                    const to = new Date();
                    const from = new Date(); from.setDate(from.getDate() - preset.from);
                    const fromStr = from.toISOString().slice(0, 10);
                    const toStr = to.toISOString().slice(0, 10);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => { setAnalyticsDateFrom(fromStr); setAnalyticsDateTo(toStr); }}
                        className="px-3 py-1.5 rounded-lg border border-white/20 text-xs font-heading font-bold hover:bg-white/10 transition-colors"
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => fetchWebLogsForAnalytics()}
                    disabled={analyticsLoading}
                    className="ml-2 flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-bold hover:bg-neon-cyan/20 disabled:opacity-50"
                  >
                    {analyticsLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Обнови
                  </button>
                </div>
                <p className="text-xs text-muted-foreground font-body">
                  Данните идват от <code className="px-1 rounded bg-white/10">web_logs</code>. Влизания по ден, прегледи по час, потребители с Discord.
                </p>
              </div>

              {analyticsLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 size={32} className="animate-spin" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="glass border border-neon-cyan/25 rounded-xl p-5 text-center">
                      <LogInIcon size={22} className="text-neon-cyan mx-auto mb-2" />
                      <div className="text-3xl font-heading font-black text-foreground">{analyticsSummary.logins}</div>
                      <div className="text-xs font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-1">Влизания</div>
                    </div>
                    <div className="glass border border-primary/25 rounded-xl p-5 text-center">
                      <Eye size={22} className="text-primary mx-auto mb-2" />
                      <div className="text-3xl font-heading font-black text-foreground">{analyticsSummary.pageViews}</div>
                      <div className="text-xs font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-1">Прегледи</div>
                    </div>
                    <div className="glass border border-neon-green/25 rounded-xl p-5 text-center">
                      <Users size={22} className="text-neon-green mx-auto mb-2" />
                      <div className="text-3xl font-heading font-black text-foreground">{analyticsSummary.uniqueUserIds}</div>
                      <div className="text-xs font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-1">Уникални</div>
                    </div>
                    <div className="glass border border-amber-500/25 rounded-xl p-5 text-center">
                      <Activity size={22} className="text-amber-500 mx-auto mb-2" />
                      <div className="text-3xl font-heading font-black text-foreground">{analyticsSummary.totalEvents}</div>
                      <div className="text-xs font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-1">Събития</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="glass border border-white/10 rounded-xl p-5">
                      <h3 className="text-xs font-heading font-black tracking-widest uppercase text-muted-foreground mb-4">Влизания и прегледи по ден</h3>
                      {analyticsDaily.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Няма данни за периода.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={analyticsDaily} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="analyticsLogins" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(182 80% 55%)" stopOpacity={0.4} /><stop offset="95%" stopColor="hsl(182 80% 55%)" stopOpacity={0} /></linearGradient>
                              <linearGradient id="analyticsViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} /></linearGradient>
                              <linearGradient id="analyticsUnique" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(142 70% 45%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(142 70% 45%)" stopOpacity={0} /></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="dateLabel" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(analyticsDaily.length / 8))} />
                            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px" }} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? new Date(payload[0].payload.date).toLocaleDateString("bg-BG") : ""} />
                            <Area type="monotone" dataKey="logins" name="Влизания" stroke="hsl(182 80% 55%)" strokeWidth={2} fill="url(#analyticsLogins)" dot={false} />
                            <Area type="monotone" dataKey="pageViews" name="Прегледи" stroke="hsl(160 84% 39%)" strokeWidth={2} fill="url(#analyticsViews)" dot={false} />
                            <Area type="monotone" dataKey="uniqueUsers" name="Уникални" stroke="hsl(142 70% 45%)" strokeWidth={2} fill="url(#analyticsUnique)" dot={false} />
                            <Legend />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div className="glass border border-white/10 rounded-xl p-5">
                      <h3 className="text-xs font-heading font-black tracking-widest uppercase text-muted-foreground mb-4">Активност по час (UTC)</h3>
                      {analyticsByHour.every((h) => h.count === 0) ? (
                        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Няма данни.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={analyticsByHour} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} tickLine={false} axisLine={false} interval={2} />
                            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px" }} />
                            <Bar dataKey="count" name="Събития" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass border border-white/10 rounded-xl p-5">
                      <h3 className="text-xs font-heading font-black tracking-widest uppercase text-muted-foreground mb-4">Топ страници</h3>
                      {analyticsTopPages.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground text-sm">Няма прегледи.</div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {analyticsTopPages.map((p) => (
                            <div key={p.page} className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-0">
                              <span className="font-mono text-xs text-foreground truncate flex-1">{p.page}</span>
                              <span className="text-primary font-heading font-bold text-sm shrink-0">{p.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="glass border border-neon-cyan/20 rounded-xl p-5">
                      <h3 className="text-xs font-heading font-black tracking-widest uppercase text-neon-cyan mb-2">Потребители (Discord) в периода</h3>
                      {analyticsVisitors.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground text-sm">Няма потребители в логовете.</div>
                      ) : (
                        <div className="rounded-xl border border-white/10 overflow-hidden max-h-[280px] overflow-y-auto">
                          <table className="w-full border-collapse text-left text-sm">
                            <thead className="sticky top-0 bg-background/95 border-b border-white/10 z-10">
                              <tr>
                                <th className="py-2 px-3 font-heading font-bold text-muted-foreground text-xs">Discord</th>
                                <th className="py-2 px-3 font-heading font-bold text-muted-foreground text-xs">Посещения</th>
                                <th className="py-2 px-3 font-heading font-bold text-muted-foreground text-xs">Последна</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analyticsVisitors.slice(0, 20).map((v) => (
                                <tr key={v.user_id || v.user_email || "anon"} className="border-b border-white/5 hover:bg-white/[0.02]">
                                  <td className="py-2 px-3 text-neon-cyan font-body truncate max-w-[140px]">{v.discord || "—"}</td>
                                  <td className="py-2 px-3 font-heading font-bold text-foreground">{v.visitCount}</td>
                                  <td className="py-2 px-3 text-muted-foreground text-xs whitespace-nowrap">{new Date(v.lastSeen).toLocaleString("bg-BG", { dateStyle: "short", timeStyle: "short" })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── MESSAGES TAB (Discord DM) ─── */}
        {tab === "messages" && (
          <div className="space-y-6">
            {/* Hero: всички с разрешен бот */}
            <div className="relative overflow-hidden rounded-2xl border border-neon-cyan/25 bg-gradient-to-br from-neon-cyan/10 via-background to-primary/5 p-6">
              <div className="absolute top-0 right-0 w-40 h-40 bg-neon-cyan/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex flex-wrap items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-neon-cyan/20 border border-neon-cyan/30">
                  <MessageCircle size={28} className="text-neon-cyan" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-heading font-black text-foreground tracking-tight">
                    Достъпни за съобщение от бота
                  </h2>
                  <p className="text-sm text-muted-foreground font-body mt-0.5">
                    Само потребители, влезли с Discord и без спрени лични съобщения към бота. Ако изпращането върне грешка от Discord, профилът се маха от този списък (до следващ успешен DM).
                  </p>
                  <p className="text-xs text-muted-foreground/90 font-body mt-2 leading-relaxed">
                    За смяна на Discord сървъра: user ID в Discord е глобален — експортът по-долу помага за масово уведомяване или външни инструменти; поканата в нов гилд остава отделна стъпка (бот, OAuth или ръчна покана).
                  </p>
                  {profilesDmBlockedCount > 0 && (
                    <p className="text-xs text-amber-500/90 font-body mt-1.5">
                      Скрити от списъка (спрели DM към бота): <span className="font-heading font-bold">{profilesDmBlockedCount}</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-3 shrink-0 w-full sm:w-auto">
                  <div className="flex items-center gap-3 justify-center sm:justify-end">
                    <div className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-2 text-center">
                      <div className="text-2xl font-heading font-black text-neon-cyan">{profilesReachableForDm.length}</div>
                      <div className="text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground">достъпни</div>
                    </div>
                    <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-center">
                      <div className="text-2xl font-heading font-black text-primary">{messageSelectedIds.size}</div>
                      <div className="text-[10px] font-heading font-bold tracking-widest uppercase text-muted-foreground">избрани</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                    <button
                      type="button"
                      onClick={exportAllProfilesDiscordIdsCsv}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/[0.04] text-muted-foreground text-[10px] font-heading font-bold uppercase tracking-wide hover:bg-white/10 hover:text-foreground"
                      title="Всички профили с discord_id (вкл. със спрени DM)"
                    >
                      <Download size={14} /> CSV — всички с Discord ID
                    </button>
                    <button
                      type="button"
                      onClick={exportCurrentMessageRecipientsCsv}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neon-cyan/35 bg-neon-cyan/10 text-neon-cyan text-[10px] font-heading font-bold uppercase tracking-wide hover:bg-neon-cyan/20"
                      title="Като при изпращане: checklist + заредена роля"
                    >
                      <Download size={14} /> CSV — текущи получатели
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 border border-primary/35">
                  <Shield size={22} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-heading font-black text-foreground tracking-tight">Discord роля (масово DM)</h3>
                  <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed">
                    Всички членове на гилдията с роля ID <code className="text-[10px] bg-white/10 px-1 rounded">{CHILLRP_POLICE_DISCORD_ROLE_ID}</code> (настрой в <span className="font-mono">discordConstants</span> при нужда).
                    Не е нужно да са влизали в сайта. Смесва се с избраните от checklist (без дублиране).
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void fetchPoliceDiscordRecipients()}
                  disabled={policeRoleListLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/15 text-primary text-xs font-heading font-bold hover:bg-primary/25 disabled:opacity-50"
                >
                  {policeRoleListLoading ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                  Зареди от Discord роля
                </button>
                <button
                  type="button"
                  onClick={() => void savePoliceDiscordGroupPreset()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-muted-foreground text-xs font-heading font-bold hover:bg-white/10 hover:text-foreground"
                >
                  <Bookmark size={14} /> Запази като група в списъка
                </button>
                {discordIdsFromRole.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscordIdsFromRole([])}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-muted-foreground text-xs font-heading font-bold hover:bg-white/10 hover:text-foreground"
                  >
                    Изчисти ролята
                  </button>
                )}
              </div>
              {discordIdsFromRole.length > 0 && (
                <div className="text-xs font-body space-y-1">
                  <p className="text-neon-green">
                    Готови за DM от роля: <span className="font-heading font-bold">{discordIdsFromRoleReachable.length}</span>
                    {discordIdsFromRole.length !== discordIdsFromRoleReachable.length && (
                      <span className="text-muted-foreground">
                        {" "}
                        (от общо {discordIdsFromRole.length}; без профили със спрени DM към бота)
                      </span>
                    )}{" "}
                    плюс избраните от checklist.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Checklist: избери получатели */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-heading font-black tracking-widest uppercase text-muted-foreground">Checklist — избери получатели</span>
                  <SearchInput value={searchMessages} onChange={setSearchMessages} placeholder="Търси по име..." />
                  <button
                    type="button"
                    onClick={() => setMessageSelectedIds(new Set(profilesReachableForDm.map((p) => p.id)))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-bold hover:bg-neon-cyan/20"
                  >
                    <CheckSquare size={14} /> Всички
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageSelectedIds(new Set())}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-muted-foreground text-xs font-heading font-bold hover:bg-white/10 hover:text-foreground"
                  >
                    <Square size={14} /> Изчисти
                  </button>
                  <button
                    type="button"
                    onClick={() => messageSelectedIds.size > 0 && setDmGroupSaveModal(true)}
                    disabled={messageSelectedIds.size === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xs font-heading font-bold hover:bg-primary/20 disabled:opacity-50"
                  >
                    <Bookmark size={14} /> Запази като група
                  </button>
                </div>

                <div className="glass border border-white/10 rounded-2xl overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto p-2">
                    {profilesReachableForDm.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Users size={40} className="text-muted-foreground/40 mb-3" />
                        <p className="text-sm font-body text-muted-foreground">
                          {profilesWithDiscordId.length === 0
                            ? "Все още няма потребители с Discord."
                            : "Няма потребители с активни DM към бота — всички с Discord са маркирани като недостъпни за DM."}
                        </p>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          {profilesWithDiscordId.length === 0
                            ? "Ще се появят тук след първи вход в сайта с Discord."
                            : "След успешно изпратено съобщение профилът може да се върне в списъка автоматично."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {profilesReachableForDm
                          .filter((p) => !searchMessages || (p.discord_username || p.username || "").toLowerCase().includes(searchMessages.toLowerCase()))
                          .map((p) => {
                            const checked = messageSelectedIds.has(p.id);
                            return (
                              <label
                                key={p.id}
                                htmlFor={`msg-${p.id}`}
                                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                                  checked ? "border-neon-cyan/40 bg-neon-cyan/10" : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  id={`msg-${p.id}`}
                                  checked={checked}
                                  onChange={(e) => {
                                    setMessageSelectedIds((prev) => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(p.id);
                                      else next.delete(p.id);
                                      return next;
                                    });
                                  }}
                                  className="sr-only"
                                />
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
                                  {checked ? <CheckSquare size={18} /> : <Square size={18} className="opacity-60" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span className="font-heading font-semibold text-foreground text-sm truncate block">{p.discord_username || p.username || "—"}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono truncate block">ID: {p.discord_id}</span>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Текст и изпращане */}
                <div className="glass border border-neon-cyan/20 rounded-2xl p-5 space-y-4">
                  <label className="block text-xs font-heading font-bold tracking-widest uppercase text-neon-cyan">Текст на съобщението</label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Напр.: Здравей! Това е съобщение от екипа на TLR..."
                    rows={4}
                    maxLength={4000}
                    className="w-full px-4 py-3 rounded-xl glass border border-border text-sm bg-transparent placeholder:text-muted-foreground focus:border-neon-cyan/50 focus:outline-none resize-y"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <span className="text-[10px] text-muted-foreground">{messageText.length} / 4000</span>
                    <button
                      type="button"
                      onClick={() => void sendDiscordDmToSelected()}
                      disabled={
                        messageSending ||
                        (messageSelectedIds.size === 0 && discordIdsFromRoleReachable.length === 0) ||
                        !messageText.trim()
                      }
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neon-cyan/25 text-neon-cyan border border-neon-cyan/50 font-heading font-bold text-sm hover:bg-neon-cyan/35 transition-colors disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-neon-cyan/10"
                    >
                      {messageSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      Изпрати (checklist + роля)
                    </button>
                  </div>
                  {messageLastResult && (
                    <p className="text-xs text-muted-foreground">
                      Последно: изпратени <span className="text-neon-green font-semibold">{messageLastResult.sent}</span>, неуспешни <span className="text-destructive font-semibold">{messageLastResult.failed}</span>.
                    </p>
                  )}
                </div>
              </div>

              {/* Групи */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Bookmark size={16} className="text-primary" />
                  <h2 className="text-xs font-heading font-black tracking-widest uppercase text-muted-foreground">Запазени групи</h2>
                </div>
                <p className="text-[10px] text-muted-foreground font-body">Зареди избраните от checklist в една група с един клик.</p>
                {dmGroups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] py-8 px-4 text-center">
                    <Bookmark size={28} className="text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-body">Няма групи</p>
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">Избери потребители и „Запази като група“</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {dmGroups.map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 hover:border-primary/20 hover:bg-white/[0.04] transition-colors">
                        <div className="min-w-0 flex-1">
                          <span className="font-heading font-semibold text-foreground text-sm truncate block">{g.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {g.discordRoleId ? "Discord роля + " : ""}
                            {g.profileIds.length} от профили
                          </span>
                          {g.discordRoleId && (
                            <span className="text-[9px] font-mono text-primary/80 block truncate">роля {g.discordRoleId}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => void loadDmGroup(g)}
                            className="p-2 rounded-lg border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                            title="Зареди групата в checklist"
                            aria-label="Зареди"
                          >
                            <LogInIcon size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDmGroup(g.id)}
                            className="p-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                            title="Изтрий групата"
                            aria-label="Изтрий"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {dmGroupSaveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setDmGroupSaveModal(false)}>
            <div className="glass-strong border border-primary/30 rounded-2xl max-w-sm w-full p-6">
              <h3 className="font-heading font-black text-lg uppercase text-primary mb-3">Запази група</h3>
              <input
                type="text"
                value={dmGroupSaveName}
                onChange={(e) => setDmGroupSaveName(e.target.value)}
                placeholder="Име на групата"
                className="w-full px-4 py-2.5 rounded-xl glass border border-border text-sm bg-transparent mb-4"
                aria-label="Име на групата"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => { setDmGroupSaveModal(false); setDmGroupSaveName(""); }} className="flex-1 py-2 rounded-xl border border-border text-muted-foreground font-heading font-semibold text-sm">
                  Отказ
                </button>
                <button type="button" onClick={saveDmGroupAs} className="flex-1 py-2 rounded-xl bg-primary/20 text-primary border border-primary/40 font-heading font-bold text-sm">
                  Запази
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── USERS TAB ─── */}
        {tab === "users" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass border border-neon-cyan/25 rounded-xl p-5 text-center"><Users size={22} className="text-neon-cyan mx-auto mb-2" /><div className="text-3xl font-heading font-black text-foreground">{profiles.length}</div><div className="text-xs font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-1">Общо потребители</div></div>
              <div className="glass border border-primary/25 rounded-xl p-5 text-center"><Crown size={22} className="text-primary mx-auto mb-2" /><div className="text-3xl font-heading font-black text-foreground">{userRoles.filter(r => r.role === "admin").length}</div><div className="text-xs font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-1">Администратори</div></div>
              <div className="glass border border-neon-yellow/25 rounded-xl p-5 text-center"><UserCog size={22} className="text-neon-yellow mx-auto mb-2" /><div className="text-3xl font-heading font-black text-foreground">{userRoles.filter(r => r.role === "moderator").length}</div><div className="text-xs font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-1">Модератори</div></div>
            </div>
            <SearchInput value={searchUsers} onChange={setSearchUsers} placeholder="Търси по имейл / потребител..." />
            <div className="space-y-2">
              {filteredUsers.length === 0 ? <div className="text-center py-16 text-muted-foreground font-body">Няма резултати.</div> : (
                filteredUsers.map((p) => {
                  const userPurchases = purchases.filter(pu => pu.user_id === p.id);
                  const userSpent = userPurchases.reduce((s, pu) => s + (pu.price_eur || 0), 0);
                  const roles = getUserRole(p.id);
                  return (
                    <div key={p.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-primary/25 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xs font-heading font-bold shrink-0">{(p.username || "?")[0].toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold tracking-wider text-foreground text-sm truncate">{p.username || "—"}</span>
                          {roles.includes("admin") && <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary font-heading font-bold tracking-wider">👑 ADMIN</span>}
                          {roles.includes("moderator") && <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-neon-yellow/40 bg-neon-yellow/10 text-neon-yellow font-heading font-bold tracking-wider">⚡ MOD</span>}
                        </div>
                        <div className="text-xs text-muted-foreground font-body mt-0.5">Регистриран: {p.created_at ? new Date(p.created_at).toLocaleDateString("bg-BG") : "—"} • {userPurchases.length} покупки</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right mr-2"><div className="text-sm font-heading font-bold text-neon-green">{userPurchases.length > 0 ? `€${userSpent.toFixed(2)}` : "—"}</div></div>
                        <button onClick={() => toggleRole(p.id, "admin")} title={roles.includes("admin") ? "Премахни Admin" : "Направи Admin"}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${roles.includes("admin") ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary"}`}><Crown size={14} /></button>
                        <button onClick={() => toggleRole(p.id, "moderator")} title={roles.includes("moderator") ? "Премахни Mod" : "Направи Mod"}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${roles.includes("moderator") ? "border-neon-yellow/50 bg-neon-yellow/15 text-neon-yellow" : "border-border text-muted-foreground hover:border-neon-yellow/30 hover:text-neon-yellow"}`}><UserCog size={14} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ─── PRODUCTS TAB ─── */}
        {tab === "products" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <SearchInput value={searchProducts} onChange={setSearchProducts} placeholder="Търси продукт по име, slug или категория..." />
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => void syncSeedProducts()}
                  disabled={isStaffReadOnly || productSyncLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-cyan/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {productSyncLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Импорт от seed
                </button>
                <button
                  type="button"
                  onClick={openProductCreate}
                  disabled={isStaffReadOnly}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xs font-heading font-bold tracking-widest uppercase hover:bg-primary/20 transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Plus size={14} /> Нов продукт
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {dbProducts.length === 0 && (
                <div className="glass border border-neon-cyan/20 rounded-xl p-5 text-center">
                  <p className="text-muted-foreground font-body mb-2">
                    Няма продукти в базата. Каталогът на магазина се зарежда от таблицата <span className="font-mono text-foreground/80">products</span>.
                  </p>
                  <p className="text-sm text-neon-cyan font-heading font-bold mb-3">
                    Добави редове ръчно („Нов продукт“) или попълни <span className="font-mono">src/lib/shopSeedProducts.ts</span> и натисни „Импорт от seed“.
                  </p>
                  <button
                    type="button"
                    onClick={() => void syncSeedProducts()}
                    disabled={isStaffReadOnly || productSyncLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-cyan/20 transition-colors disabled:opacity-50"
                  >
                    {productSyncLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Импорт от seed
                  </button>
                </div>
              )}
              {filteredProducts.length === 0 && dbProducts.length > 0 ? (
                <div className="text-center py-16 text-muted-foreground font-body">Няма резултати.</div>
              ) : (
                filteredProducts.map((item) => {
                  const itemPurchases = purchases.filter((p) => p.product_name === item.name);
                  const itemRevenue = itemPurchases.reduce((s, p) => s + (p.price_eur || 0), 0);
                  return (
                    <div key={item.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-primary/25 transition-colors">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Package size={16} className="text-primary/50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold tracking-wider text-foreground text-sm truncate">{item.name}</span>
                          {!item.is_active && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-muted-foreground/35 bg-muted/40 text-muted-foreground font-heading font-bold">СКРИТ</span>
                          )}
                          {item.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary font-heading font-bold">{item.badge}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-body mt-0.5">
                          {categoryLabel(item.category)} • {item.price}{" "}
                          {item.stripe_price ? "• ✅ Stripe" : "• ⚠️ Без Stripe"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right mr-2">
                          <div className="text-sm font-heading font-bold text-neon-green">
                            {itemPurchases.length > 0 ? `€${itemRevenue.toFixed(2)}` : "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-body">{itemPurchases.length} продажби</div>
                        </div>
                        <button
                          type="button"
                          aria-label="Редактирай продукт"
                          onClick={() => openProductEdit(item)}
                          disabled={isStaffReadOnly}
                          className="p-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <Edit2 size={14} />
                        </button>
                        <DeleteBtn id={item.id} type="product" onDelete={deleteProduct} disabled={isStaffReadOnly} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ─── RULES TAB ─── */}
        {tab === "rules" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <div className="flex gap-2 items-center flex-wrap">
                {[{ value: "all", label: "Всички" }, ...RULE_PAGE_OPTIONS].map(p => (
                  <button key={p.value} onClick={() => setRulePageFilter(p.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold tracking-widest uppercase border transition-colors
                      ${rulePageFilter === p.value ? "border-primary/60 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-border/60"}`}>
                    {p.label}
                  </button>
                ))}
                <div className="flex-1 min-w-[150px]"><SearchInput value={searchRules} onChange={setSearchRules} placeholder="Търси правило..." /></div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button onClick={openRuleCreate} disabled={isStaffReadOnly} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xs font-heading font-bold tracking-widest uppercase hover:bg-primary/20 transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none">
                  <Plus size={14} /> Ново правило
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {filteredRules.length === 0 ? <div className="text-center py-16 text-muted-foreground font-body">Няма правила.</div> : (
                filteredRules.map((r) => (
                  <div key={r.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-primary/25 transition-colors">
                    <span className="text-xl shrink-0">{r.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold tracking-wider text-foreground text-sm truncate">{r.title}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan font-heading font-bold">{r.page.toUpperCase()}</span>
                        {!r.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-muted-foreground/35 bg-muted/40 text-muted-foreground font-heading font-bold">СКРИТ</span>}
                      </div>
                      <div className="text-xs text-muted-foreground font-body mt-0.5">{r.items.length} точки • {r.color} • #{r.sort_order}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" aria-label="Редактирай правило" onClick={() => openRuleEdit(r)} disabled={isStaffReadOnly} className="p-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"><Edit2 size={14} /></button>
                      <DeleteBtn id={r.id} type="rule" onDelete={deleteRule} disabled={isStaffReadOnly} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── WEB LOGS TAB ─── */}
        {tab === "logs" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-between flex-wrap">
              <div className="flex gap-2 items-center flex-wrap">
                {[
                  { value: "all", label: "Всички" },
                  { value: "site", label: "Сайт" },
                  { value: "shop", label: "Магазин" },
                  { value: "applications", label: "Кандидатури" },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setLogsModuleFilter(f.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold tracking-widest uppercase border transition-colors
                      ${logsModuleFilter === f.value ? "border-primary/60 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-border/60"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <SearchInput value={searchLogs} onChange={setSearchLogs} placeholder="Търси по събитие, детайли, страница, акаунт..." />
                <button onClick={() => { webLogsTableMissingRef.current = false; fetchWebLogs(); }} disabled={webLogsLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-cyan/20 transition-colors disabled:opacity-50">
                  {webLogsLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Обнови
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-body">
              Всички действия по сайта се записват тук (page_view, click, scroll, покупки, кандидатури и др.). Таблицата <code className="px-1 rounded bg-white/10">web_logs</code> се пълни от Edge Function <code className="px-1 rounded bg-white/10">log-activity</code>. Пусни <code className="px-1 rounded bg-white/10">RUN_THIS_web_logs.sql</code> в Supabase, ако таблицата липсва.
            </p>
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                {webLogsLoading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 size={24} className="animate-spin" /></div>
                ) : filteredWebLogs.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground font-body">Няма логове или няма съвпадения.</div>
                ) : (
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-background/95 border-b border-white/10 z-10">
                      <tr>
                        <th className="py-2 px-3 font-heading font-bold tracking-wider text-muted-foreground text-xs">Време</th>
                        <th className="py-2 px-3 font-heading font-bold tracking-wider text-muted-foreground text-xs">Събитие</th>
                        <th className="py-2 px-3 font-heading font-bold tracking-wider text-muted-foreground text-xs">Модул</th>
                        <th className="py-2 px-3 font-heading font-bold tracking-wider text-muted-foreground text-xs">Страница</th>
                        <th className="py-2 px-3 font-heading font-bold tracking-wider text-muted-foreground text-xs">Акаунт (кой е направил)</th>
                        <th className="py-2 px-3 font-heading font-bold tracking-wider text-muted-foreground text-xs">Детайли</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWebLogs.map((log) => (
                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-2 px-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("bg-BG", { dateStyle: "short", timeStyle: "medium" })}
                          </td>
                          <td className="py-2 px-3 font-heading font-semibold text-foreground/90">{log.event}</td>
                          <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded border border-white/20 bg-white/5">{log.module || "site"}</span></td>
                          <td className="py-2 px-3 text-muted-foreground font-mono text-xs truncate max-w-[120px]">{log.page}</td>
                          <td className="py-2 px-3 text-neon-cyan/90 font-mono text-xs truncate max-w-[180px]" title={log.user_email || "—"}>{log.user_email || "—"}</td>
                          <td className="py-2 px-3 text-foreground/80 text-xs truncate max-w-[200px]" title={log.details}>{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── SETTINGS TAB ─── */}
        {tab === "settings" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <div className="text-sm text-muted-foreground font-body">Управлявай глобални настройки: лого, hero банер, Discord, Minecraft IP/версия, текстове на началната страница и бот контекст (chillbot).</div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button onClick={seedSiteSettings} disabled={isStaffReadOnly || settingsSeedLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-cyan/20 transition-colors disabled:opacity-50 disabled:pointer-events-none">
                  {settingsSeedLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Добави липсващи настройки по подразбиране
                </button>
                <button onClick={openSettingCreate} disabled={isStaffReadOnly} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xs font-heading font-bold tracking-widest uppercase hover:bg-primary/20 transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none">
                  <Plus size={14} /> Нова настройка
                </button>
              </div>
            </div>

            <div className="glass border border-neon-cyan/20 rounded-xl p-5">
              <div className="text-xs font-heading font-bold tracking-widest uppercase text-neon-cyan mb-3">Настройки за главната страница, банера и отделните подсайтове</div>
              <p className="text-sm text-muted-foreground font-body mb-4">Ключове като <span className="font-mono">minecraft_server_address</span>, <span className="font-mono">discord_invite</span>, hero текстове и др. Ако нещо липсва, натисни „Добави липсващи настройки по подразбиране“. Редактирай от списъка по-долу.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {DEFAULT_SITE_SETTINGS.map((d) => {
                  const existing = siteSettings.find((s) => s.key === d.key);
                  return (
                    <div key={d.key} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg border border-white/5 bg-white/[0.02]">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-xs text-foreground truncate block">{d.key}</span>
                        <span className="text-[10px] text-muted-foreground truncate block">{d.description}</span>
                      </div>
                      {existing ? (
                        <button type="button" aria-label="Редактирай настройка" onClick={() => openSettingEdit(existing)} disabled={isStaffReadOnly} className="shrink-0 p-1.5 rounded border border-primary/30 text-primary hover:bg-primary/10 text-xs font-heading font-bold">
                          Редактирай
                        </button>
                      ) : (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-500 font-heading font-bold">липсва</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass border border-primary/20 rounded-xl p-5">
              <div className="text-xs font-heading font-bold tracking-widest uppercase text-primary mb-3">Branding (качване на лого/банер)</div>
              <p className="text-sm text-muted-foreground font-body mb-4">
                Важно: на live сайта (Netlify) не може да се записва в “файловете” на проекта. Качването става в Supabase Storage (bucket <span className="font-mono">uploads</span>),
                а сайтът показва изображението по URL.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass border border-white/8 rounded-xl p-4">
                  <div className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-2">Лого</div>
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-border text-sm font-body text-muted-foreground cursor-pointer hover:border-primary/30 transition-colors">
                    <Upload size={14} /> {brandingLogoFile ? brandingLogoFile.name : "Избери файл"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setBrandingLogoFile(e.target.files?.[0] || null)} />
                  </label>
                  <button
                    type="button"
                    onClick={() => uploadBranding("logo")}
                    disabled={isStaffReadOnly || brandingSaving || !brandingLogoFile}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-heading font-black text-xs tracking-widest uppercase transition-all disabled:opacity-50 bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25"
                  >
                    {brandingSaving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Качи лого
                  </button>
                </div>

                <div className="glass border border-white/8 rounded-xl p-4">
                  <div className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-2">Hero банер</div>
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-border text-sm font-body text-muted-foreground cursor-pointer hover:border-primary/30 transition-colors">
                    <Upload size={14} /> {brandingBannerFile ? brandingBannerFile.name : "Избери файл"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setBrandingBannerFile(e.target.files?.[0] || null)} />
                  </label>
                  <button
                    type="button"
                    onClick={() => uploadBranding("banner")}
                    disabled={isStaffReadOnly || brandingSaving || !brandingBannerFile}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-heading font-black text-xs tracking-widest uppercase transition-all disabled:opacity-50 bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25"
                  >
                    {brandingSaving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Качи банер
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground/70 font-body mt-3">
                Сайтът чете ключове <span className="font-mono">site_logo_url</span> и <span className="font-mono">site_banner_url</span> от таблицата <span className="font-mono">site_settings</span>.
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground">Всички записи в site_settings</div>
              {siteSettings.length === 0 ? <div className="text-center py-16 text-muted-foreground font-body">Няма настройки. Натисни „Добави липсващи настройки по подразбиране“ или „Нова настройка“. </div> : (
                siteSettings.map((s) => (
                  <div key={s.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-primary/25 transition-colors">
                    <Settings size={16} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold tracking-wider text-neon-cyan text-sm">{s.key}</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-body mt-0.5 truncate">{s.value}</div>
                      {s.description && <div className="text-[10px] text-muted-foreground/60 font-body mt-0.5">{s.description}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" aria-label="Редактирай настройка" onClick={() => openSettingEdit(s)} disabled={isStaffReadOnly} className="p-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"><Edit2 size={14} /></button>
                      <DeleteBtn id={s.id} type="setting" onDelete={deleteSetting} disabled={isStaffReadOnly} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── DEVELOPER PANEL ─── */}
        {tab === "developer" && (
          <DeveloperPanel isStaffReadOnly={isStaffReadOnly} onLog={logAdminAction} />
        )}

      {/* ── Gang Edit Modal ── */}
      {gangEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in p-4" onClick={(e) => e.target === e.currentTarget && setGangEditModal(null)}>
          <div className="glass-strong border border-neon-cyan/30 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-in-up p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-black text-lg tracking-widest uppercase text-neon-cyan">✏️ Редактирай кандидатура</h2>
              <button type="button" aria-label="Затвори прозорец" onClick={() => setGangEditModal(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Име на бандата" value={gangEditForm.name} onChange={(v: string) => setGangEditForm(f => ({ ...f, name: v }))} required />
                <div>
                  <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Тип *</label>
                  <div className="flex gap-1 flex-wrap">
                    {GANG_TYPE_OPTIONS.map(t => (
                      <button key={t} onClick={() => setGangEditForm(f => ({ ...f, gang_type: t }))}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-heading font-bold transition-colors ${gangEditForm.gang_type === t ? "border-neon-cyan/50 bg-neon-cyan/15 text-neon-cyan" : "border-border text-muted-foreground"}`}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Лидер" value={gangEditForm.leader} onChange={(v: string) => setGangEditForm(f => ({ ...f, leader: v }))} required />
                <FieldInput label="Discord" value={gangEditForm.discord_username} onChange={(v: string) => setGangEditForm(f => ({ ...f, discord_username: v }))} />
              </div>
              <FieldInput label="Членове" value={gangEditForm.members} onChange={(v: string) => setGangEditForm(f => ({ ...f, members: v }))} />
              <FieldTextarea label="Цел" value={gangEditForm.goal} onChange={(v: string) => setGangEditForm(f => ({ ...f, goal: v }))} rows={2} />
              <FieldTextarea label="История" value={gangEditForm.history} onChange={(v: string) => setGangEditForm(f => ({ ...f, history: v }))} rows={3} />
              <FieldTextarea label="Правила" value={gangEditForm.rules} onChange={(v: string) => setGangEditForm(f => ({ ...f, rules: v }))} rows={2} />
              <FieldTextarea label="RP примери" value={gangEditForm.rp_examples} onChange={(v: string) => setGangEditForm(f => ({ ...f, rp_examples: v }))} rows={3} />
              <div>
                <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Статус</label>
                <div className="flex gap-2">
                  {(["pending", "approved", "rejected"] as const).map(s => (
                    <button key={s} onClick={() => setGangEditForm(f => ({ ...f, status: s }))}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-heading font-bold transition-colors ${gangEditForm.status === s ? statusColor(s) : "border-border text-muted-foreground"}`}>
                      {statusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
              <FieldTextarea label="Бележка от админ" value={gangEditForm.admin_note} onChange={(v: string) => setGangEditForm(f => ({ ...f, admin_note: v }))} rows={2} placeholder="Опционална бележка..." />
              <SaveButton onClick={saveGangEdit} saving={gangEditSaving} disabled={isStaffReadOnly} />
            </div>
          </div>
        </div>
      )}

      {/* ── Product Modal ── */}
      {productModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in p-4"
          onClick={(e) => e.target === e.currentTarget && setProductModal(null)}
        >
          <div className="glass-strong border border-primary/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-black text-lg tracking-widest uppercase text-primary">
                {productModal.id ? "✏️ Редактирай" : "➕ Нов"} продукт
              </h2>
              <button type="button" aria-label="Затвори прозорец" onClick={() => setProductModal(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldInput
                  label="Име"
                  value={productForm.name}
                  onChange={(v: string) => setProductForm((f) => ({ ...f, name: v }))}
                  required
                />
                <div>
                  <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Slug *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={productForm.slug}
                      onChange={(e) => setProductForm((f) => ({ ...f, slug: e.target.value }))}
                      placeholder="unique-slug"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl glass border border-border focus:border-primary/50 focus:outline-none text-sm font-body text-foreground bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setProductForm((f) => ({ ...f, slug: slugifyProductSlug(f.name) }))}
                      className="shrink-0 px-2 py-2 rounded-xl border border-white/15 text-[10px] font-heading font-bold uppercase text-muted-foreground hover:text-foreground hover:border-white/25"
                    >
                      От име
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput
                  label="Цена"
                  value={productForm.price}
                  onChange={(v: string) => setProductForm((f) => ({ ...f, price: v }))}
                  required
                  placeholder="5.00 EUR"
                />
                <FieldInput
                  label="Оригинална цена"
                  value={productForm.original_price}
                  onChange={(v: string) => setProductForm((f) => ({ ...f, original_price: v }))}
                  placeholder="10.00 EUR"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Subtitle" value={productForm.subtitle} onChange={(v: string) => setProductForm((f) => ({ ...f, subtitle: v }))} />
                <FieldInput label="Badge" value={productForm.badge} onChange={(v: string) => setProductForm((f) => ({ ...f, badge: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Категория</label>
                  <div className="flex gap-1 flex-wrap">
                    {CATEGORY_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setProductForm((f) => ({ ...f, category: c }))}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-heading font-bold transition-colors ${
                          productForm.category === c ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        {categoryLabel(c)}
                      </button>
                    ))}
                  </div>
                </div>
                <FieldInput
                  label="Stripe Price ID"
                  value={productForm.stripe_price}
                  onChange={(v: string) => setProductForm((f) => ({ ...f, stripe_price: v }))}
                  placeholder="price_xxx"
                />
              </div>
              <FieldTextarea
                label="Кратко описание"
                value={productForm.description}
                onChange={(v: string) => setProductForm((f) => ({ ...f, description: v }))}
                rows={2}
              />
              <FieldTextarea
                label="Дълго описание"
                value={productForm.long_description}
                onChange={(v: string) => setProductForm((f) => ({ ...f, long_description: v }))}
                rows={3}
              />
              <FieldTextarea
                label="Включва (по 1 на ред)"
                value={productForm.includes}
                onChange={(v: string) => setProductForm((f) => ({ ...f, includes: v }))}
                placeholder="Елемент 1&#10;Елемент 2"
                rows={4}
              />
              <FieldTextarea
                label="Галерия URL (по един на ред)"
                value={productForm.product_media_urls}
                onChange={(v: string) => setProductForm((f) => ({ ...f, product_media_urls: v }))}
                rows={3}
                placeholder="https://..."
              />
              <div>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-border text-sm font-body text-muted-foreground cursor-pointer hover:border-primary/30 transition-colors w-fit">
                  <Upload size={14} /> {productGalleryUploading ? "Качване…" : "Добави файлове към галерията"}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    disabled={productGalleryUploading}
                    onChange={(e) => void handleProductGalleryFilesChange(e.target.files)}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput
                  label="Ред (sort order)"
                  value={productForm.sort_order}
                  onChange={(v: number) => setProductForm((f) => ({ ...f, sort_order: v }))}
                  type="number"
                />
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.is_active}
                      onChange={(e) => setProductForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="accent-primary"
                    />
                    <span className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground">Активен</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Корица (снимка)</label>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-border text-sm font-body text-muted-foreground cursor-pointer hover:border-primary/30 transition-colors">
                  <Upload size={14} /> {productImageFile ? productImageFile.name : "Избери файл"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setProductImageFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <button
                type="button"
                onClick={() => setProductAdvancedOpen((o) => !o)}
                className="w-full text-left text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground border border-white/10 rounded-xl px-3 py-2 hover:bg-white/5"
              >
                {productAdvancedOpen ? "▼" : "▶"} Opcrime / шаблони / in-game
              </button>
              {productAdvancedOpen && (
                <div className="space-y-3 border border-white/10 rounded-xl p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput
                      label="GC amount"
                      value={productForm.opcrime_gc_amount}
                      onChange={(v: string) => setProductForm((f) => ({ ...f, opcrime_gc_amount: v }))}
                      placeholder="число или празно"
                    />
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.opcrime_use_redeem_code}
                          onChange={(e) => setProductForm((f) => ({ ...f, opcrime_use_redeem_code: e.target.checked }))}
                          className="accent-primary"
                        />
                        <span className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground">Redeem код</span>
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput
                      label="Org money amount"
                      value={productForm.opcrime_org_money_amount}
                      onChange={(v: string) => setProductForm((f) => ({ ...f, opcrime_org_money_amount: v }))}
                    />
                    <FieldInput
                      label="Org money account"
                      value={productForm.opcrime_org_money_account}
                      onChange={(v: string) => setProductForm((f) => ({ ...f, opcrime_org_money_account: v }))}
                    />
                  </div>
                  <FieldTextarea
                    label="In-game grants (JSON)"
                    value={productForm.ingame_grants_json}
                    onChange={(v: string) => setProductForm((f) => ({ ...f, ingame_grants_json: v }))}
                    rows={4}
                    placeholder="{}"
                  />
                  <FieldTextarea
                    label="Подсказка за играч"
                    value={productForm.ingame_player_hint}
                    onChange={(v: string) => setProductForm((f) => ({ ...f, ingame_player_hint: v }))}
                    rows={2}
                  />
                  <FieldTextarea
                    label="Шаблон бележка (превод) {{reference}} …"
                    value={productForm.transfer_note_template}
                    onChange={(v: string) => setProductForm((f) => ({ ...f, transfer_note_template: v }))}
                    rows={2}
                  />
                  <FieldTextarea
                    label="Discord DM шаблон при покупка"
                    value={productForm.discord_purchase_dm_template}
                    onChange={(v: string) => setProductForm((f) => ({ ...f, discord_purchase_dm_template: v }))}
                    rows={3}
                  />
                </div>
              )}

              <SaveButton onClick={() => void saveProduct()} saving={productSaving} disabled={isStaffReadOnly} />
            </div>
          </div>
        </div>
      )}

      {/* ── Rule Modal ── */}
      {ruleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in p-4" onClick={(e) => e.target === e.currentTarget && setRuleModal(null)}>
          <div className="glass-strong border border-primary/30 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-in-up p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-black text-lg tracking-widest uppercase text-primary">{ruleModal.id ? "✏️ Редактирай" : "➕ Ново"} Правило</h2>
              <button type="button" aria-label="Затвори прозорец" onClick={() => setRuleModal(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Страница *</label>
                <div className="flex gap-2">{RULE_PAGE_OPTIONS.map(p => (
                  <button key={p.value} onClick={() => setRuleForm(f => ({ ...f, page: p.value }))} className={`px-3 py-1.5 rounded-lg border text-xs font-heading font-bold transition-colors ${ruleForm.page === p.value ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{p.label}</button>
                ))}</div></div>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Емоджи" value={ruleForm.emoji} onChange={(v: string) => setRuleForm(f => ({ ...f, emoji: v }))} placeholder="🔫" />
                <FieldInput label="Заглавие" value={ruleForm.title} onChange={(v: string) => setRuleForm(f => ({ ...f, title: v }))} required />
              </div>
              <div><label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Цвят</label>
                <div className="flex gap-2 flex-wrap">{RULE_COLOR_OPTIONS.map(c => (
                  <button key={c} onClick={() => setRuleForm(f => ({ ...f, color: c }))} className={`px-3 py-1.5 rounded-lg border text-xs font-heading font-bold capitalize transition-colors ${ruleForm.color === c ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{c === "accent" ? "акцент" : c === "red" ? "основен" : c}</button>
                ))}</div></div>
              <FieldTextarea label="Точки (по 1 на ред)" value={ruleForm.items} onChange={(v: string) => setRuleForm(f => ({ ...f, items: v }))} rows={5} placeholder="Точка 1&#10;Точка 2" />
              <FieldInput label="Бележка (note)" value={ruleForm.note} onChange={(v: string) => setRuleForm(f => ({ ...f, note: v }))} placeholder="Опционална бележка" />
              <FieldInput label="Ред (sort order)" value={ruleForm.sort_order} onChange={(v: number) => setRuleForm(f => ({ ...f, sort_order: v }))} type="number" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ruleForm.is_active} onChange={(e) => setRuleForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-primary" />
                <span className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground">Активно</span>
              </label>
              <SaveButton onClick={saveRule} saving={ruleSaving} disabled={isStaffReadOnly} />
            </div>
          </div>
        </div>
      )}

      {/* ── Setting Modal ── */}
      {settingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in p-4" onClick={(e) => e.target === e.currentTarget && setSettingModal(null)}>
          <div className="glass-strong border border-primary/30 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-in-up p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-black text-lg tracking-widest uppercase text-primary">{settingModal.id ? "✏️ Редактирай" : "➕ Нова"} Настройка</h2>
              <button type="button" aria-label="Затвори прозорец" onClick={() => setSettingModal(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <FieldInput label="Ключ" value={settingForm.key} onChange={(v: string) => setSettingForm(f => ({ ...f, key: v }))} required placeholder="discord_invite" />
              <FieldTextarea label="Стойност" value={settingForm.value} onChange={(v: string) => setSettingForm(f => ({ ...f, value: v }))} rows={3} />
              <FieldInput label="Описание" value={settingForm.description} onChange={(v: string) => setSettingForm(f => ({ ...f, description: v }))} placeholder="Кратко описание" />
              <SaveButton onClick={saveSetting} saving={settingSaving} disabled={isStaffReadOnly} />
            </div>
          </div>
        </div>
      )}

      {/* Detail modal for applications */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in p-4" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="glass-strong border border-primary/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
            <div className="p-6 border-b border-white/8 flex items-center justify-between">
              <h2 className="text-xl font-heading font-black tracking-widest uppercase text-primary">{selected.name}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { openGangEdit(selected); }} disabled={isStaffReadOnly} className="text-neon-cyan hover:text-neon-cyan/80 transition-colors disabled:opacity-50 disabled:pointer-events-none" title="Редактирай"><Edit2 size={18} /></button>
                <button onClick={() => { setDeleteConfirm({ id: selected.id, type: "app" }); }} className="text-destructive hover:text-destructive/80 transition-colors" title="Изтрий"><Trash2 size={18} /></button>
                <button type="button" aria-label="Затвори" onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><XCircle size={20} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {deleteConfirm?.id === selected.id && deleteConfirm?.type === "app" && (
                <div className="glass border border-destructive/40 rounded-xl p-4 flex items-center gap-3">
                  <AlertTriangle size={20} className="text-destructive shrink-0" />
                  <div className="flex-1"><div className="text-sm font-heading font-bold text-destructive">Сигурен ли си?</div><div className="text-xs text-muted-foreground font-body">Тази кандидатура ще бъде изтрита завинаги.</div></div>
                  <button onClick={() => deleteApp(selected.id)} className="px-3 py-1.5 rounded-lg border border-destructive/50 bg-destructive/15 text-destructive text-xs font-heading font-bold hover:bg-destructive/25 transition-colors">Изтрий</button>
                  <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-heading font-bold hover:border-border/60 transition-colors">Отказ</button>
                </div>
              )}
              {[
                { label: "Тип", value: selected.gang_type }, { label: "Лидер", value: selected.leader },
                { label: "Членове", value: selected.members }, { label: "Discord", value: selected.discord_username || "—" },
                { label: "Цел", value: selected.goal }, { label: "История", value: selected.history },
                { label: "Правила", value: selected.rules }, { label: "RP примери", value: selected.rp_examples },
              ].map((f) => (
                <div key={f.label}><div className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">{f.label}</div><div className="text-sm font-body text-foreground/80 whitespace-pre-wrap glass border border-white/5 rounded-lg px-3 py-2">{f.value}</div></div>
              ))}
              {selected.status === "pending" && (
                <div>
                  <div className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-2">Бележка от Администрация</div>
                  <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Опционална бележка за кандидата..."
                    className="w-full px-3 py-2 rounded-xl glass border border-border focus:border-primary/50 focus:outline-none text-sm font-body text-foreground placeholder:text-muted-foreground bg-transparent resize-none h-24" />
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => updateStatus(selected.id, "approved")} disabled={isStaffReadOnly} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neon-green/50 bg-neon-green/10 text-neon-green font-heading font-bold tracking-widest uppercase text-sm hover:bg-neon-green/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"><CheckCircle size={16} /> Одобри</button>
                    <button onClick={() => updateStatus(selected.id, "rejected")} disabled={isStaffReadOnly} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive font-heading font-bold tracking-widest uppercase text-sm hover:bg-destructive/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"><XCircle size={16} /> Откажи</button>
                  </div>
                </div>
              )}
              {selected.status !== "pending" && selected.admin_note && (
                <div><div className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Бележка от Администрация</div><div className="text-sm font-body text-foreground/80 glass border border-white/5 rounded-lg px-3 py-2">{selected.admin_note}</div></div>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}
