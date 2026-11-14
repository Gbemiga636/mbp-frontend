const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // older Node
}

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseServiceKey } = require('./supabase-env');
const { reviveHome, reviveStore, reviveGallery } = require('./revive-media');

const TABLE = 'mbp_kv';

let client = null;
let seed = null;

function getSeed() {
  if (!seed) {
    try {
      seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-kv.json'), 'utf8'));
    } catch {
      seed = {};
    }
  }
  return seed;
}

function getClient() {
  const url = supabaseUrl();
  const key = supabaseServiceKey();
  if (!url || !key) {
    throw new Error('MBP_SUPABASE_URL and MBP_SUPABASE_SERVICE_ROLE_KEY are required');
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

async function fromTable(key) {
  const { data, error } = await getClient()
    .from(TABLE)
    .select('v')
    .eq('k', String(key))
    .maybeSingle();
  if (error) throw error;
  return data?.v ?? null;
}

async function dbGet(key) {
  const k = String(key);
  try {
    const value = await fromTable(k);
    if (value != null) return value;
  } catch {
    // table missing or host down — use bundled seed, never Storage (free-plan egress)
  }
  const fallback = getSeed()[k];
  return fallback !== undefined ? fallback : null;
}

async function dbSet(key, value) {
  const { error } = await getClient()
    .from(TABLE)
    .upsert(
      { k: String(key), v: value ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'k' }
    );
  if (error) throw error;
}

async function dbGetAll() {
  try {
    const { data, error } = await getClient().from(TABLE).select('k, v');
    if (!error && data?.length) {
      const map = new Map();
      for (const row of data) map.set(row.k, row.v);
      return map;
    }
  } catch {
    // seed fallback
  }
  const map = new Map();
  for (const [k, v] of Object.entries(getSeed())) map.set(k, v);
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
  const home = (await dbGet('home')) || { heroVideo: '', bandVideo: '', preloadVideo: '', featured: [], reviews: [] };
  return reviveHome(home);
}

async function getStore() {
  const store = (await dbGet('store')) || { products: [] };
  return reviveStore(store);
}

async function getGallery() {
  const gallery = (await dbGet('gallery')) || { items: [] };
  return reviveGallery(gallery);
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
