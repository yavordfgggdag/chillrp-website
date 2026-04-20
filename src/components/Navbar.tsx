import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { Menu, X, LogOut, User, ShoppingCart, Wallet } from "lucide-react";
import mcBundled from "@/assets/tlr-mc-logo.png";
import { DISCORD_INVITE } from "@/lib/config";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { useBranding } from "@/hooks/useBranding";
import { formatBalanceEur, useProfileWallet } from "@/hooks/useProfileWallet";

type NavSub = { label: string; href: string };
type NavItem =
  | { label: string; href: string }
  | { label: string; menu: "rules" | "apps"; submenu: NavSub[] };

const navItemsBase: NavItem[] = [
  { label: "Начало", href: "/" },
  { label: "Сървъри", href: "/servers" },
  {
    label: "Правила",
    menu: "rules",
    submenu: [
      { label: "Всички раздели", href: "/rules" },
      { label: "Общи", href: "/rules/general" },
      { label: "Чат", href: "/rules/chat" },
      { label: "SMP", href: "/rules/smp" },
      { label: "Factions", href: "/rules/factions" },
      { label: "Discord", href: "/rules/discord" },
      { label: "Staff / Helper", href: "/rules/staff" },
      { label: "Anti-cheat", href: "/rules/anticheat" },
      { label: "Наказания", href: "/rules/punishments" },
    ],
  },
  { label: "Магазин", href: "/shop" },
  { label: "Гласувай", href: "/vote" },
  { label: "Баланс / SMS", href: "/wallet" },
  {
    label: "Кандидатури",
    menu: "apps",
    submenu: [
      { label: "Gang", href: "/applications" },
      { label: "Builder", href: "/applications/builder" },
      { label: "Helper", href: "/applications/helper" },
    ],
  },
  { label: "Екип", href: "/staff" },
];

function buildNavItems(siteRole: "citizen" | "staff" | "administrator" | null) {
  const showAdmin = siteRole === "staff" || siteRole === "administrator";
  const items = [...navItemsBase];
  if (showAdmin) items.push({ label: "Админ панел", href: "/admin" });
  return items;
}

