"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type CartItem = {
  templateId: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  addItem: (templateId: string, quantity?: number) => void;
  removeItem: (templateId: string) => void;
  setQuantity: (templateId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "giftlink_cart_v1";

function loadInitialCart(): CartState {
  if (typeof window === "undefined") {
    return { items: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
    return { items: parsed.items };
  } catch {
    return { items: [] };
  }
}

function saveCart(state: CartState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // hydrate from localStorage on first client mount
  useEffect(() => {
    const initial = loadInitialCart();
    setItems(initial.items);
  }, []);

  // persist any changes to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    saveCart({ items });
  }, [items]);

  const addItem = (templateId: string, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.templateId === templateId);
      if (existing) {
        return prev.map((i) =>
          i.templateId === templateId
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { templateId, quantity }];
    });
  };

  const removeItem = (templateId: string) => {
    setItems((prev) => prev.filter((i) => i.templateId !== templateId));
  };

  const setQuantity = (templateId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(templateId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.templateId === templateId ? { ...i, quantity } : i,
      ),
    );
  };

  const clearCart = () => {
    setItems([]);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const value: CartContextValue = {
    items,
    itemCount,
    addItem,
    removeItem,
    setQuantity,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return ctx;
}
