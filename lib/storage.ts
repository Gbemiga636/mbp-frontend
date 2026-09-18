const CART_KEY = 'mbp_cart_v1';
const WISH_KEY = 'mbp_wishlist_v1';
const RECENT_KEY = 'mbp_recent_v1';
const SEARCH_KEY = 'mbp_recent_searches_v1';
const ZONE_KEY = 'mbp_delivery_zone_v1';
const COOKIE_KEY = 'mbp_cookie_consent_v1';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      // migrate legacy cookie cart
      if (key === CART_KEY) {
        const cookie = document.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${CART_KEY}=`));
        if (cookie) {
          const val = decodeURIComponent(cookie.split('=').slice(1).join('='));
          const parsed = JSON.parse(val);
          window.localStorage.setItem(key, JSON.stringify(parsed));
          return parsed as T;
        }
      }
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getCart: () => readJson(CART_KEY, [] as import('./types').CartItem[]),
  setCart: (v: import('./types').CartItem[]) => writeJson(CART_KEY, v),
  getWishlist: () => readJson(WISH_KEY, [] as string[]),
  setWishlist: (v: string[]) => writeJson(WISH_KEY, v),
  getRecent: () => readJson(RECENT_KEY, [] as string[]),
  setRecent: (v: string[]) => writeJson(RECENT_KEY, v.slice(0, 12)),
  getSearches: () => readJson(SEARCH_KEY, [] as string[]),
  setSearches: (v: string[]) => writeJson(SEARCH_KEY, v.slice(0, 8)),
  getZone: () => readJson(ZONE_KEY, 'lekki'),
  setZone: (v: string) => writeJson(ZONE_KEY, v),
  getConsent: () => readJson<string | null>(COOKIE_KEY, null),
  setConsent: (v: string) => writeJson(COOKIE_KEY, v),
};
