import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import FloatingJoinButton from "@/components/FloatingJoinButton";
import ActivityTracker from "@/components/ActivityTracker";
import CookieConsent from "@/components/CookieConsent";
import SiteFooter from "@/components/SiteFooter";
import LoginGate from "@/components/LoginGate";
import NewVersionBanner from "@/components/NewVersionBanner";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const GangApplications = lazy(() => import("./pages/GangApplications"));
const RulesHub = lazy(() => import("./pages/RulesHub"));
const McRulesPage = lazy(() => import("./pages/McRulesPage"));
const GameModes = lazy(() => import("./pages/GameModes"));
const Staff = lazy(() => import("./pages/Staff"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Profile = lazy(() => import("./pages/Profile"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Cookies = lazy(() => import("./pages/Cookies"));
const Terms = lazy(() => import("./pages/Terms"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const VotePage = lazy(() => import("./pages/VotePage"));
const WalletSms = lazy(() => import("./pages/WalletSms"));
const BuilderApplication = lazy(() => import("./pages/BuilderApplication"));
const HelperApplication = lazy(() => import("./pages/HelperApplication"));
const MinecraftShopGate = lazy(() => import("./components/MinecraftShopGate"));

const CartDrawer = lazy(() => import("@/components/CartDrawer"));
const ChatWidget = lazy(() => import("@/components/ChatWidget"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 pt-24 px-4">
      <Loader2 className="h-9 w-9 text-primary animate-spin shrink-0" aria-hidden />
      <p className="text-sm text-muted-foreground font-body">Зареждане...</p>
    </div>
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason?.message ?? String(event.reason);
    if (typeof msg === "string" && msg.includes("message channel closed") && msg.includes("asynchronous response")) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

const router = createBrowserRouter(
  [
    {
      path: "*",
      element: (
        <AuthProvider>
          <CartProvider>
            <LoginGate>
              <AppContent />
            </LoginGate>
          </CartProvider>
        </AuthProvider>
      ),
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  return (
    <>
      <ActivityTracker />
      <header className="fixed top-0 left-0 right-0 z-[80] flex flex-col shadow-md shadow-black/25">
        <AnnouncementBar />
        <Navbar />
      </header>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/servers" element={<GameModes />} />
          <Route path="/modes" element={<Navigate to="/servers" replace />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/applications" element={<GangApplications />} />
          <Route path="/gangs" element={<Navigate to="/applications" replace />} />
          <Route path="/rules" element={<RulesHub />} />
          <Route path="/rules/server" element={<Navigate to="/rules/general" replace />} />
          <Route path="/rules/crime" element={<Navigate to="/rules/factions" replace />} />
          <Route path="/rules/bazaar" element={<Navigate to="/rules/general" replace />} />
          <Route path="/rules/:section" element={<McRulesPage />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="/wallet" element={<WalletSms />} />
          <Route path="/applications/builder" element={<BuilderApplication />} />
          <Route path="/applications/helper" element={<HelperApplication />} />
          <Route element={<MinecraftShopGate />}>
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:id" element={<ProductDetail />} />
            <Route path="/shop/product/:id" element={<ProductDetail />} />
          </Route>
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/faq" element={<Navigate to="/" replace />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <FloatingJoinButton />
      <Suspense fallback={null}>
        <CartDrawer />
      </Suspense>
      <CookieConsent />
      <SiteFooter />
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
      <NewVersionBanner />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider router={router} future={{ v7_startTransition: true, v7_relativeSplatPath: true }} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
