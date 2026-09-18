'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem, Product } from '@/lib/types';
import { storage } from '@/lib/storage';
import { trackEvent } from '@/lib/api';
import { displayPrice } from '@/lib/format';

type Toast = { id: string; message: string };

type SizePromptState = { product: Product; color?: string; qty?: number } | null;

type StoreContextValue = {
  cart: CartItem[];
  wishlist: string[];
  recentIds: string[];
  cartCount: number;
  cartSubtotal: number;
  searchOpen: boolean;
  cartOpen: boolean;
  menuOpen: boolean;
  toasts: Toast[];
  sizePrompt: SizePromptState;
  setSearchOpen: (v: boolean) => void;
  setCartOpen: (v: boolean) => void;
  setMenuOpen: (v: boolean) => void;
  addToCart: (product: Product, opts: { size: string; color?: string; qty?: number }) => void;
  promptAddToCart: (product: Product, opts?: { color?: string; qty?: number }) => void;
  closeSizePrompt: () => void;
  updateQty: (id: string, size: string, qty: number) => void;
  removeFromCart: (id: string, size: string) => void;
  clearCart: () => void;
  toggleWishlist: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  pushRecent: (id: string) => void;
  toast: (message: string) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sizePrompt, setSizePrompt] = useState<SizePromptState>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCart(storage.getCart());
    setWishlist(storage.getWishlist());
    setRecentIds(storage.getRecent());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    storage.setCart(cart);
  }, [cart, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    storage.setWishlist(wishlist);
  }, [wishlist, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    storage.setRecent(recentIds);
  }, [recentIds, hydrated]);

  const toast = useCallback((message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const addToCart = useCallback(
    (product: Product, opts: { size: string; color?: string; qty?: number }) => {
      const size = String(opts.size || '').trim() || 'One size';
      const qty = Math.max(1, Number(opts.qty || 1));
      const { price } = displayPrice(product);
      setCart((prev) => {
        const idx = prev.findIndex(
          (i) => i.id === product.id && i.size === size && (i.color || '') === (opts.color || '')
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], qty: next[idx].qty + qty };
          return next;
        }
        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            price,
            image: product.image,
            size,
            color: opts.color,
            qty,
          },
        ];
      });
      trackEvent('add_to_cart', { productId: product.id, size, qty });
      toast('Added to cart');
      setCartOpen(true);
    },
    [toast]
  );

  const promptAddToCart = useCallback((product: Product, opts?: { color?: string; qty?: number }) => {
    if (product.soldOut) {
      toast('This piece is sold out');
      return;
    }
    setSizePrompt({ product, color: opts?.color, qty: opts?.qty });
  }, [toast]);

  const closeSizePrompt = useCallback(() => setSizePrompt(null), []);

  const updateQty = useCallback((id: string, size: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id && i.size === size ? { ...i, qty: Math.max(1, qty) } : i))
        .filter((i) => i.qty > 0)
    );
  }, []);

  const removeFromCart = useCallback((id: string, size: string) => {
    setCart((prev) => prev.filter((i) => !(i.id === id && i.size === size)));
    trackEvent('remove_from_cart', { productId: id, size });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback(
    (id: string) => {
      setWishlist((prev) => {
        const has = prev.includes(id);
        trackEvent(has ? 'wishlist_remove' : 'wishlist_add', { productId: id });
        toast(has ? 'Removed from wishlist' : 'Saved to wishlist');
        return has ? prev.filter((x) => x !== id) : [...prev, id];
      });
    },
    [toast]
  );

  const isWishlisted = useCallback((id: string) => wishlist.includes(id), [wishlist]);

  const pushRecent = useCallback((id: string) => {
    setRecentIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 12));
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      cart,
      wishlist,
      recentIds,
      cartCount: cart.reduce((s, i) => s + i.qty, 0),
      cartSubtotal: cart.reduce((s, i) => s + i.price * i.qty, 0),
      searchOpen,
      cartOpen,
      menuOpen,
      toasts,
      sizePrompt,
      setSearchOpen,
      setCartOpen,
      setMenuOpen,
      addToCart,
      promptAddToCart,
      closeSizePrompt,
      updateQty,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isWishlisted,
      pushRecent,
      toast,
    }),
    [
      cart,
      wishlist,
      recentIds,
      searchOpen,
      cartOpen,
      menuOpen,
      toasts,
      sizePrompt,
      addToCart,
      promptAddToCart,
      closeSizePrompt,
      updateQty,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isWishlisted,
      pushRecent,
      toast,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
