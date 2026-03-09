import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, CheckCircle, XCircle, LogIn, LogOut, Eye, BarChart3, ShoppingBag, Euro, TrendingUp,
  Download, Users, Trash2, Search, Package, UserCog, Crown, AlertTriangle, Plus, Edit2, X, Loader2, Upload, UserPlus as UserPlusIcon,
  HelpCircle, BookOpen, Settings, FileText, Activity
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { type ShopItem, mapDbProduct } from "@/lib/shopData";
import { shopSeedProducts } from "@/lib/shopSeedProducts";
import { defaultHandbookSnapshot } from "@/lib/police-handbook-content";
import { defaultFaqItems } from "@/pages/FAQ";
import { SERVER_RULES } from "@/lib/server-rules";
import { DISCORD_RULES } from "@/lib/discord-rules";
import { CRIME_RULES } from "@/lib/crime-rules";
import { BAZAAR_RULES } from "@/lib/bazaar-rules";

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

type Profile = {
  id: string; username: string | null; created_at: string | null;
};

type UserRole = {
  id: string; user_id: string; role: "admin" | "moderator";
};

type StaffMember = {
  id: string; name: string; role: string; icon: string; color: string; bg: string;
  avatar_url: string | null; avatar_scale: string | null; sort_order: number;
};

// Ред на ролите: Основател #0, после #1, #2, ... (същият ред като в sync-staff-from-discord)
const STAFF_ROLE_ORDER: Record<string, number> = {
  "Основател": 0, "Owner": 1, "Lead Dev": 2, "Panel Engineer": 3, "Developer": 4,
  "Management": 5, "Staff Leader": 6, "Content Manager": 7, "Administrator": 8,
  "Moderator": 9, "Ticket Support": 10,
};

type DbProduct = {
  id: string; slug: string; name: string; subtitle: string; image_url: string | null;
  price: string; original_price: string; description: string; long_description: string;
  includes: string[]; badge: string | null; category: string; stripe_price: string | null;
  sort_order: number; is_active: boolean;
};

type FaqItem = {
  id: string; category: string; question: string; answer: string;
  sort_order: number; is_active: boolean;
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

const ICON_OPTIONS = ["crown", "star", "shield", "headphones", "briefcase", "code"];
const COLOR_OPTIONS = [
  { label: "Жълто", value: "text-neon-yellow", bg: "border-neon-yellow/30 bg-[hsl(45_90%_55%/0.07)]" },
  { label: "Лилаво", value: "text-neon-purple", bg: "border-neon-purple/30 bg-[hsl(271_76%_65%/0.07)]" },
  { label: "Циан", value: "text-neon-cyan", bg: "border-neon-cyan/30 bg-[hsl(182_80%_55%/0.07)]" },
  { label: "Червено", value: "text-neon-red", bg: "border-neon-red/30 bg-[hsl(0_80%_55%/0.07)]" },
  { label: "Зелено", value: "text-neon-green", bg: "border-neon-green/30 bg-[hsl(142_70%_45%/0.07)]" },
  { label: "Сиво", value: "text-foreground/70", bg: "border-white/10 bg-white/[0.03]" },
];
const CATEGORY_OPTIONS = ["vip", "cars", "businesses", "gang", "other"];
const RULE_COLOR_OPTIONS = ["red", "cyan", "yellow", "purple", "green"];
const RULE_PAGE_OPTIONS = [
  { value: "discord", label: "Discord" },
  { value: "server", label: "Сървър" },
  { value: "crime", label: "Криминал" },
  { value: "bazaar", label: "Базар / Магазин" },
];
const GANG_TYPE_OPTIONS = ["Ballas", "Vagos", "The Families", "Marabunta Grande", "The Lost MC"];

/** Всички ключове за site_settings, използвани по сайта (начална, банер). При „Добави липсващи“ се вмъкват само тези, които липсват. */
const DEFAULT_SITE_SETTINGS: { key: string; value: string; description: string }[] = [
  { key: "discord_invite", value: "https://discord.gg/chillroleplay", description: "Линк за покана Discord (начална, банер, бутони)" },
  { key: "launch_date", value: "2026-03-20T20:00:00+02:00", description: "Дата и час на пускане (банер обратно броене)" },
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
  { key: "story_desc_1", value: "В ChillRP не се раждаш с власт. Изграждаш я. Чрез решения, съюзи и истории, които другите помнят.", description: "Секция История параграф 1" },
  { key: "story_desc_2", value: "Всеки разговор има смисъл. Всяка сделка може да те издигне или унищожи.", description: "Секция История параграф 2" },
  { key: "trailer_title_1", value: "Почувствай", description: "Трейлър заглавие 1" },
  { key: "trailer_title_2", value: "света.", description: "Трейлър заглавие 2" },
  { key: "trailer_desc", value: "Трейлърът на ChillRP е на път. Очаквайте скоро.", description: "Трейлър описание" },
  { key: "gang_title_1", value: "Искаш", description: "Секция Генг заглавие 1" },
  { key: "gang_title_2", value: "властта?", description: "Секция Генг заглавие 2" },
  { key: "gang_title_3", value: "Спечели я.", description: "Секция Генг заглавие 3" },
  { key: "gang_desc", value: "Организацията не се купува — заслужава се. Оригинална концепция, активен RP, максимум 6 члена.", description: "Секция Генг описание" },
  { key: "shop_title", value: "Подкрепи ChillRP", description: "Секция Магазин заглавие" },
  { key: "shop_desc", value: "Вземи ексклузивни предимства и помогни за развитието на сървъра.", description: "Секция Магазин описание" },
];

type TabId = "apps" | "stats" | "users" | "products" | "staff" | "faq" | "rules" | "settings" | "handbook";

// Стабилни компоненти за полета — извън AdminPanel, за да не се пресъздават при ререндер и да не губят фокус
function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 rounded-xl glass border border-border focus:border-neon-purple/50 focus:outline-none text-sm font-body text-foreground placeholder:text-muted-foreground bg-transparent" />
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, required, type = "text" }: { label: string; value: string | number; onChange: (v: string | number) => void; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">{label}{required && " *"}</label>
      <input type={type} value={value} onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder} className="w-full px-3 py-2 rounded-xl glass border border-border focus:border-neon-purple/50 focus:outline-none text-sm font-body text-foreground bg-transparent" />
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full px-3 py-2 rounded-xl glass border border-border focus:border-neon-purple/50 focus:outline-none text-sm font-body text-foreground bg-transparent resize-none" />
    </div>
  );
}

