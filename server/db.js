const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TABLE = 'mbp_kv';

let client = null;

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

async function dbGet(key) {
  const { data, error } = await getClient()
    .from(TABLE)
    .select('v')
    .eq('k', String(key))
    .maybeSingle();
  if (error) throw error;
  return data?.v ?? null;
}

async function dbSet(key, value) {
  const { error } = await getClient()
    .from(TABLE)
    .upsert({ k: String(key), v: value ?? null, updated_at: new Date().toISOString() }, { onConflict: 'k' });
  if (error) throw error;
}

async function dbGetAll() {
  const { data, error } = await getClient().from(TABLE).select('k, v');
  if (error) throw error;
  const map = new Map();
  for (const row of data || []) map.set(row.k, row.v);
  return map;
}

async function dbDelete(key) {
  const { error } = await getClient().from(TABLE).delete().eq('k', String(key));
  if (error) throw error;
}

function normalizeSizes(value) {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw.split(/[,|/]/).map((s) => s.trim()).filter(Boolean);
}

async function getHome() {
  return (await dbGet('home')) || { heroVideo: '', bandVideo: '', preloadVideo: '', featured: [], reviews: [] };
}

async function getStore() {
  return (await dbGet('store')) || { products: [] };
}

async function getGallery() {
  return (await dbGet('gallery')) || { items: [] };
}

async function getSettings() {
  return (await dbGet('settings')) || { deliveryFee: 0 };
}

async function getOrders() {
  return (await dbGet('orders')) || [];
}

async function getProcessed() {
  return (await dbGet('processed')) || [];
}

async function getOrderStatus() {
  return (await dbGet('orderStatus')) || {};
}

async function syncContent() {
  const home = await getHome();
  const store = await getStore();
  const gallery = await getGallery();
  await dbSet('content', { home, store, gallery });
  await dbSet('home', home);
  await dbSet('store', store);
  await dbSet('gallery', gallery);
}

async function buildExportSnapshot() {
  const home = await getHome();
  const store = await getStore();
  const gallery = await getGallery();
  const settings = await getSettings();
  const orders = await getOrders();
  const orderStatus = await getOrderStatus();
  const processed = await getProcessed();
  const keys = [...(await dbGetAll()).keys()].sort();

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    source: {
      supabase: { configured: true, table: TABLE },
      storage: { configured: true, bucket: 'mbp' },
    },
    home,
    store,
    gallery,
    content: { home, store, gallery },
    settings,
    orders,
    orderStatus,
    processed,
    rawKeys: keys,
  };
}

async function restoreSnapshot(snapshot) {
  if (snapshot.home) await dbSet('home', snapshot.home);
  if (snapshot.store) await dbSet('store', snapshot.store);
  if (snapshot.gallery) await dbSet('gallery', snapshot.gallery);
  if (snapshot.settings) await dbSet('settings', snapshot.settings);
  if (Array.isArray(snapshot.orders)) await dbSet('orders', snapshot.orders);
  if (snapshot.orderStatus) await dbSet('orderStatus', snapshot.orderStatus);
  if (Array.isArray(snapshot.processed)) await dbSet('processed', snapshot.processed);
  await syncContent();
}

module.exports = {
  dbGet,
  dbSet,
  dbGetAll,
  dbDelete,
  normalizeSizes,
  getHome,
  getStore,
  getGallery,
  getSettings,
  getOrders,
  getProcessed,
  getOrderStatus,
  syncContent,
  buildExportSnapshot,
  restoreSnapshot,
};
