// ETL: copy mbp_kv store/orders into relational tables (additive, idempotent upserts).
// Usage: node scripts/migrate-kv-to-sql.js
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and schema-relational.sql applied.

require('dotenv').config();
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing Supabase env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function getKv(k) {
  const { data, error } = await supabase.from('mbp_kv').select('v').eq('k', k).maybeSingle();
  if (error) throw error;
  return data?.v;
}

async function main() {
  console.log('Migrating KV → relational tables…');
  const store = (await getKv('store')) || { products: [] };
  const orders = (await getKv('orders')) || [];
  const events = (await getKv('analytics_events')) || [];
  const promotions = (await getKv('promotions')) || [];

  const products = Array.isArray(store.products) ? store.products : [];
  for (const p of products) {
    const row = {
      id: p.id,
      category_id: p.category || null,
      name: p.name || 'Untitled',
      price: Number(p.price || 0),
      sale_price: p.salePrice != null ? Number(p.salePrice) : null,
      description: p.desc || '',
      image: p.image || '',
      image_back: p.imageBack || '',
      images: p.images || [],
      sizes: p.sizes || [],
      colors: p.colors || [],
      badges: p.badges || [],
      tags: p.tags || [],
      sku: p.sku || '',
      stock: p.stock != null ? Number(p.stock) : null,
      sold_out: Boolean(p.soldOut),
      materials: p.materials || '',
      care: p.care || '',
      slug: p.slug || null,
      seo_title: p.seoTitle || '',
      seo_description: p.seoDescription || '',
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('mbp_products').upsert(row, { onConflict: 'id' });
    if (error) console.warn('product', p.id, error.message);
  }
  console.log(`Products upserted: ${products.length}`);

  for (const o of orders) {
    const id = o.id || o.reference || randomUUID();
    const orderRow = {
      id,
      reference: o.reference,
      customer: o.customer || {},
      totals: o.totals || {},
      status: o.status || 'confirmed',
      notes: o.notes || '',
      admin_notes: o.adminNotes || '',
      paystack: o.paystack || {},
      paid_at: o.paystack?.paidAt || o.createdAt || null,
      created_at: o.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('mbp_orders').upsert(orderRow, { onConflict: 'id' });
    if (error) console.warn('order', o.reference, error.message);
    else {
      const items = Array.isArray(o.totals?.items) ? o.totals.items : [];
      for (const it of items) {
        if (String(it.id || '').startsWith('__delivery__')) continue;
        await supabase.from('mbp_order_items').upsert({
          id: `${id}-${it.id || randomUUID()}-${it.size || ''}`,
          order_id: id,
          product_id: it.id || null,
          name: it.name || 'Item',
          size: it.size || '',
          color: it.color || '',
          qty: Number(it.quantity || it.qty || 1),
          unit_price: Number(it.price || 0),
          image: it.image || '',
        }, { onConflict: 'id' });
      }
    }
  }
  console.log(`Orders upserted: ${orders.length}`);

  for (const e of (Array.isArray(events) ? events : []).slice(0, 2000)) {
    await supabase.from('mbp_analytics_events').upsert({
      id: e.id || randomUUID(),
      type: e.type || 'unknown',
      payload: e.payload || {},
      created_at: e.at || new Date().toISOString(),
    }, { onConflict: 'id' });
  }

  for (const p of Array.isArray(promotions) ? promotions : []) {
    await supabase.from('mbp_promotions').upsert({
      id: p.id,
      code: p.code,
      type: p.type || 'percent',
      value: Number(p.value || 0),
      active: p.active !== false,
      starts_at: p.startsAt || null,
      ends_at: p.endsAt || null,
      usage_limit: p.usageLimit ?? null,
      min_order: Number(p.minOrder || 0),
    }, { onConflict: 'id' });
  }

  console.log('Done. KV data preserved; relational tables filled.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