export default function AdminPanelFull() {
  const [session, setSession] = useState<any>(null);
  const [discordLoginLoading, setDiscordLoginLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabId>("apps");
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Staff
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [staffModal, setStaffModal] = useState<StaffMember | null>(null);
  const [staffForm, setStaffForm] = useState({ name: "", role: "", icon: "shield", color: "text-neon-purple", avatar_scale: "scale-[2.2]", sort_order: 0 });
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffAvatarFile, setStaffAvatarFile] = useState<File | null>(null);
  const [staffSyncLoading, setStaffSyncLoading] = useState(false);

  // Products
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [productModal, setProductModal] = useState<DbProduct | null>(null);
  const [productSyncLoading, setProductSyncLoading] = useState(false);
  const [productForm, setProductForm] = useState({
    slug: "", name: "", subtitle: "", price: "", original_price: "", description: "", long_description: "",
    includes: "", badge: "", category: "other", stripe_price: "", sort_order: 0, is_active: true,
  });
  const [productSaving, setProductSaving] = useState(false);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);

  // FAQ
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [faqModal, setFaqModal] = useState<FaqItem | null>(null);
  const [faqForm, setFaqForm] = useState({ category: "", question: "", answer: "", sort_order: 0, is_active: true });
  const [faqSaving, setFaqSaving] = useState(false);

  // Rules
  const [ruleSections, setRuleSections] = useState<RuleSection[]>([]);
  const [ruleModal, setRuleModal] = useState<RuleSection | null>(null);
  const [ruleForm, setRuleForm] = useState({ page: "discord", emoji: "", title: "", color: "purple", items: "", note: "", sort_order: 0, is_active: true });
  const [ruleSaving, setRuleSaving] = useState(false);
  const [rulePageFilter, setRulePageFilter] = useState<string>("all");

  // Site Settings
  const [siteSettings, setSiteSettings] = useState<SiteSetting[]>([]);
  const [settingModal, setSettingModal] = useState<SiteSetting | null>(null);
  const [settingForm, setSettingForm] = useState({ key: "", value: "", description: "" });
  const [settingSaving, setSettingSaving] = useState(false);
  const [settingsSeedLoading, setSettingsSeedLoading] = useState(false);

  // Search states
  const [searchApps, setSearchApps] = useState("");
  const [searchUsers, setSearchUsers] = useState("");
  const [searchPurchases, setSearchPurchases] = useState("");
  const [searchProducts, setSearchProducts] = useState("");
  const [searchStaff, setSearchStaff] = useState("");
  const [searchFaq, setSearchFaq] = useState("");
  const [searchRules, setSearchRules] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: string } | null>(null);

  // Police handbook (admin edit + backups)
  const [handbookJson, setHandbookJson] = useState("{}");
  const [handbookBackups, setHandbookBackups] = useState<{ id: string; created_at: string }[]>([]);
  const [handbookLoading, setHandbookLoading] = useState(false);
  const [handbookSaving, setHandbookSaving] = useState(false);
  const [handbookBackupsLoading, setHandbookBackupsLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) checkSiteRole();
    else { setSiteRole(null); setRoleChecked(false); }
  }, [session]);

  useEffect(() => {
    if (session && isAdmin) {
      fetchPurchases(); fetchProfiles(); fetchUserRoles(); fetchStaff(); fetchProducts();
      fetchFaq(); fetchRules(); fetchSettings();
    }
  }, [session, isAdmin]);

  useEffect(() => {
    if (session && isAdmin) fetchApps();
  }, [session, isAdmin, filter]);

  useEffect(() => {
    if (session && isAdmin && tab === "handbook") {
      fetchHandbook();
      fetchHandbookBackups();
      ensureHandbookDailyBackup();
    }
  }, [session, isAdmin, tab]);

  // Секциите за Болница/Сервиз вече не се конфигурират от админ панела; оставени са само бекенд настройките.

  // ── Admin log helper ──
  async function logAdminAction(action: string, details: string) {
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.origin === "http://localhost:8080" || window.location.origin === "http://localhost:5173")) return;
    try {
      await supabase.functions.invoke("notify-admin-log", {
        body: { action, details, admin_email: session?.user?.email || "unknown" },
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

  async function fetchPurchases() {
    setStatsLoading(true);
    const { data } = await supabase.from("purchases").select("*").order("created_at", { ascending: false });
    if (data) setPurchases(data as Purchase[]);
    setStatsLoading(false);
  }

  async function fetchProfiles() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) setProfiles(data as Profile[]);
  }

  async function fetchUserRoles() {
    const { data } = await supabase.from("user_roles").select("*");
    if (data) setUserRoles(data as UserRole[]);
  }

  async function fetchStaff() {
    const { data } = await supabase.from("staff_members").select("*").order("sort_order", { ascending: true });
    if (data) setStaffMembers(data as StaffMember[]);
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

  async function fetchFaq() {
    const { data, error } = await supabase.from("faq_items").select("*").order("sort_order", { ascending: true });
    if (error) {
      console.error("fetchFaq", error);
      toast.error("Грешка при зареждане на FAQ: " + error.message);
      setFaqItems([]);
      return;
    }
    setFaqItems((data || []) as FaqItem[]);
  }

  async function fetchRules() {
    const { data, error } = await supabase.from("rule_sections").select("*").order("sort_order", { ascending: true });
    if (error) {
      if (error.code !== "42501" && error.code !== "PGRST301") toast.error("Грешка при зареждане на правила: " + error.message);
      setRuleSections([]);
      return;
    }
    setRuleSections((data || []) as RuleSection[]);
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

  async function uploadFile(file: File, folder: string): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("uploads").upload(path, file);
    if (error) { toast.error("Грешка при качване на файл"); return null; }
    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
    return urlData.publicUrl;
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
    setGangEditModal(null); setGangEditSaving(false); setSelected(null); fetchApps();
  }

  // ── Staff CRUD ──
  function openStaffCreate() {
    setStaffModal({} as StaffMember);
    setStaffForm({ name: "", role: "", icon: "shield", color: "text-neon-purple", avatar_scale: "scale-[2.2]", sort_order: staffMembers.length + 1 });
    setStaffAvatarFile(null);
  }
  function openStaffEdit(s: StaffMember) {
    setStaffModal(s);
    setStaffForm({ name: s.name, role: s.role, icon: s.icon, color: s.color, avatar_scale: s.avatar_scale || "scale-[2.2]", sort_order: s.sort_order });
    setStaffAvatarFile(null);
  }
  async function saveStaff() {
    if (!staffForm.name || !staffForm.role) { toast.error("Попълни име и роля!"); return; }
    setStaffSaving(true);
    let avatar_url = staffModal?.avatar_url || null;
    if (staffAvatarFile) {
      avatar_url = await uploadFile(staffAvatarFile, "staff");
      if (!avatar_url) { setStaffSaving(false); return; }
    }
    const colorOpt = COLOR_OPTIONS.find(c => c.value === staffForm.color);
    const payload = {
      name: staffForm.name, role: staffForm.role, icon: staffForm.icon,
      color: staffForm.color, bg: colorOpt?.bg || "border-white/10 bg-white/[0.03]",
      avatar_url, avatar_scale: staffForm.avatar_scale, sort_order: staffForm.sort_order,
    };
    const isEdit = !!staffModal?.id;
    if (isEdit) {
      const { error } = await supabase.from("staff_members").update(payload).eq("id", staffModal.id);
      if (error) { toast.error("Грешка при обновяване"); setStaffSaving(false); return; }
      toast.success("✅ Стаф членът е обновен");
    } else {
      const { error } = await supabase.from("staff_members").insert(payload);
      if (error) { toast.error("Грешка при създаване"); setStaffSaving(false); return; }
      toast.success("✅ Нов стаф член добавен");
    }
    logAdminAction(isEdit ? "update_staff" : "create_staff", `${isEdit ? "Обновен" : "Създаден"} стаф: ${staffForm.name} (${staffForm.role})`);
    setStaffModal(null); setStaffSaving(false); fetchStaff();
  }
  async function deleteStaff(id: string) {
    const member = staffMembers.find(s => s.id === id);
    const { error } = await supabase.from("staff_members").delete().eq("id", id);
    if (error) { toast.error("Грешка при изтриване"); return; }
    toast.success("🗑️ Стаф членът е изтрит"); setDeleteConfirm(null); fetchStaff();
    logAdminAction("delete_staff", `Изтрит стаф: ${member?.name || id}`);
  }
  async function syncStaffFromDiscord() {
    if (!session?.access_token) { toast.error("Няма активна сесия."); return; }
    setStaffSyncLoading(true);
    try {
      const { data: refreshData } = await supabase.auth.refreshSession();
      const token = refreshData.session?.access_token ?? session.access_token;
      if (!token) { toast.error("Сесията изтече. Излез и влез отново с Discord."); setStaffSyncLoading(false); return; }
      const { data, error } = await supabase.functions.invoke("sync-staff-from-discord", {
        body: { userToken: token },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) {
        const is401 = (error as { message?: string })?.message?.includes("non-2xx");
        if (is401) {
          toast.error("Шлюзът все още връща 401. Провери: Edge Functions → sync-staff-from-discord → Details → „Verify JWT with legacy secret” да е OFF и натисни Save. Презареди страницата и опитай пак.");
          setStaffSyncLoading(false);
          return;
        }
        throw error;
      }
      if (data?.ok) {
        toast.success(`✅ Синхронизирани ${data.count ?? 0} стаф члена от Discord.`);
        fetchStaff();
      } else {
        const err = data?.error ?? "sync_failed";
        const msg =
          err === "unauthorized"
            ? "Нямате право (нужна е роля Основател или Owner в Discord)."
            : err === "server_config"
              ? "Липсва конфигурация в Supabase (DISCORD_BOT_TOKEN и др.)."
              : err === "discord_api_error"
                ? "Грешка от Discord API. Проверете бота и сървъра."
                : err === "db_delete" || err === "db_insert"
                  ? "Грешка при запис в базата. Проверете таблицата staff_members."
                  : err === "server_error"
                    ? "Временна грешка на сървъра. Опитайте след малко."
                    : "Грешка при синхронизация.";
        toast.error(msg);
      }
    } catch (e) {
      console.error(e);
      const is401 = (e as { message?: string })?.message?.includes("non-2xx") ?? (e as { status?: number })?.status === 401;
      toast.error(
        is401
          ? "Шлюзът връща 401. В Supabase Dashboard → Edge Functions → sync-staff-from-discord → Details изключи „Verify JWT with legacy secret” и запази. След това презареди /admin и опитай отново."
          : "Грешка при синхронизация от Discord. Проверете мрежата и конзолата."
      );
    }
    setStaffSyncLoading(false);
  }

  // ── Product CRUD ──
  function openProductCreate() {
    setProductModal({} as DbProduct);
    setProductForm({
      slug: "", name: "", subtitle: "", price: "", original_price: "", description: "", long_description: "",
      includes: "", badge: "", category: "other", stripe_price: "", sort_order: dbProducts.length + 1, is_active: true,
    });
    setProductImageFile(null);
  }
  function openProductEdit(p: DbProduct) {
    setProductModal(p);
    setProductForm({
      slug: p.slug, name: p.name, subtitle: p.subtitle, price: p.price, original_price: p.original_price,
      description: p.description, long_description: p.long_description, includes: (p.includes || []).join("\n"),
      badge: p.badge || "", category: p.category, stripe_price: p.stripe_price || "",
      sort_order: p.sort_order, is_active: p.is_active,
    });
    setProductImageFile(null);
  }
  async function saveProduct() {
    if (!productForm.name || !productForm.slug || !productForm.price) { toast.error("Попълни име, slug и цена!"); return; }
    setProductSaving(true);
    let image_url = productModal?.image_url || null;
    if (productImageFile) {
      image_url = await uploadFile(productImageFile, "products");
      if (!image_url) { setProductSaving(false); return; }
    }
    const payload = {
      slug: productForm.slug, name: productForm.name, subtitle: productForm.subtitle,
      price: productForm.price, original_price: productForm.original_price,
      description: productForm.description, long_description: productForm.long_description,
      includes: productForm.includes.split("\n").filter(Boolean),
      badge: productForm.badge || null, category: productForm.category,
      stripe_price: productForm.stripe_price || null, sort_order: productForm.sort_order,
      is_active: productForm.is_active, image_url,
    };
    const isEdit = !!productModal?.id;
    if (isEdit) {
      const { error } = await supabase.from("products").update(payload).eq("id", productModal.id);
      if (error) { toast.error("Грешка: " + error.message); setProductSaving(false); return; }
      toast.success("✅ Продуктът е обновен");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error("Грешка: " + error.message); setProductSaving(false); return; }
      toast.success("✅ Нов продукт добавен");
    }
    logAdminAction(isEdit ? "update_product" : "create_product", `${isEdit ? "Обновен" : "Създаден"} продукт: ${productForm.name}`);
    setProductModal(null); setProductSaving(false); fetchProducts();
  }
  async function deleteProduct(id: string) {
    const prod = dbProducts.find(p => p.id === id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Грешка при изтриване"); return; }
    toast.success("🗑️ Продуктът е изтрит"); setDeleteConfirm(null); fetchProducts();
    logAdminAction("delete_product", `Изтрит продукт: ${prod?.name || id}`);
  }

  async function syncSeedProducts() {
    setProductSyncLoading(true);
    try {
      const payloads = shopSeedProducts.map((seed) => ({
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
        sort_order: seed.sort_order,
        is_active: seed.is_active,
        stripe_price: seed.stripe_price,
      }));
      const { error } = await supabase
        .from("products")
        .upsert(payloads, { onConflict: "slug", ignoreDuplicates: false });
      if (error) {
        if (error.code === "42501" || error.message?.includes("row-level security")) {
          toast.error("Нямате право за запис в products. Добави потребителя си като админ: Supabase → user_roles → user_id + role 'admin'.");
          fetchProducts();
          setProductSyncLoading(false);
          return;
        }
        const { data: existingData } = await supabase.from("products").select("id, slug");
        const bySlug = new Map(((existingData || []) as { id: string; slug: string }[]).map((p) => [p.slug, p.id]));
        let done = 0;
        for (const seed of shopSeedProducts) {
          const payload = {
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
            sort_order: seed.sort_order,
            is_active: seed.is_active,
            stripe_price: seed.stripe_price,
          };
          const existingId = bySlug.get(seed.slug);
          if (existingId) {
            const { error: upErr } = await supabase.from("products").update(payload).eq("id", existingId);
            if (!upErr) done++;
          } else {
            const { error: insErr } = await supabase.from("products").insert(payload);
            if (!insErr) { done++; bySlug.set(seed.slug, ""); }
          }
        }
        toast.success(`✅ Синхронизирани продукти: ${done} от ${shopSeedProducts.length}.`);
        logAdminAction("sync_seed_products", `Синхронизирани seed продукти (fallback): ${done}`);
      } else {
        toast.success(`✅ Синхронизирани всички продукти (${payloads.length}).`);
        logAdminAction("sync_seed_products", `Синхронизирани seed продукти: ${payloads.length}`);
      }
      fetchProducts();
    } catch (e) {
      const err = e as { code?: string };
      if (err?.code !== "42501") toast.error(e instanceof Error ? e.message : "Грешка при синхронизация на продукти.");
    }
    setProductSyncLoading(false);
  }

  // ── FAQ CRUD ──
  function openFaqCreate() {
    setFaqModal({} as FaqItem);
    setFaqForm({ category: "", question: "", answer: "", sort_order: faqItems.length + 1, is_active: true });
  }
  function openFaqEdit(f: FaqItem) {
    setFaqModal(f);
    setFaqForm({ category: f.category, question: f.question, answer: f.answer, sort_order: f.sort_order, is_active: f.is_active });
  }
  async function saveFaq() {
    if (!faqForm.question || !faqForm.answer) { toast.error("Попълни въпрос и отговор!"); return; }
    setFaqSaving(true);
    const payload = { category: faqForm.category, question: faqForm.question, answer: faqForm.answer, sort_order: faqForm.sort_order, is_active: faqForm.is_active };
    const isEdit = !!faqModal?.id;
    if (isEdit) {
      const { error } = await supabase.from("faq_items").update(payload).eq("id", faqModal.id);
      if (error) { toast.error("Грешка: " + error.message); setFaqSaving(false); return; }
      toast.success("✅ FAQ обновен");
    } else {
      const { error } = await supabase.from("faq_items").insert(payload);
      if (error) { toast.error("Грешка: " + error.message); setFaqSaving(false); return; }
      toast.success("✅ Нов FAQ въпрос добавен");
    }
    logAdminAction(isEdit ? "update_faq" : "create_faq", `${isEdit ? "Обновен" : "Създаден"} FAQ: ${faqForm.question.slice(0, 50)}`);
    setFaqModal(null); setFaqSaving(false); fetchFaq();
  }
  async function deleteFaq(id: string) {
    const item = faqItems.find(f => f.id === id);
    const { error } = await supabase.from("faq_items").delete().eq("id", id);
    if (error) { toast.error("Грешка при изтриване"); return; }
    toast.success("🗑️ FAQ въпросът е изтрит"); setDeleteConfirm(null); fetchFaq();
    logAdminAction("delete_faq", `Изтрит FAQ: ${item?.question?.slice(0, 50) || id}`);
  }

  // ── Rule CRUD ──
  function openRuleCreate() {
    setRuleModal({} as RuleSection);
    setRuleForm({ page: "discord", emoji: "", title: "", color: "purple", items: "", note: "", sort_order: ruleSections.length + 1, is_active: true });
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
    setRuleModal(null); setRuleSaving(false); fetchRules();
  }
  async function deleteRule(id: string) {
    const rule = ruleSections.find(r => r.id === id);
    const { error } = await supabase.from("rule_sections").delete().eq("id", id);
    if (error) { toast.error("Грешка при изтриване"); return; }
    toast.success("🗑️ Правилото е изтрито"); setDeleteConfirm(null); fetchRules();
    logAdminAction("delete_rule", `Изтрито правило: ${rule?.title || id}`);
  }

  // ── Принудително зареди стандартен FAQ (изтрива текущите и добавя стандартните) ──
  async function forceSeedFaq() {
    if (!window.confirm("Това ще изтрие всички текущи FAQ въпроси и ще добави стандартните. Продължаваш ли?")) return;
    try {
      const { data: all } = await supabase.from("faq_items").select("id");
      if (all && all.length > 0) {
        const { error: delErr } = await supabase.from("faq_items").delete().in("id", all.map((x) => x.id));
        if (delErr) throw delErr;
      }
      const toInsert = defaultFaqItems.map((f) => ({
        category: f.category,
        question: f.question,
        answer: f.answer,
        sort_order: f.sort_order,
        is_active: f.is_active,
      }));
      const { error } = await supabase.from("faq_items").insert(toInsert);
      if (error) throw error;
      toast.success("Стандартният FAQ е зареден (текущите са премахнати).");
      logAdminAction("force_seed_faq", `Принудително заредени ${toInsert.length} FAQ въпроса`);
      fetchFaq();
    } catch (e) {
      const err = e as { code?: string };
      if (err?.code === "42501") {
        toast.error("Нямате право за запис в faq_items. Добави потребителя си като админ: Supabase → Table Editor → user_roles → добави ред с твоя user_id и role 'admin'.");
      } else {
        toast.error(e instanceof Error ? e.message : "Грешка при зареждане на FAQ");
      }
    }
  }

  // ── Seed FAQ от стандартния списък (ако няма записи) ──
  async function seedFaq() {
    const { data: existing } = await supabase.from("faq_items").select("id").limit(1);
    if (existing && existing.length > 0) {
      toast.info("Вече има FAQ записи. Seed се пропуска.");
      return;
    }
    try {
      const toInsert = defaultFaqItems.map((f) => ({
        category: f.category,
        question: f.question,
        answer: f.answer,
        sort_order: f.sort_order,
        is_active: f.is_active,
      }));
      const { error } = await supabase.from("faq_items").insert(toInsert);
      if (error) throw error;
      toast.success("Стандартният FAQ е добавен.");
      logAdminAction("seed_faq", `Добавени ${toInsert.length} FAQ въпроса`);
      fetchFaq();
    } catch (e) {
      const err = e as { code?: string };
      if (err?.code === "42501") {
        toast.error("Нямате право за запис в faq_items. Добави потребителя си като админ: Supabase → Table Editor → user_roles → добави ред с твоя user_id и role 'admin'.");
      } else {
        toast.error(e instanceof Error ? e.message : "Грешка при зареждане на FAQ");
      }
    }
  }

  // ── Принудително зареди стандартни правила (изтрива текущите и добавя стандартните) ──
  async function forceSeedRules() {
    if (!window.confirm("Това ще изтрие всички текущи правила и ще добави стандартните (Сървър, Discord, Криминал, Базар). Продължаваш ли?")) return;
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
      CRIME_RULES.forEach((r, i) => {
        toInsert.push({ page: "crime", emoji: r.emoji, title: r.title, color: r.color, items: r.items, note: r.note ?? null, sort_order: i, is_active: true });
      });
      BAZAAR_RULES.forEach((r, i) => {
        toInsert.push({ page: "bazaar", emoji: r.emoji, title: r.title, color: r.color, items: r.items, note: r.note ?? null, sort_order: i, is_active: true });
      });
      const { error } = await supabase.from("rule_sections").insert(toInsert);
      if (error) throw error;
      toast.success("Стандартните правила са заредени (текущите са премахнати).");
      logAdminAction("force_seed_rules", `Принудително заредени правила: server ${SERVER_RULES.length}, discord ${DISCORD_RULES.length}, crime ${CRIME_RULES.length}, bazaar ${BAZAAR_RULES.length}`);
      fetchRules();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err?.code === "42501") {
        toast.error("Нямате право за запис в rule_sections. Добави потребителя си като админ: Supabase → Table Editor → user_roles → добави ред с твоя user_id и role 'admin'.");
      } else if (err?.message?.includes("violates check constraint") || err?.message?.includes("rule_sections")) {
        toast.error("Таблицата rule_sections не приема page 'bazaar'. Пусни в SQL Editor: ALTER TABLE rule_sections DROP CONSTRAINT IF EXISTS rule_sections_page_check; ALTER TABLE rule_sections ADD CONSTRAINT rule_sections_page_check CHECK (page IN ('discord','server','crime','bazaar'));");
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
      CRIME_RULES.forEach((r, i) => {
        toInsert.push({ page: "crime", emoji: r.emoji, title: r.title, color: r.color, items: r.items, note: r.note ?? null, sort_order: i, is_active: true });
      });
      BAZAAR_RULES.forEach((r, i) => {
        toInsert.push({ page: "bazaar", emoji: r.emoji, title: r.title, color: r.color, items: r.items, note: r.note ?? null, sort_order: i, is_active: true });
      });
      const { error } = await supabase.from("rule_sections").insert(toInsert);
      if (error) throw error;
      toast.success("Стандартните правила са добавени.");
      logAdminAction("seed_rules", `Добавени правила: server ${SERVER_RULES.length}, discord ${DISCORD_RULES.length}, crime ${CRIME_RULES.length}, bazaar ${BAZAAR_RULES.length}`);
      fetchRules();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err?.code === "42501") {
        toast.error("Нямате право за запис в rule_sections. Добави потребителя си като админ: Supabase → Table Editor → user_roles → добави ред с твоя user_id и role 'admin'.");
      } else if (err?.message?.includes("violates check constraint") || err?.message?.includes("rule_sections")) {
        toast.error("Таблицата rule_sections не приема page 'bazaar'. Пусни в SQL Editor: ALTER TABLE rule_sections DROP CONSTRAINT IF EXISTS rule_sections_page_check; ALTER TABLE rule_sections ADD CONSTRAINT rule_sections_page_check CHECK (page IN ('discord','server','crime','bazaar'));");
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
    setSettingModal(null); setSettingSaving(false); fetchSettings();
  }
  async function deleteSetting(id: string) {
    const setting = siteSettings.find(s => s.id === id);
    const { error } = await supabase.from("site_settings").delete().eq("id", id);
    if (error) { toast.error("Грешка при изтриване"); return; }
    toast.success("🗑️ Настройката е изтрита"); setDeleteConfirm(null); fetchSettings();
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
      const { error } = await supabase.from("site_settings").insert(toInsert);
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

  async function saveAmbulance() {
    setAmbulanceSaving(true);
    try {
      const items: { key: string; value: string; description: string }[] = [
        { key: "ambulance_home", value: ambulanceForm.home, description: "Болница — Начало (legacy)" },
        { key: "ambulance_fakturi", value: ambulanceForm.fakturi, description: "Болница — Фактури (legacy)" },
        { key: "ambulance_pravila", value: ambulanceForm.pravila, description: "Болница — Правила (legacy)" },
        { key: "ambulance_cenorazpis", value: ambulanceForm.cenorazpis, description: "Болница — Ценоразпис (legacy)" },
        { key: "hospital_home", value: ambulanceForm.home, description: "Болница — Начало (/hospital)" },
        { key: "hospital_prices", value: ambulanceForm.cenorazpis, description: "Болница — Ценоразпис" },
        { key: "hospital_rules", value: ambulanceForm.pravila, description: "Болница — Правила" },
      ];
      for (const it of items) {
        const existing = siteSettings.find((s) => s.key === it.key);
        if (existing?.id) {
          await supabase.from("site_settings").update({ value: it.value, description: it.description }).eq("id", existing.id);
        } else {
          await supabase.from("site_settings").insert({ key: it.key, value: it.value, description: it.description });
        }
      }
      toast.success("✅ Секция Болница е запазена.");
      logAdminAction("save_ambulance", "Запазени текстове за Болница (/hospital)");
      fetchSettings();
    } catch (e) {
      console.error("saveAmbulance", e);
      toast.error(e instanceof Error ? e.message : "Грешка при запазване");
    }
    setAmbulanceSaving(false);
  }

  async function saveService() {
    setServiceSaving(true);
    try {
      const items: { key: string; value: string; description: string }[] = [
        { key: "service_home", value: serviceForm.home, description: "Сервиз — Начало (/service)" },
        { key: "service_fakturi", value: serviceForm.fakturi, description: "Сервиз — Фактури" },
        { key: "service_pravila", value: serviceForm.pravila, description: "Сервиз — Правила" },
        { key: "service_cenorazpis", value: serviceForm.cenorazpis, description: "Сервиз — Ценоразпис" },
      ];
      for (const it of items) {
        const existing = siteSettings.find((s) => s.key === it.key);
        if (existing?.id) {
          await supabase.from("site_settings").update({ value: it.value, description: it.description }).eq("id", existing.id);
        } else {
          await supabase.from("site_settings").insert({ key: it.key, value: it.value, description: it.description });
        }
      }
      toast.success("✅ Секция Сервиз е запазена.");
      logAdminAction("save_service", "Запазени текстове за /service");
      fetchSettings();
    } catch (e) {
      console.error("saveService", e);
      toast.error(e instanceof Error ? e.message : "Грешка при запазване");
    }
    setServiceSaving(false);
  }

  // ── Delete application ──
  async function deleteApp(id: string) {
    const app = apps.find(a => a.id === id);
    const { error } = await supabase.from("gang_applications").delete().eq("id", id);
    if (error) { toast.error("Грешка при изтриване"); return; }
    toast.success("🗑️ Кандидатурата е изтрита"); setDeleteConfirm(null); setSelected(null); fetchApps();
    logAdminAction("delete_gang_application", `Изтрита кандидатура: ${app?.name || id}`);
  }

  // ── Police handbook ──
  async function fetchHandbook() {
    setHandbookLoading(true);
    try {
      const { data, error } = await supabase.from("police_handbook").select("data").eq("id", "current").single();
      if (error) throw error;
      setHandbookJson(data?.data ? JSON.stringify(data.data, null, 2) : "{}");
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code === "PGRST205" || err?.message?.includes("police_handbook")) {
        setHandbookJson("{}");
        toast.info("Таблицата police_handbook липсва. Пусни миграцията от supabase/migrations/20260307180000_police_handbook.sql в Supabase SQL Editor.");
      } else {
        toast.error("Грешка при зареждане на наръчника");
        setHandbookJson("{}");
      }
    } finally {
      setHandbookLoading(false);
    }
  }

  async function fetchHandbookBackups() {
    setHandbookBackupsLoading(true);
    try {
      const { data, error } = await supabase
        .from("police_handbook_backups")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setHandbookBackups((data || []) as { id: string; created_at: string }[]);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code !== "PGRST205") {
        toast.error("Грешка при зареждане на бакъпите");
      }
      setHandbookBackups([]);
    } finally {
      setHandbookBackupsLoading(false);
    }
  }

  async function ensureHandbookDailyBackup() {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      await supabase.functions.invoke("ensure-handbook-daily-backup", {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) {
      /* ignore */
    }
  }

  async function saveHandbook() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(handbookJson);
    } catch {
      toast.error("Невалиден JSON");
      return;
    }
    setHandbookSaving(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        toast.error("Няма сесия");
        return;
      }
      const { data, error } = await supabase.functions.invoke("save-police-handbook", {
        headers: { Authorization: `Bearer ${token}` },
        body: { data: parsed },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      toast.success("Наръчникът е запазен. Създаден е бакъп от предишната версия.");
      logAdminAction("save_police_handbook", "Запазен полицейски наръчник");
      fetchHandbookBackups();
    } catch (e) {
      console.error("saveHandbook", e);
      toast.error(e instanceof Error ? e.message : "Грешка при запазване");
    } finally {
      setHandbookSaving(false);
    }
  }

  async function restoreHandbookBackup(backupId: string) {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        toast.error("Няма сесия");
        return;
      }
      const { data, error } = await supabase.functions.invoke("restore-police-handbook-backup", {
        headers: { Authorization: `Bearer ${token}` },
        body: { backupId },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      toast.success("Наръчникът е възстановен от бакъпа.");
      logAdminAction("restore_police_handbook_backup", `Възстановен бакъп: ${backupId}`);
      fetchHandbook();
      fetchHandbookBackups();
    } catch (e) {
      console.error("restoreHandbookBackup", e);
      toast.error(e instanceof Error ? e.message : "Грешка при възстановяване");
    }
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

  // ── Filtered data ──
  const filteredApps = apps.filter(a =>
    !searchApps || a.name.toLowerCase().includes(searchApps.toLowerCase()) || a.leader.toLowerCase().includes(searchApps.toLowerCase()) || (a.discord_username || "").toLowerCase().includes(searchApps.toLowerCase())
  );
  const filteredUsers = profiles.filter(p => !searchUsers || (p.username || "").toLowerCase().includes(searchUsers.toLowerCase()));
  const filteredPurchases = purchases.filter(p => !searchPurchases || p.product_name.toLowerCase().includes(searchPurchases.toLowerCase()) || (p.discord_username || "").toLowerCase().includes(searchPurchases.toLowerCase()));
  const filteredProducts = dbProducts.filter(p => !searchProducts || p.name.toLowerCase().includes(searchProducts.toLowerCase()) || p.category.toLowerCase().includes(searchProducts.toLowerCase()));
  const filteredStaff = staffMembers
    .filter(s => {
      const nameLower = (s.name || "").trim().toLowerCase();
      if (["ivogenga", "dark music"].some(ex => nameLower === ex || nameLower.includes(ex))) return false;
      return true;
    })
    .filter(s => !searchStaff || s.name.toLowerCase().includes(searchStaff.toLowerCase()) || s.role.toLowerCase().includes(searchStaff.toLowerCase()))
    .sort((a, b) => {
      const orderA = STAFF_ROLE_ORDER[a.role] ?? a.sort_order ?? 999;
      const orderB = STAFF_ROLE_ORDER[b.role] ?? b.sort_order ?? 999;
      return orderA - orderB;
    });
  const filteredFaq = faqItems.filter(f => !searchFaq || f.question.toLowerCase().includes(searchFaq.toLowerCase()) || f.category.toLowerCase().includes(searchFaq.toLowerCase()));
  const filteredRules = ruleSections.filter(r => (!searchRules || r.title.toLowerCase().includes(searchRules.toLowerCase())) && (rulePageFilter === "all" || r.page === rulePageFilter));

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
    const a = document.createElement("a"); a.href = url; a.download = `chillrp-purchases-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function login() {
    setDiscordLoginLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: window.location.origin },
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
    setSelected(null); setAdminNote(""); fetchApps();
  }

  const statusColor = (s: string) =>
    s === "pending" ? "text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10" :
    s === "approved" ? "text-neon-green border-neon-green/30 bg-neon-green/10" :
    "text-neon-red border-neon-red/30 bg-neon-red/10";
  const statusLabel = (s: string) =>
    s === "pending" ? "⏳ Изчакване" : s === "approved" ? "✅ Одобрено" : "❌ Отказано";
  const categoryLabel = (c: string) => {
    const map: Record<string, string> = { vip: "VIP", cars: "Коли", businesses: "Бизнеси", gang: "Генг", other: "Други" };
    return map[c] || c;
  };

  const SaveButton = ({ onClick, saving, label = "Запази" }: { onClick: () => void; saving: boolean; label?: string; disabled?: boolean }) => (
    <button onClick={onClick} disabled={saving || disabled} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-heading font-black text-sm text-foreground glow-purple hover:opacity-90 transition-all disabled:opacity-50" style={{ background: "linear-gradient(135deg, hsl(300 80% 50%), hsl(271 76% 55%))" }}>
      {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />} {label}
    </button>
  );

  const DeleteBtn = ({ id, type, onDelete, disabled }: { id: string; type: string; onDelete: (id: string) => void; disabled?: boolean }) => (
    disabled ? null : deleteConfirm?.id === id && deleteConfirm?.type === type ? (
      <div className="flex items-center gap-1">
        <button onClick={() => onDelete(id)} className="px-2 py-1.5 rounded-lg border border-neon-red/50 bg-neon-red/15 text-neon-red text-xs font-heading font-bold">Да</button>
        <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-heading font-bold">Не</button>
      </div>
    ) : (
      <button onClick={() => setDeleteConfirm({ id, type })} className="p-1.5 rounded-lg border border-neon-red/30 text-neon-red hover:bg-neon-red/10 transition-colors"><Trash2 size={14} /></button>
    )
  );

  // ── Login screen ──
  if (!session) return (
    <div className="min-h-screen bg-background pt-20 flex items-center justify-center px-4">
      <div className="glass border border-neon-purple/30 rounded-2xl p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <Shield size={36} className="text-neon-purple mx-auto mb-3" />
          <h1 className="text-2xl font-heading font-black tracking-widest uppercase text-foreground">Admin Panel</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">ChillRP — вход само с Discord</p>
        </div>
        <button
          onClick={login}
          disabled={discordLoginLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-heading font-bold text-sm tracking-wider transition-all disabled:opacity-50"
        >
          {discordLoginLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/discord.svg" alt="" className="w-5 h-5 invert" width={20} height={20} />
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

  if (roleChecked && !isAdmin) return (
    <div className="min-h-screen bg-background pt-20 flex items-center justify-center px-4">
      <div className="glass border border-neon-red/30 rounded-2xl p-8 max-w-sm w-full text-center">
        <Shield size={36} className="text-neon-red mx-auto mb-3" />
        <h1 className="text-xl font-heading font-black tracking-widest uppercase text-neon-red">Достъп отказан</h1>
        <button onClick={logout} className="mt-6 flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-neon-red hover:border-neon-red/40 text-sm font-heading font-semibold tracking-wider transition-colors">
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
    ["apps", <Shield size={14} />, "Кандидатури"],
    ["stats", <BarChart3 size={14} />, "Статистика"],
    ["users", <Users size={14} />, "Потребители"],
    ["products", <Package size={14} />, "Продукти"],
    ["staff", <UserPlusIcon size={14} />, "Стаф"],
    ["faq", <HelpCircle size={14} />, "FAQ"],
    ["rules", <BookOpen size={14} />, "Правила"],
    ["handbook", <FileText size={14} />, "Наръчник Полиция"],
    ["settings", <Settings size={14} />, "Настройки"],
  ];

  return React.createElement('div', { className: 'min-h-screen bg-background pt-20 container mx-auto max-w-6xl px-4 py-10' },
    <>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-black tracking-widest uppercase text-foreground flex items-center gap-3">
              <Shield size={28} className="text-neon-purple" /> Admin Panel
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              ChillRP Staff Dashboard
              {isStaffReadOnly ? (
                <span className="ml-2 px-2 py-0.5 rounded-full border border-neon-yellow/40 bg-neon-yellow/10 text-neon-yellow text-[10px] font-heading font-bold tracking-widest uppercase">👁 САМО ПРЕГЛЕД (STAFF)</span>
              ) : (
                <span className="ml-2 px-2 py-0.5 rounded-full border border-neon-purple/40 bg-neon-purple/10 text-neon-purple text-[10px] font-heading font-bold tracking-widest uppercase">👑 ADMIN</span>
              )}
              <span className="ml-2 px-2 py-0.5 rounded-full border border-neon-green/40 bg-neon-green/10 text-neon-green text-[10px] font-heading font-bold tracking-widest uppercase">📋 Логове активни</span>
            </p>
          </div>
          <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-neon-red hover:border-neon-red/40 text-sm font-heading font-semibold tracking-wider transition-colors">
            <LogOut size={15} /> Изход
          </button>
        </div>
        {isStaffReadOnly && (
          <div className="mb-6 rounded-xl border border-neon-yellow/40 bg-neon-yellow/10 px-4 py-3 text-neon-yellow text-sm font-body">
            Вие имате роля <strong>Staff</strong> — преглед на всички данни без право на редакция, изтриване или добавяне.
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-8 border-b border-white/8 pb-0">
          {tabs.map(([id, icon, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setDeleteConfirm(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-heading font-bold tracking-widest uppercase border-b-2 transition-colors -mb-px whitespace-nowrap
                ${tab === id ? "border-neon-purple text-neon-purple" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ─── APPLICATIONS TAB ─── */}
        {tab === "apps" && (
          <>
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
                      ${filter === f ? "border-neon-purple/60 bg-neon-purple/15 text-neon-purple" : "border-border text-muted-foreground hover:border-border/60"}`}>
                    {f === "all" ? "Всички" : statusLabel(f)}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-w-[200px]"><SearchInput value={searchApps} onChange={setSearchApps} placeholder="Търси по име, лидер, discord..." /></div>
            </div>
            <div className="space-y-2">
              {filteredApps.length === 0 && <div className="text-center py-16 text-muted-foreground font-body">Няма заявки.</div>}
              {filteredApps.map((app) => (
                <div key={app.id} className="glass border border-white/8 rounded-xl p-4 flex items-center gap-4 hover:border-neon-purple/25 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-heading font-bold tracking-wider text-foreground">{app.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-heading font-bold tracking-wider ${statusColor(app.status)}`}>{statusLabel(app.status)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-body">{app.gang_type} • Лидер: {app.leader} • {app.discord_username || "—"} • {new Date(app.submitted_at).toLocaleDateString("bg-BG")}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { setSelected(app); setAdminNote(app.admin_note || ""); }} disabled={isStaffReadOnly} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neon-purple/30 text-neon-purple text-xs font-heading font-bold tracking-wider hover:bg-neon-purple/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"><Eye size={13} /> Виж</button>
                    <button onClick={() => openGangEdit(app)} disabled={isStaffReadOnly} className="p-1.5 rounded-lg border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"><Edit2 size={14} /></button>
                    <DeleteBtn id={app.id} type="app" onDelete={deleteApp} disabled={isStaffReadOnly} />
                  </div>
                </div>
              ))}
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
              <div className="glass border border-neon-purple/25 rounded-xl p-5 text-center">
                <ShoppingBag size={22} className="text-neon-purple mx-auto mb-2" />
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
                      <defs><linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(271 76% 55%)" stopOpacity={0.35} /><stop offset="95%" stopColor="hsl(271 76% 55%)" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
                      <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px", color: "hsl(var(--foreground))" }} formatter={(v: number) => [`€${v.toFixed(2)}`, "Приход"]} labelFormatter={(label) => `📅 ${label}`} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(271 76% 55%)" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: "hsl(271 76% 55%)", stroke: "none" }} />
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
          </div>
        )}

        {/* ─── USERS TAB ─── */}
        {tab === "users" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass border border-neon-cyan/25 rounded-xl p-5 text-center"><Users size={22} className="text-neon-cyan mx-auto mb-2" /><div className="text-3xl font-heading font-black text-foreground">{profiles.length}</div><div className="text-xs font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-1">Общо потребители</div></div>
              <div className="glass border border-neon-purple/25 rounded-xl p-5 text-center"><Crown size={22} className="text-neon-purple mx-auto mb-2" /><div className="text-3xl font-heading font-black text-foreground">{userRoles.filter(r => r.role === "admin").length}</div><div className="text-xs font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-1">Администратори</div></div>
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
                    <div key={p.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-neon-purple/25 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-neon-purple/15 border border-neon-purple/30 flex items-center justify-center text-neon-purple text-xs font-heading font-bold shrink-0">{(p.username || "?")[0].toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold tracking-wider text-foreground text-sm truncate">{p.username || "—"}</span>
                          {roles.includes("admin") && <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-neon-purple/40 bg-neon-purple/10 text-neon-purple font-heading font-bold tracking-wider">👑 ADMIN</span>}
                          {roles.includes("moderator") && <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-neon-yellow/40 bg-neon-yellow/10 text-neon-yellow font-heading font-bold tracking-wider">⚡ MOD</span>}
                        </div>
                        <div className="text-xs text-muted-foreground font-body mt-0.5">Регистриран: {p.created_at ? new Date(p.created_at).toLocaleDateString("bg-BG") : "—"} • {userPurchases.length} покупки</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right mr-2"><div className="text-sm font-heading font-bold text-neon-green">{userPurchases.length > 0 ? `€${userSpent.toFixed(2)}` : "—"}</div></div>
                        <button onClick={() => toggleRole(p.id, "admin")} title={roles.includes("admin") ? "Премахни Admin" : "Направи Admin"}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${roles.includes("admin") ? "border-neon-purple/50 bg-neon-purple/15 text-neon-purple" : "border-border text-muted-foreground hover:border-neon-purple/30 hover:text-neon-purple"}`}><Crown size={14} /></button>
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
              <SearchInput value={searchProducts} onChange={setSearchProducts} placeholder="Търси продукт по име или категория..." />
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button onClick={syncSeedProducts} disabled={isStaffReadOnly || productSyncLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-cyan/20 transition-colors disabled:opacity-50 disabled:pointer-events-none">
                  {productSyncLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Синхронизирай със сайта
                </button>
                <button onClick={openProductCreate} disabled={isStaffReadOnly} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-purple/40 bg-neon-purple/10 text-neon-purple text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-purple/20 transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none">
                  <Plus size={14} /> Нов продукт
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {dbProducts.length === 0 && (
                <div className="glass border border-neon-cyan/20 rounded-xl p-5 text-center">
                  <p className="text-muted-foreground font-body mb-2">Няма продукти в базата. Продуктите от магазина се зареждат от тук.</p>
                  <p className="text-sm text-neon-cyan font-heading font-bold mb-3">Натисни „Синхронизирай със сайта” по-горе, за да заредиш стандартния списък продукти.</p>
                  <button onClick={syncSeedProducts} disabled={isStaffReadOnly || productSyncLoading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-cyan/20 transition-colors disabled:opacity-50">
                    {productSyncLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Синхронизирай със сайта
                  </button>
                </div>
              )}
              {filteredProducts.length === 0 && dbProducts.length > 0 ? <div className="text-center py-16 text-muted-foreground font-body">Няма резултати.</div> : (
                filteredProducts.map((item) => {
                  const itemPurchases = purchases.filter(p => p.product_name === item.name);
                  const itemRevenue = itemPurchases.reduce((s, p) => s + (p.price_eur || 0), 0);
                  return (
                    <div key={item.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-neon-purple/25 transition-colors">
                      {item.image_url ? <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0"><Package size={16} className="text-neon-purple/50" /></div>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold tracking-wider text-foreground text-sm truncate">{item.name}</span>
                          {!item.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-neon-red/40 bg-neon-red/10 text-neon-red font-heading font-bold">СКРИТ</span>}
                          {item.badge && <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-neon-purple/40 bg-neon-purple/10 text-neon-purple font-heading font-bold">{item.badge}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground font-body mt-0.5">{categoryLabel(item.category)} • {item.price} {item.stripe_price ? "• ✅ Stripe" : "• ⚠️ Без Stripe"}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right mr-2"><div className="text-sm font-heading font-bold text-neon-green">{itemPurchases.length > 0 ? `€${itemRevenue.toFixed(2)}` : "—"}</div><div className="text-[10px] text-muted-foreground font-body">{itemPurchases.length} продажби</div></div>
                        <button onClick={() => openProductEdit(item)} disabled={isStaffReadOnly} className="p-1.5 rounded-lg border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"><Edit2 size={14} /></button>
                        <DeleteBtn id={item.id} type="product" onDelete={deleteProduct} disabled={isStaffReadOnly} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ─── STAFF TAB ─── */}
        {tab === "staff" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-between flex-wrap">
              <SearchInput value={searchStaff} onChange={setSearchStaff} placeholder="Търси стаф по име или роля..." />
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={syncStaffFromDiscord} disabled={isStaffReadOnly || staffSyncLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-cyan/20 transition-colors disabled:opacity-50 disabled:pointer-events-none">
                  {staffSyncLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Синхронизирай от Discord
                </button>
                <button onClick={openStaffCreate} disabled={isStaffReadOnly} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-purple/40 bg-neon-purple/10 text-neon-purple text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-purple/20 transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none">
                  <Plus size={14} /> Нов стаф
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {filteredStaff.length === 0 ? <div className="text-center py-16 text-muted-foreground font-body">Няма стаф членове.</div> : (
                filteredStaff.map((s) => (
                  <div key={s.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-neon-purple/25 transition-colors">
                    {s.avatar_url ? <img src={s.avatar_url} alt={s.name} className="w-10 h-10 rounded-full object-cover shrink-0" /> : <div className="w-10 h-10 rounded-full bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0"><Shield size={16} className="text-neon-purple/50" /></div>}
                    <div className="flex-1 min-w-0">
                      <span className="font-heading font-bold tracking-wider text-foreground text-sm">{s.name}</span>
                      <div className="text-xs text-muted-foreground font-body mt-0.5">{s.role} • #{(STAFF_ROLE_ORDER[s.role] ?? s.sort_order)}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openStaffEdit(s)} disabled={isStaffReadOnly} className="p-1.5 rounded-lg border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"><Edit2 size={14} /></button>
                      <DeleteBtn id={s.id} type="staff" onDelete={deleteStaff} disabled={isStaffReadOnly} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── FAQ TAB ─── */}
        {tab === "faq" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <SearchInput value={searchFaq} onChange={setSearchFaq} placeholder="Търси FAQ по въпрос или категория..." />
              <div className="flex flex-wrap gap-2 shrink-0">
                <button onClick={seedFaq} disabled={isStaffReadOnly || faqItems.length > 0} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-foreground text-xs font-heading font-bold tracking-widest uppercase hover:bg-white/10 transition-colors disabled:opacity-50 disabled:pointer-events-none" title={faqItems.length > 0 ? "Вече има FAQ" : "Добави стандартните 7 въпроса"}>
                  Зареди стандартен FAQ
                </button>
                <button onClick={forceSeedFaq} disabled={isStaffReadOnly} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-heading font-bold tracking-widest uppercase hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:pointer-events-none" title="Изтрий текущите и зареди стандартните">
                  Принудително зареди FAQ
                </button>
                <button onClick={openFaqCreate} disabled={isStaffReadOnly} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-purple/40 bg-neon-purple/10 text-neon-purple text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-purple/20 transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none">
                  <Plus size={14} /> Нов въпрос
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {filteredFaq.length === 0 ? <div className="text-center py-16 text-muted-foreground font-body">Няма FAQ въпроси.</div> : (
                filteredFaq.map((f) => (
                  <div key={f.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-neon-purple/25 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold tracking-wider text-foreground text-sm truncate">{f.question}</span>
                        {!f.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-neon-red/40 bg-neon-red/10 text-neon-red font-heading font-bold">СКРИТ</span>}
                      </div>
                      <div className="text-xs text-muted-foreground font-body mt-0.5">{f.category} • #{f.sort_order}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openFaqEdit(f)} disabled={isStaffReadOnly} className="p-1.5 rounded-lg border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"><Edit2 size={14} /></button>
                      <DeleteBtn id={f.id} type="faq" onDelete={deleteFaq} disabled={isStaffReadOnly} />
                    </div>
                  </div>
                ))
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
                      ${rulePageFilter === p.value ? "border-neon-purple/60 bg-neon-purple/15 text-neon-purple" : "border-border text-muted-foreground hover:border-border/60"}`}>
                    {p.label}
                  </button>
                ))}
                <div className="flex-1 min-w-[150px]"><SearchInput value={searchRules} onChange={setSearchRules} placeholder="Търси правило..." /></div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button onClick={seedRules} disabled={isStaffReadOnly || ruleSections.length > 0} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-foreground text-xs font-heading font-bold tracking-widest uppercase hover:bg-white/10 transition-colors disabled:opacity-50 disabled:pointer-events-none" title={ruleSections.length > 0 ? "Вече има правила" : "Добави сървърни, Discord, криминал и базар"}>
                  Зареди стандартни правила
                </button>
                <button onClick={forceSeedRules} disabled={isStaffReadOnly} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-heading font-bold tracking-widest uppercase hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:pointer-events-none" title="Изтрий текущите и зареди стандартните (Сървър, Discord, Криминал, Базар)">
                  Принудително зареди правила
                </button>
                <button onClick={openRuleCreate} disabled={isStaffReadOnly} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-purple/40 bg-neon-purple/10 text-neon-purple text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-purple/20 transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none">
                  <Plus size={14} /> Ново правило
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {filteredRules.length === 0 ? <div className="text-center py-16 text-muted-foreground font-body">Няма правила.</div> : (
                filteredRules.map((r) => (
                  <div key={r.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-neon-purple/25 transition-colors">
                    <span className="text-xl shrink-0">{r.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold tracking-wider text-foreground text-sm truncate">{r.title}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan font-heading font-bold">{r.page.toUpperCase()}</span>
                        {!r.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-neon-red/40 bg-neon-red/10 text-neon-red font-heading font-bold">СКРИТ</span>}
                      </div>
                      <div className="text-xs text-muted-foreground font-body mt-0.5">{r.items.length} точки • {r.color} • #{r.sort_order}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openRuleEdit(r)} disabled={isStaffReadOnly} className="p-1.5 rounded-lg border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"><Edit2 size={14} /></button>
                      <DeleteBtn id={r.id} type="rule" onDelete={deleteRule} disabled={isStaffReadOnly} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── POLICE HANDBOOK TAB ─── */}
        {tab === "handbook" && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground font-body">
              Редактирай съдържанието на полицейския наръчник (страница Полиция). При запазване автоматично се създава бакъп от предишната версия. Ако някой случайно изтрие нещо, може да възстановиш от списъка с бакъпи по-долу.
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-2">JSON съдържание на наръчника</label>
                {handbookLoading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 size={24} className="animate-spin" /></div>
                ) : (
                  <textarea
                    value={handbookJson}
                    onChange={(e) => setHandbookJson(e.target.value)}
                    rows={20}
                    className="w-full px-3 py-2 rounded-xl glass border border-border focus:border-neon-cyan/50 focus:outline-none text-sm font-mono text-foreground bg-transparent resize-y min-h-[320px]"
                    placeholder='{"handbookIndex": [...], "ranks": [...], ...}'
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={saveHandbook}
                  disabled={handbookLoading || handbookSaving || isStaffReadOnly}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-cyan/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {handbookSaving ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                  Запази наръчника
                </button>
                <button
                  type="button"
                  onClick={() => setHandbookJson(JSON.stringify(defaultHandbookSnapshot, null, 2))}
                  disabled={handbookLoading || isStaffReadOnly}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-foreground text-xs font-heading font-bold tracking-widest uppercase hover:bg-white/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  Зареди стандартен наръчник
                </button>
              </div>
            </div>
            <div className="glass border border-neon-cyan/20 rounded-xl p-5">
              <div className="text-xs font-heading font-bold tracking-widest uppercase text-neon-cyan mb-3">Бакъпи (възстановяване от предишен ден или предишно запазване)</div>
              {handbookBackupsLoading ? (
                <div className="py-4 text-muted-foreground text-sm">Зареждане...</div>
              ) : handbookBackups.length === 0 ? (
                <div className="py-4 text-muted-foreground text-sm">Все още няма бакъпи. При първо запазване ще се създаде.</div>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {handbookBackups.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                      <span className="text-sm font-body text-foreground/80">
                        {new Date(b.created_at).toLocaleString("bg-BG", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                      <button
                        onClick={() => restoreHandbookBackup(b.id)}
                        disabled={isStaffReadOnly}
                        className="px-3 py-1.5 rounded-lg border border-neon-cyan/30 text-neon-cyan text-xs font-heading font-bold tracking-wider hover:bg-neon-cyan/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Възстанови
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Болница/Сервиз табовете са временно премахнати (секциите са паузирани). */}

        {/* ─── SETTINGS TAB ─── */}
        {tab === "settings" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <div className="text-sm text-muted-foreground font-body">Управлявай глобални настройки на сайта (Discord линк, дата на старт, банер, текстове на началната страница и др.)</div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button onClick={seedSiteSettings} disabled={isStaffReadOnly || settingsSeedLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-cyan/20 transition-colors disabled:opacity-50 disabled:pointer-events-none">
                  {settingsSeedLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Добави липсващи настройки по подразбиране
                </button>
                <button onClick={openSettingCreate} disabled={isStaffReadOnly} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-purple/40 bg-neon-purple/10 text-neon-purple text-xs font-heading font-bold tracking-widest uppercase hover:bg-neon-purple/20 transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none">
                  <Plus size={14} /> Нова настройка
                </button>
              </div>
            </div>

            <div className="glass border border-neon-cyan/20 rounded-xl p-5">
              <div className="text-xs font-heading font-bold tracking-widest uppercase text-neon-cyan mb-3">Всички настройки по сайта (начална страница + банер)</div>
              <p className="text-sm text-muted-foreground font-body mb-4">Тези ключове се използват на началната страница и в банера. Ако липсват, натисни „Добави липсващи настройки по подразбиране“. Редактирай ги от списъка по-долу.</p>
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
                        <button onClick={() => openSettingEdit(existing)} disabled={isStaffReadOnly} className="shrink-0 p-1.5 rounded border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10 text-xs font-heading font-bold">
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

            <div className="space-y-2">
              <div className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground">Всички записи в site_settings</div>
              {siteSettings.length === 0 ? <div className="text-center py-16 text-muted-foreground font-body">Няма настройки. Натисни „Добави липсващи настройки по подразбиране“ или „Нова настройка“. </div> : (
                siteSettings.map((s) => (
                  <div key={s.id} className="glass border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-neon-purple/25 transition-colors">
                    <Settings size={16} className="text-neon-purple shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold tracking-wider text-neon-cyan text-sm">{s.key}</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-body mt-0.5 truncate">{s.value}</div>
                      {s.description && <div className="text-[10px] text-muted-foreground/60 font-body mt-0.5">{s.description}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openSettingEdit(s)} disabled={isStaffReadOnly} className="p-1.5 rounded-lg border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"><Edit2 size={14} /></button>
                      <DeleteBtn id={s.id} type="setting" onDelete={deleteSetting} disabled={isStaffReadOnly} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      {/* ── Gang Edit Modal ── */}
      {gangEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in p-4" onClick={(e) => e.target === e.currentTarget && setGangEditModal(null)}>
          <div className="glass-strong border border-neon-cyan/30 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-in-up p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-black text-lg tracking-widest uppercase text-neon-cyan">✏️ Редактирай кандидатура</h2>
              <button onClick={() => setGangEditModal(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
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

      {/* ── Staff Modal ── */}
      {staffModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in p-4" onClick={(e) => e.target === e.currentTarget && setStaffModal(null)}>
          <div className="glass-strong border border-neon-purple/30 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-in-up p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-black text-lg tracking-widest uppercase text-neon-purple">{staffModal.id ? "✏️ Редактирай" : "➕ Нов"} Стаф</h2>
              <button onClick={() => setStaffModal(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <FieldInput label="Име" value={staffForm.name} onChange={(v: string) => setStaffForm(f => ({ ...f, name: v }))} required />
              <FieldInput label="Роля" value={staffForm.role} onChange={(v: string) => setStaffForm(f => ({ ...f, role: v }))} required />
              <div><label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Икона</label>
                <div className="flex gap-2 flex-wrap">{ICON_OPTIONS.map(i => (
                  <button key={i} onClick={() => setStaffForm(f => ({ ...f, icon: i }))} className={`px-3 py-1.5 rounded-lg border text-xs font-heading font-bold transition-colors ${staffForm.icon === i ? "border-neon-purple/50 bg-neon-purple/15 text-neon-purple" : "border-border text-muted-foreground"}`}>{i}</button>
                ))}</div></div>
              <div><label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Цвят</label>
                <div className="flex gap-2 flex-wrap">{COLOR_OPTIONS.map(c => (
                  <button key={c.value} onClick={() => setStaffForm(f => ({ ...f, color: c.value }))} className={`px-3 py-1.5 rounded-lg border text-xs font-heading font-bold transition-colors ${staffForm.color === c.value ? "border-neon-purple/50 bg-neon-purple/15 text-neon-purple" : "border-border text-muted-foreground"}`}>{c.label}</button>
                ))}</div></div>
              <FieldInput label="Аватар скейл" value={staffForm.avatar_scale} onChange={(v: string) => setStaffForm(f => ({ ...f, avatar_scale: v }))} placeholder="scale-[2.2]" />
              <FieldInput label="Ред (sort order)" value={staffForm.sort_order} onChange={(v: number) => setStaffForm(f => ({ ...f, sort_order: v }))} type="number" />
              <div><label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Аватар снимка</label>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-border text-sm font-body text-muted-foreground cursor-pointer hover:border-neon-purple/30 transition-colors">
                  <Upload size={14} /> {staffAvatarFile ? staffAvatarFile.name : "Избери файл"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setStaffAvatarFile(e.target.files?.[0] || null)} />
                </label></div>
              <SaveButton onClick={saveStaff} saving={staffSaving} disabled={isStaffReadOnly} />
            </div>
          </div>
        </div>
      )}

      {/* ── Product Modal ── */}
      {productModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in p-4" onClick={(e) => e.target === e.currentTarget && setProductModal(null)}>
          <div className="glass-strong border border-neon-purple/30 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-in-up p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-black text-lg tracking-widest uppercase text-neon-purple">{productModal.id ? "✏️ Редактирай" : "➕ Нов"} Продукт</h2>
              <button onClick={() => setProductModal(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Име" value={productForm.name} onChange={(v: string) => setProductForm(f => ({ ...f, name: v }))} required />
                <FieldInput label="Slug" value={productForm.slug} onChange={(v: string) => setProductForm(f => ({ ...f, slug: v }))} required placeholder="unique-slug" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Цена" value={productForm.price} onChange={(v: string) => setProductForm(f => ({ ...f, price: v }))} required placeholder="5.00 EUR" />
                <FieldInput label="Оригинална цена" value={productForm.original_price} onChange={(v: string) => setProductForm(f => ({ ...f, original_price: v }))} placeholder="10.00 EUR" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Subtitle" value={productForm.subtitle} onChange={(v: string) => setProductForm(f => ({ ...f, subtitle: v }))} />
                <FieldInput label="Badge" value={productForm.badge} onChange={(v: string) => setProductForm(f => ({ ...f, badge: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Категория</label>
                  <div className="flex gap-1 flex-wrap">{CATEGORY_OPTIONS.map(c => (
                    <button key={c} onClick={() => setProductForm(f => ({ ...f, category: c }))} className={`px-2 py-1 rounded-lg border text-[10px] font-heading font-bold transition-colors ${productForm.category === c ? "border-neon-purple/50 bg-neon-purple/15 text-neon-purple" : "border-border text-muted-foreground"}`}>{categoryLabel(c)}</button>
                  ))}</div></div>
                <FieldInput label="Stripe Price ID" value={productForm.stripe_price} onChange={(v: string) => setProductForm(f => ({ ...f, stripe_price: v }))} placeholder="price_xxx" />
              </div>
              <FieldTextarea label="Кратко описание" value={productForm.description} onChange={(v: string) => setProductForm(f => ({ ...f, description: v }))} rows={2} />
              <FieldTextarea label="Дълго описание" value={productForm.long_description} onChange={(v: string) => setProductForm(f => ({ ...f, long_description: v }))} rows={3} />
              <FieldTextarea label="Включва (по 1 на ред)" value={productForm.includes} onChange={(v: string) => setProductForm(f => ({ ...f, includes: v }))} placeholder="Елемент 1&#10;Елемент 2" rows={4} />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Ред (sort order)" value={productForm.sort_order} onChange={(v: number) => setProductForm(f => ({ ...f, sort_order: v }))} type="number" />
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={productForm.is_active} onChange={(e) => setProductForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-neon-purple" />
                    <span className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground">Активен</span>
                  </label>
                </div>
              </div>
              <div><label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Снимка</label>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-border text-sm font-body text-muted-foreground cursor-pointer hover:border-neon-purple/30 transition-colors">
                  <Upload size={14} /> {productImageFile ? productImageFile.name : "Избери файл"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setProductImageFile(e.target.files?.[0] || null)} />
                </label></div>
              <SaveButton onClick={saveProduct} saving={productSaving} disabled={isStaffReadOnly} />
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ Modal ── */}
      {faqModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in p-4" onClick={(e) => e.target === e.currentTarget && setFaqModal(null)}>
          <div className="glass-strong border border-neon-purple/30 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-in-up p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-black text-lg tracking-widest uppercase text-neon-purple">{faqModal.id ? "✏️ Редактирай" : "➕ Нов"} FAQ</h2>
              <button onClick={() => setFaqModal(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <FieldInput label="Категория" value={faqForm.category} onChange={(v: string) => setFaqForm(f => ({ ...f, category: v }))} placeholder="🎮 Присъединяване" />
              <FieldInput label="Въпрос" value={faqForm.question} onChange={(v: string) => setFaqForm(f => ({ ...f, question: v }))} required />
              <FieldTextarea label="Отговор" value={faqForm.answer} onChange={(v: string) => setFaqForm(f => ({ ...f, answer: v }))} rows={5} />
              <FieldInput label="Ред (sort order)" value={faqForm.sort_order} onChange={(v: number) => setFaqForm(f => ({ ...f, sort_order: v }))} type="number" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={faqForm.is_active} onChange={(e) => setFaqForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-neon-purple" />
                <span className="text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground">Активен</span>
              </label>
              <SaveButton onClick={saveFaq} saving={faqSaving} disabled={isStaffReadOnly} />
            </div>
          </div>
        </div>
      )}

      {/* ── Rule Modal ── */}
      {ruleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in p-4" onClick={(e) => e.target === e.currentTarget && setRuleModal(null)}>
          <div className="glass-strong border border-neon-purple/30 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-in-up p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-black text-lg tracking-widest uppercase text-neon-purple">{ruleModal.id ? "✏️ Редактирай" : "➕ Ново"} Правило</h2>
              <button onClick={() => setRuleModal(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Страница *</label>
                <div className="flex gap-2">{RULE_PAGE_OPTIONS.map(p => (
                  <button key={p.value} onClick={() => setRuleForm(f => ({ ...f, page: p.value }))} className={`px-3 py-1.5 rounded-lg border text-xs font-heading font-bold transition-colors ${ruleForm.page === p.value ? "border-neon-purple/50 bg-neon-purple/15 text-neon-purple" : "border-border text-muted-foreground"}`}>{p.label}</button>
                ))}</div></div>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Емоджи" value={ruleForm.emoji} onChange={(v: string) => setRuleForm(f => ({ ...f, emoji: v }))} placeholder="🔫" />
                <FieldInput label="Заглавие" value={ruleForm.title} onChange={(v: string) => setRuleForm(f => ({ ...f, title: v }))} required />
              </div>
              <div><label className="block text-xs font-heading font-bold tracking-widest uppercase text-muted-foreground mb-1">Цвят</label>
                <div className="flex gap-2 flex-wrap">{RULE_COLOR_OPTIONS.map(c => (
                  <button key={c} onClick={() => setRuleForm(f => ({ ...f, color: c }))} className={`px-3 py-1.5 rounded-lg border text-xs font-heading font-bold capitalize transition-colors ${ruleForm.color === c ? "border-neon-purple/50 bg-neon-purple/15 text-neon-purple" : "border-border text-muted-foreground"}`}>{c}</button>
                ))}</div></div>
              <FieldTextarea label="Точки (по 1 на ред)" value={ruleForm.items} onChange={(v: string) => setRuleForm(f => ({ ...f, items: v }))} rows={5} placeholder="Точка 1&#10;Точка 2" />
              <FieldInput label="Бележка (note)" value={ruleForm.note} onChange={(v: string) => setRuleForm(f => ({ ...f, note: v }))} placeholder="Опционална бележка" />
              <FieldInput label="Ред (sort order)" value={ruleForm.sort_order} onChange={(v: number) => setRuleForm(f => ({ ...f, sort_order: v }))} type="number" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ruleForm.is_active} onChange={(e) => setRuleForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-neon-purple" />
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
          <div className="glass-strong border border-neon-purple/30 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-in-up p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-black text-lg tracking-widest uppercase text-neon-purple">{settingModal.id ? "✏️ Редактирай" : "➕ Нова"} Настройка</h2>
              <button onClick={() => setSettingModal(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
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
          <div className="glass-strong border border-neon-purple/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
            <div className="p-6 border-b border-white/8 flex items-center justify-between">
              <h2 className="text-xl font-heading font-black tracking-widest uppercase text-neon-purple">{selected.name}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { openGangEdit(selected); }} disabled={isStaffReadOnly} className="text-neon-cyan hover:text-neon-cyan/80 transition-colors disabled:opacity-50 disabled:pointer-events-none" title="Редактирай"><Edit2 size={18} /></button>
                <button onClick={() => { setDeleteConfirm({ id: selected.id, type: "app" }); }} className="text-neon-red hover:text-neon-red/80 transition-colors" title="Изтрий"><Trash2 size={18} /></button>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><XCircle size={20} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {deleteConfirm?.id === selected.id && deleteConfirm?.type === "app" && (
                <div className="glass border border-neon-red/40 rounded-xl p-4 flex items-center gap-3">
                  <AlertTriangle size={20} className="text-neon-red shrink-0" />
                  <div className="flex-1"><div className="text-sm font-heading font-bold text-neon-red">Сигурен ли си?</div><div className="text-xs text-muted-foreground font-body">Тази кандидатура ще бъде изтрита завинаги.</div></div>
                  <button onClick={() => deleteApp(selected.id)} className="px-3 py-1.5 rounded-lg border border-neon-red/50 bg-neon-red/15 text-neon-red text-xs font-heading font-bold hover:bg-neon-red/25 transition-colors">Изтрий</button>
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
                    className="w-full px-3 py-2 rounded-xl glass border border-border focus:border-neon-purple/50 focus:outline-none text-sm font-body text-foreground placeholder:text-muted-foreground bg-transparent resize-none h-24" />
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => updateStatus(selected.id, "approved")} disabled={isStaffReadOnly} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neon-green/50 bg-neon-green/10 text-neon-green font-heading font-bold tracking-widest uppercase text-sm hover:bg-neon-green/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"><CheckCircle size={16} /> Одобри</button>
                    <button onClick={() => updateStatus(selected.id, "rejected")} disabled={isStaffReadOnly} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neon-red/50 bg-neon-red/10 text-neon-red font-heading font-bold tracking-widest uppercase text-sm hover:bg-neon-red/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"><XCircle size={16} /> Откажи</button>
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
    </>
  );
}
