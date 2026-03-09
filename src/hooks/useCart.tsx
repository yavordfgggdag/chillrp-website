import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ShopItem } from "@/lib/shopData";
import { formatPriceEur } from "@/lib/shopData";
import { supabase } from "@/integrations/supabase/client";
import { isLogActivityEnabled, sendLogActivity } from "@/lib/logActivity";

export type CartItem = { item: ShopItem; qty: number };

interface CartContextType {
  items: CartItem[];
  addItem: (item: ShopItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function parsePrice(price: string): number {
  return parseFloat(price.replace(/[^\d.]/g, "")) || 0;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("chillrp-cart");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("chillrp-cart", JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: ShopItem) => {
    setItems(prev => {
      const existing = prev.find(ci => ci.item.id === item.id);
      if (existing) return prev.map(ci => ci.item.id === item.id ? { ...ci, qty: ci.qty + 1 } : ci);
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
    setItems(prev => prev.filter(ci => ci.item.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) { removeItem(id); return; }
    setItems(prev => prev.map(ci => ci.item.id === id ? { ...ci, qty } : ci));
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((s, ci) => s + ci.qty, 0);
  const totalPrice = items.reduce((s, ci) => s + parsePrice(ci.item.price) * ci.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
