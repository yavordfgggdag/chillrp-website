import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import GangApplications from "./pages/GangApplications";
import DiscordRules from "./pages/DiscordRules";
import ServerRules from "./pages/ServerRules";
import CrimeRules from "./pages/CrimeRules";
import BazaarRules from "./pages/BazaarRules";
import Shop from "./pages/Shop";
import AdminPanel from "./pages/AdminPanel";
import FAQ from "./pages/FAQ";
import ProductDetail from "./pages/ProductDetail";
import PaymentSuccess from "./pages/PaymentSuccess";
import Profile from "./pages/Profile";
import Police from "./pages/Police";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import Terms from "./pages/Terms";
import Navbar from "./components/Navbar";
import FloatingJoinButton from "./components/FloatingJoinButton";
import ChatWidget from "./components/ChatWidget";
import CartDrawer from "./components/CartDrawer";
import AnnouncementBar from "./components/AnnouncementBar";
import ActivityTracker from "./components/ActivityTracker";
import CookieConsent from "./components/CookieConsent";
import SiteFooter from "./components/SiteFooter";
import LoginGate from "./components/LoginGate";

const queryClient = new QueryClient();

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
  const path = location.pathname;
  const isStandalone = false;

  return (
    <>
      {!isStandalone && (
        <>
          <ActivityTracker />
          <AnnouncementBar />
          <Navbar />
        </>
      )}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/gangs" element={<GangApplications />} />
        <Route path="/rules/discord" element={<DiscordRules />} />
        <Route path="/rules/server" element={<ServerRules />} />
        <Route path="/rules/crime" element={<CrimeRules />} />
        <Route path="/rules/bazaar" element={<BazaarRules />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:id" element={<ProductDetail />} />
        <Route path="/shop/product/:id" element={<ProductDetail />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/police" element={<Police />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isStandalone && (
        <>
          <FloatingJoinButton />
          <ChatWidget />
          <CartDrawer />
          <CookieConsent />
          <SiteFooter />
        </>
      )}
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
