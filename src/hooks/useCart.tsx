import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ShopItem } from "@/lib/shopData";
import { formatPriceEur, getPriceCents } from "@/lib/shopData";
import { supabase } from "@/integrations/supabase/client";
import { isLogActivityEnabled, sendLogActivity } from "@/lib/logActivity";

export type CartItem = { item: ShopItem; qty: number };

const COUPON_LS_KEY = "chillrp-shop-coupon-code";

export type CouponPreview = {
  subtotal_cents: number;
  discount_cents: number;
  final_cents: number;
  code: string;
};

interface CartContextType {
  items: CartItem[];
  addItem: (item: ShopItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  totalPriceCents: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  couponCode: string;
  setCouponCode: (code: string) => void;
  couponPreview: CouponPreview | null;
  couponValidating: boolean;
  couponError: string | null;
  validateCouponForCheckout: (
    productId: string | null,
    subtotalCents: number
  ) => Promise<{ ok: boolean; error?: string; finalCents?: number; subtotalCents?: number }>;
  clearCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function parsePrice(price: string): number {
  return parseFloat(price.replace(/[^\d.]/g, "")) || 0;
}

function rpcCouponErrorMessage(err: string | undefined): string {
  switch (err) {
    case "not_authenticated":
      return "Влез с акаунт.";
    case "bad_subtotal":
      return "Невалидна сума.";
    case "empty_code":
      return "Въведи код.";
    case "invalid_code":
      return "Невалиден код.";
    case "inactive":
      return "Купонът е деактивиран.";
    case "expired":
      return "Купонът е изтекъл.";
    case "max_uses":
      return "Купонът е изчерпан.";
    case "below_min_cart":
      return "Под минималната сума за купона.";
    case "product_required":
      return "Този код важи за конкретен продукт — използвай го от страницата на продукта.";
    case "product_not_eligible":
      return "Купонът не важи за този продукт.";
    case "discount_too_high":
      return "Отстъпката е твърде голяма.";
    default:
      return err || "Купонът не може да се приложи.";
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("chillrp-cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [couponCode, setCouponCodeState] = useState(() => {
    try {
      return localStorage.getItem(COUPON_LS_KEY)?.trim() || "";
    } catch {
      return "";
    }
  });
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("chillrp-cart", JSON.stringify(items));
  }, [items]);

  const setCouponCode = useCallback((code: string) => {
    const t = code.trim();
    setCouponCodeState(t);
    try {
      if (t) localStorage.setItem(COUPON_LS_KEY, t);
      else localStorage.removeItem(COUPON_LS_KEY);
    } catch {
      /* ignore */
    }
    setCouponPreview(null);
    setCouponError(null);
  }, []);

  const clearCoupon = useCallback(() => {
    setCouponCodeState("");
    setCouponPreview(null);
    setCouponError(null);
    try {
      localStorage.removeItem(COUPON_LS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const validateCouponForCheckout = useCallback(
    async (
      productId: string | null,
      subtotalCents: number
    ): Promise<{ ok: boolean; error?: string; finalCents?: number; subtotalCents?: number }> => {
      const raw = couponCode.trim();
      if (!raw) {
        setCouponPreview(null);
        setCouponError(null);
        return { ok: true, finalCents: subtotalCents, subtotalCents };
      }
      setCouponValidating(true);
      setCouponError(null);
      try {
        const { data, error } = await supabase.rpc("validate_shop_coupon", {
          p_code: raw,
          p_product_id: productId,
          p_subtotal_cents: subtotalCents,
        });
        if (error) {
          setCouponPreview(null);
          const msg = error.message || "RPC грешка.";
          setCouponError(msg);
          return { ok: false, error: msg };
        }
        const payload = data as { ok?: boolean; error?: string } | null;
        if (!payload?.ok) {
          setCouponPreview(null);
          const msg = rpcCouponErrorMessage(payload?.error);
          setCouponError(msg);
          return { ok: false, error: msg };
        }
        const p = data as CouponPreview & { ok: boolean };
        setCouponPreview({
          subtotal_cents: p.subtotal_cents,
          discount_cents: p.discount_cents,
          final_cents: p.final_cents,
          code: p.code,
        });
        return { ok: true, finalCents: p.final_cents, subtotalCents: p.subtotal_cents };
      } finally {
        setCouponValidating(false);
      }
    },
    [couponCode]
  );

  const addItem = useCallback((item: ShopItem) => {
    setItems((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) return prev.map((ci) => (ci.item.id === item.id ? { ...ci, qty: ci.qty + 1 } : ci));
      return [...prev, { item, qty: 1 }];
    });
    setIsOpen(true);
    if (isLogActivityEnabled()) {
      sendLogActivity({
        event: "cart_add",
        details: `Добави в кошницата: ${item.name} (${formatPriceEur(item.price)})`,
        page: "/shop",
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((ci) => ci.item.id !== id));
  }, []);

  const updateQty = useCallback(
    (id: string, qty: number) => {
      if (qty <= 0) {
        removeItem(id);
        return;
      }
      setItems((prev) => prev.map((ci) => (ci.item.id === id ? { ...ci, qty } : ci)));
    },
    [removeItem]
  );

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((s, ci) => s + ci.qty, 0);
  const totalPrice = items.reduce((s, ci) => s + parsePrice(ci.item.price) * ci.qty, 0);
  const totalPriceCents = items.reduce((s, ci) => s + getPriceCents(ci.item) * ci.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        totalItems,
        totalPrice,
        totalPriceCents,
        isOpen,
        setIsOpen,
        couponCode,
        setCouponCode,
        couponPreview,
        couponValidating,
        couponError,
        validateCouponForCheckout,
        clearCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