function navLinkActive(pathname: string, href: string): boolean {
  if (href === "/shop") return pathname.startsWith("/shop");
  if (href === "/applications") return pathname === "/applications" || pathname.startsWith("/applications/");
  if (href === "/vote") return pathname.startsWith("/vote");
  if (href === "/wallet") return pathname.startsWith("/wallet");
  if (href === "/admin") return pathname.startsWith("/admin");
  if (href === "/profile") return pathname.startsWith("/profile");
  if (href === "/servers") return pathname.startsWith("/servers") || pathname.startsWith("/modes");
  if (href === "/staff") return pathname.startsWith("/staff");
  if (href === "/rules") return pathname === "/rules";
  if (href.startsWith("/rules/")) return pathname === href;
  return pathname === href;
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [hoverMenu, setHoverMenu] = useState<null | "rules" | "apps">(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { logoUrl } = useBranding();

  const handleNavClick = useCallback(
    (href: string) => {
      const hashIdx = href.indexOf("#");
      if (hashIdx < 0) return false;
      const rawPath = hashIdx === 0 ? "/" : href.slice(0, hashIdx);
      const path = rawPath === "" ? "/" : rawPath;
      const hash = href.slice(hashIdx + 1);
      if (!hash) return false;

      const scrollToHash = () => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      };

      if (location.pathname === path) {
        scrollToHash();
      } else {
        void navigate(path);
        setTimeout(scrollToHash, 80);
        setTimeout(scrollToHash, 400);
      }
      return true;
    },
    [location.pathname, navigate]
  );
  const { user, signOut, loading, siteRole } = useAuth();
  const { totalItems, setIsOpen: setCartOpen } = useCart();
  const { shopBalanceCents } = useProfileWallet();
  const navItems = useMemo(() => buildNavItems(siteRole ?? null), [siteRole]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Излязъл си от акаунта.");
  };

  return (
    <>
      <nav className="relative z-20 w-full glass-strong border-b border-primary/20 nav-cyber-bar overflow-visible">
        <div className="container mx-auto grid h-16 px-4 items-center overflow-visible gap-x-3 grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Link to="/" className="flex items-center justify-self-start shrink-0 z-10">
            <img
              src={logoUrl || mcBundled}
              alt="Logo"
              className="h-11 w-auto logo-neon-bloom-sm max-w-[140px] object-contain object-left"
              onError={(e) => {
                if (logoUrl) (e.currentTarget as HTMLImageElement).src = mcBundled;
              }}
            />
          </Link>

          <div className="hidden md:flex justify-self-center items-center justify-center flex-wrap gap-x-0.5 gap-y-1 lg:gap-1 min-w-0 max-w-full overflow-visible col-start-2 row-start-1">
            {navItems.map((item) =>
              "submenu" in item ? (
                <div
                  key={item.label}
                  className="relative overflow-visible"
                  onMouseEnter={() => setHoverMenu(item.menu)}
                  onMouseLeave={() => setHoverMenu(null)}
                >
                  <button
                    type="button"
                    className={`px-2.5 lg:px-4 py-2 rounded text-xs lg:text-sm font-heading font-semibold tracking-widest uppercase transition-all flex items-center gap-1.5
                    ${
                      (item.menu === "rules" && location.pathname.startsWith("/rules")) ||
                      (item.menu === "apps" && location.pathname.startsWith("/applications"))
                        ? "text-primary text-glow-accent"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                  <div
                    className={`absolute left-0 top-full z-[100] min-w-[200px] max-h-[70vh] overflow-y-auto pt-1.5 transition-all duration-150 ${
                      hoverMenu === item.menu
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 -translate-y-1 pointer-events-none"
                    }`}
                  >
                    <div className="glass-strong border border-white/8 rounded-xl overflow-hidden shadow-lg shadow-black/40">
                      {item.submenu.map((sub) => (
                        <Link
                          key={sub.href}
                          to={sub.href}
                          className={`block px-4 py-2.5 text-sm font-heading font-semibold tracking-wider uppercase border-b border-white/5 last:border-0 transition-colors
                          ${location.pathname === sub.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : item.href?.includes("#") ? (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleNavClick(item.href!)}
                  className="px-2.5 lg:px-4 py-2 rounded text-xs lg:text-sm font-heading font-semibold tracking-widest uppercase transition-all flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.href}
                  to={item.href!}
                  className={`px-2.5 lg:px-4 py-2 rounded text-xs lg:text-sm font-heading font-semibold tracking-widest uppercase transition-all flex items-center gap-1.5
                    ${navLinkActive(location.pathname, item.href!) ? "text-primary text-glow-accent" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {item.label}
                </Link>
              )
            )}
          </div>

          <div className="justify-self-end flex items-center gap-2 shrink-0 z-10 col-start-2 md:col-start-3 row-start-1">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="hidden md:flex relative p-2 rounded-lg glass border border-white/10 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
              aria-label="Количка"
            >
              <ShoppingCart size={16} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-background text-[9px] font-heading font-black flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
            {!loading && user && (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/wallet"
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-[11px] font-heading font-bold text-emerald-200 hover:border-emerald-400/50 transition-colors"
                  title="Баланс"
                >
                  <Wallet size={13} />
                  {formatBalanceEur(shopBalanceCents)}
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-white/10 text-xs font-heading text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <User size={12} className="text-primary" />
                  <span className="max-w-[120px] truncate">{user.email?.split("@")[0]}</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg glass border border-white/10 text-muted-foreground hover:text-server-light hover:border-server/35 transition-colors"
                  title="Излез"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-2 px-5 py-2 rounded-lg border border-primary/50 bg-primary/12 text-primary text-sm font-heading font-bold tracking-widest uppercase hover:bg-primary/22 glow-accent transition-all"
            >
              Discord
            </a>
            <button
              type="button"
              className="md:hidden text-foreground"
              onClick={() => setOpen(!open)}
              aria-label={open ? "Затвори меню" : "Отвори меню"}
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden glass-strong border-t border-white/5 px-4 pb-4 animate-fade-in">
            {navItems.map((item) => (
              <div key={item.label}>
                {"submenu" in item ? (
                  <>
                    <div className="py-2 text-xs font-heading font-semibold tracking-widest text-muted-foreground uppercase mt-2">
                      {item.label}
                    </div>
                    {item.submenu.map((sub) => (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        onClick={() => setOpen(false)}
                        className="block pl-4 py-2 text-sm font-heading font-semibold tracking-wider text-muted-foreground hover:text-primary"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </>
                ) : item.href?.includes("#") ? (
                  <button
                    onClick={() => {
                      setOpen(false);
                      handleNavClick(item.href!);
                    }}
                    className="block w-full text-left py-2.5 text-sm font-heading font-semibold tracking-widest uppercase border-b border-white/5 text-muted-foreground hover:text-primary"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    to={item.href!}
                    onClick={() => setOpen(false)}
                    className={`block py-2.5 text-sm font-heading font-semibold tracking-widest uppercase border-b border-white/5
                      ${navLinkActive(location.pathname, item.href!) ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCartOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 text-muted-foreground text-sm font-heading font-semibold tracking-widest uppercase hover:text-primary hover:border-primary/40 transition-colors relative"
              >
                <ShoppingCart size={14} /> Количка
                {totalItems > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-background text-[9px] font-heading font-black flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
              {!loading && user && (
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 text-muted-foreground text-sm font-heading font-semibold tracking-widest uppercase hover:text-primary hover:border-primary/40 transition-colors"
                >
                  <User size={14} className="text-primary" /> Профил
                </Link>
              )}
              {user && (
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 text-muted-foreground text-sm font-heading font-semibold tracking-widest uppercase"
                >
                  <LogOut size={14} /> Излез ({user.email?.split("@")[0]})
                </button>
              )}
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-primary/50 bg-primary/12 text-primary text-sm font-heading font-bold tracking-widest uppercase"
              >
                Discord
              </a>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
