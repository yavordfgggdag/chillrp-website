import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { Menu, X, LogOut, User, ShoppingCart } from "lucide-react";
import chillrpLogo from "@/assets/chillrp-logo.png";
import { DISCORD_INVITE } from "@/lib/config";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

const navItemsBase = [
  { label: "Начало", href: "/" },
  { label: "Правила", submenu: [
    { label: "Discord", href: "/rules/discord" },
    { label: "Сървър", href: "/rules/server" },
    { label: "Криминал", href: "/rules/crime" },
    { label: "Базар / Магазин", href: "/rules/bazaar" },
    { label: "Наръчник Полиция", href: "/police", requirePoliceRole: true },
  ]},
  { label: "Безплатен Генг", href: "/gangs" },
  { label: "Магазин", href: "/shop" },
  { label: "Staff", href: "/#staff" },
  { label: "FAQ", href: "/faq" },
];

function buildNavItems(siteRole: "citizen" | "staff" | "administrator" | null, hasUser: boolean, hasPoliceRole: boolean) {
  const showPolice = hasPoliceRole === true;
  const showAdmin = siteRole === "staff" || siteRole === "administrator";
  const rulesSubmenu = navItemsBase.find((i) => i.submenu)!.submenu!.filter(
    (sub) => !(sub as { requirePoliceRole?: boolean }).requirePoliceRole || showPolice
  );
  const items = navItemsBase
    .filter((i) => !i.submenu || (i.submenu && rulesSubmenu.length > 0))
    .map((i) => (i.submenu ? { ...i, submenu: rulesSubmenu } : i)) as { label: string; href?: string; submenu?: { label: string; href: string }[] }[];
  if (showAdmin) items.push({ label: "Админ панел", href: "/admin" });
  return items;
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = useCallback((href: string) => {
    if (href.includes('#')) {
      const [path, hash] = href.split('#');
      if (location.pathname === path || (path === '/' && location.pathname === '/')) {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate(path);
        setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
      return true;
    }
    return false;
  }, [location.pathname, navigate]);
  const { user, signOut, loading, siteRole, hasPoliceRole } = useAuth();
  const { totalItems, setIsOpen: setCartOpen } = useCart();
  const navItems = useMemo(() => buildNavItems(siteRole ?? null, !!user, hasPoliceRole === true), [siteRole, user, hasPoliceRole]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Излязъл си от акаунта.");
  };

  return (
    <>
      <nav className="fixed top-10 left-0 right-0 z-50 glass-strong border-b border-white/8">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center">
            <img src={chillrpLogo} alt="ChillRP" className="h-11 w-auto drop-shadow-[0_0_12px_rgba(160,100,255,0.35)]" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) =>
              item.submenu ? (
                <div key="rules" className="relative"
                  onMouseEnter={() => setRulesOpen(true)}
                  onMouseLeave={() => setRulesOpen(false)}
                >
                  <button className={`px-4 py-2 rounded text-sm font-heading font-semibold tracking-widest uppercase transition-all flex items-center gap-1.5
                    ${location.pathname.startsWith("/rules") ? "text-neon-purple text-glow-purple" : "text-muted-foreground hover:text-foreground"}`}>
                    {item.label}
                  </button>
                  <div className={`absolute top-full left-0 glass-strong border border-white/8 rounded-xl overflow-hidden min-w-[150px] transition-all duration-200 ${rulesOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
                    {item.submenu.map((sub) => (
                      <Link key={sub.href} to={sub.href}
                        className={`block px-4 py-2.5 text-sm font-heading font-semibold tracking-wider uppercase border-b border-white/5 last:border-0 transition-colors
                          ${location.pathname === sub.href ? "text-neon-purple bg-neon-purple/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : item.href?.includes('#') ? (
                <button key={item.href} onClick={() => handleNavClick(item.href!)}
                  className="px-4 py-2 rounded text-sm font-heading font-semibold tracking-widest uppercase transition-all flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  {item.label}
                </button>
              ) : (
                <Link key={item.href} to={item.href!}
                  className={`px-4 py-2 rounded text-sm font-heading font-semibold tracking-widest uppercase transition-all flex items-center gap-1.5
                    ${location.pathname === item.href ? "text-neon-purple text-glow-purple" : "text-muted-foreground hover:text-foreground"}`}>
                  {item.label}
                </Link>
              )
            )}
          </div>

          {/* Right side — auth + discord */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 rounded-lg glass border border-white/10 text-muted-foreground hover:text-neon-purple hover:border-neon-purple/40 transition-colors"
              aria-label="Количка"
            >
              <ShoppingCart size={16} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-purple text-background text-[9px] font-heading font-black flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
            {!loading && user && (
                <div className="flex items-center gap-2">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-white/10 text-xs font-heading text-muted-foreground hover:border-neon-purple/40 hover:text-neon-purple transition-colors"
                  >
                    <User size={12} className="text-neon-purple" />
                    <span className="max-w-[120px] truncate">{user.email?.split("@")[0]}</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="p-2 rounded-lg glass border border-white/10 text-muted-foreground hover:text-neon-red hover:border-neon-red/30 transition-colors"
                    title="Излез"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
            )}
            <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg border border-neon-purple/50 bg-neon-purple/12 text-neon-purple text-sm font-heading font-bold tracking-widest uppercase hover:bg-neon-purple/22 glow-purple transition-all">
              Discord
            </a>
          </div>

          <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {open && (
          <div className="md:hidden glass-strong border-t border-white/5 px-4 pb-4 animate-fade-in">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.submenu ? (
                  <>
                    <div className="py-2 text-xs font-heading font-semibold tracking-widest text-muted-foreground uppercase mt-2">
                      Правила
                    </div>
                    {item.submenu.map((sub) => (
                      <Link key={sub.href} to={sub.href} onClick={() => setOpen(false)}
                        className="block pl-4 py-2 text-sm font-heading font-semibold tracking-wider text-muted-foreground hover:text-neon-purple">
                        {sub.label}
                      </Link>
                    ))}
                  </>
                ) : item.href?.includes('#') ? (
                  <button onClick={() => { setOpen(false); handleNavClick(item.href!); }}
                    className="block w-full text-left py-2.5 text-sm font-heading font-semibold tracking-widest uppercase border-b border-white/5 text-muted-foreground hover:text-neon-purple">
                    {item.label}
                  </button>
                ) : (
                  <Link to={item.href!} onClick={() => setOpen(false)}
                    className={`block py-2.5 text-sm font-heading font-semibold tracking-widest uppercase border-b border-white/5
                      ${location.pathname === item.href ? "text-neon-purple" : "text-muted-foreground hover:text-neon-purple"}`}>
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={() => { setOpen(false); setCartOpen(true); }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 text-muted-foreground text-sm font-heading font-semibold tracking-widest uppercase hover:text-neon-purple hover:border-neon-purple/40 transition-colors relative"
              >
                <ShoppingCart size={14} /> Количка
                {totalItems > 0 && (
                  <span className="w-4 h-4 rounded-full bg-neon-purple text-background text-[9px] font-heading font-black flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
              {user && (
                <button onClick={handleSignOut}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 text-muted-foreground text-sm font-heading font-semibold tracking-widest uppercase">
                  <LogOut size={14} /> Излез ({user.email?.split("@")[0]})
                </button>
              )}
              <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-neon-purple/50 bg-neon-purple/12 text-neon-purple text-sm font-heading font-bold tracking-widest uppercase">
                Discord
              </a>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
