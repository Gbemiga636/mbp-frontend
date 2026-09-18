const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { randomUUID } = require('crypto');
const db = require('./db');
const auth = require('./auth');
const storage = require('./storage');
const paystack = require('./paystack');
const email = require('./email');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 80 * 1024 * 1024 } });

function createApp() {
  const app = express();
  const origins = [
    process.env.FRONTEND_ORIGIN,
    process.env.PUBLIC_SITE_URL,
    'http://localhost:8888',
    'http://localhost:4000',
    'http://localhost:3000',
    'http://127.0.0.1:8888',
    'http://127.0.0.1:3000',
  ].filter(Boolean);

  app.use(cors({
    origin(origin, cb) {
      if (!origin || origins.some((o) => origin === o || origin.endsWith('.netlify.app'))) return cb(null, true);
      return cb(null, origins[0] || true);
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.get('/api/config', async (_req, res, next) => {
    try {
      const settings = await db.getSettings();
      const defaultZones = [
        { id: 'lekki', label: 'Lekki', fee: 2000 },
        { id: 'vi-ikoyi', label: 'VI / Ikoyi', fee: 3000 },
        { id: 'ikota-ajah', label: 'Ikota / Ajah', fee: 3000 },
        { id: 'others', label: 'Other Lagos areas', fee: 5000 },
      ];
      res.json({
        deliveryFee: Number(settings?.deliveryFee || 0),
        whatsappNumber: settings?.whatsappNumber || '2348087504905',
        deliveryZones: Array.isArray(settings?.deliveryZones) && settings.deliveryZones.length
          ? settings.deliveryZones
          : defaultZones,
        storeName: settings?.storeName || 'MBP Lingerie',
        currency: settings?.currency || 'NGN',
      });
    } catch (e) { next(e); }
  });

  app.post('/api/analytics/event', async (req, res, next) => {
    try {
      const type = String(req.body?.type || '').slice(0, 64);
      if (!type) return res.status(400).json({ error: 'type required' });
      const payload = req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {};
      const events = (await db.dbGet('analytics_events')) || [];
      const list = Array.isArray(events) ? events : [];
      list.unshift({
        id: randomUUID(),
        type,
        payload,
        at: String(req.body?.at || new Date().toISOString()),
      });
      await db.dbSet('analytics_events', list.slice(0, 5000));
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  const LIVE_MS = 90 * 1000;

  async function readLivePresence() {
    const list = (await db.dbGet('presence')) || [];
    const now = Date.now();
    const active = (Array.isArray(list) ? list : []).filter((p) => now - Number(p.lastSeen || 0) < LIVE_MS);
    const paths = {};
    for (const p of active) {
      const path = String(p.path || '/');
      paths[path] = (paths[path] || 0) + 1;
    }
    return {
      liveViewers: active.length,
      livePaths: Object.entries(paths)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  app.post('/api/presence', async (req, res, next) => {
    try {
      const sessionId = String(req.body?.sessionId || '').slice(0, 80);
      if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
      const path = String(req.body?.path || '/').slice(0, 200);
      const now = Date.now();
      const list = (await db.dbGet('presence')) || [];
      const prev = Array.isArray(list) ? list : [];
      const next = prev.filter((p) => p.sessionId !== sessionId && now - Number(p.lastSeen || 0) < LIVE_MS * 2);
      next.push({ sessionId, path, lastSeen: now });
      await db.dbSet('presence', next.slice(-400));
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.post('/api/newsletter', async (req, res, next) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
      const subs = (await db.dbGet('newsletter_subscribers')) || [];
      const list = Array.isArray(subs) ? subs : [];
      if (!list.some((s) => s.email === email)) {
        list.unshift({ email, at: new Date().toISOString() });
        await db.dbSet('newsletter_subscribers', list.slice(0, 10000));
      }
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.post('/api/contact', async (req, res, next) => {
    try {
      const name = String(req.body?.name || '').trim();
      const email = String(req.body?.email || '').trim();
      const message = String(req.body?.message || '').trim();
      if (!name || !email || !message) return res.status(400).json({ error: 'All fields required' });
      const messages = (await db.dbGet('contact_messages')) || [];
      const list = Array.isArray(messages) ? messages : [];
      list.unshift({ id: randomUUID(), name, email, message, at: new Date().toISOString(), read: false });
      await db.dbSet('contact_messages', list.slice(0, 2000));
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.post('/api/abandoned-cart', async (req, res, next) => {
    try {
      const token = String(req.body?.token || '').slice(0, 128);
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      if (!token || !items.length) return res.json({ ok: true });
      const carts = (await db.dbGet('abandoned_carts')) || [];
      const list = Array.isArray(carts) ? carts : [];
      const idx = list.findIndex((c) => c.token === token);
      const row = {
        token,
        items,
        email: String(req.body?.email || ''),
        updatedAt: new Date().toISOString(),
        value: items.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 1), 0),
      };
      if (idx >= 0) list[idx] = row;
      else list.unshift(row);
      await db.dbSet('abandoned_carts', list.slice(0, 2000));
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.get('/api/reviews/:productId', async (req, res, next) => {
    try {
      const all = (await db.dbGet('product_reviews')) || [];
      const list = (Array.isArray(all) ? all : []).filter(
        (r) => r.productId === req.params.productId && r.approved
      );
      res.json({ reviews: list });
    } catch (e) { next(e); }
  });

  app.post('/api/reviews', async (req, res, next) => {
    try {
      const productId = String(req.body?.productId || '');
      const rating = Math.min(5, Math.max(1, Number(req.body?.rating || 5)));
      const body = String(req.body?.body || '').trim();
      const authorName = String(req.body?.authorName || '').trim().slice(0, 80);
      if (!productId || !body) return res.status(400).json({ error: 'productId and body required' });
      const all = (await db.dbGet('product_reviews')) || [];
      const list = Array.isArray(all) ? all : [];
      const review = {
        id: randomUUID(),
        productId,
        rating,
        body,
        authorName: authorName || 'Customer',
        approved: false,
        helpful: 0,
        createdAt: new Date().toISOString(),
      };
      list.unshift(review);
      await db.dbSet('product_reviews', list.slice(0, 5000));
      res.json({ ok: true, message: 'Thanks — your review is pending approval.' });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/reviews', auth.requireAdmin, async (_req, res, next) => {
    try {
      res.json({ reviews: (await db.dbGet('product_reviews')) || [] });
    } catch (e) { next(e); }
  });

  app.put('/api/admin/reviews/:id', auth.requireAdmin, async (req, res, next) => {
    try {
      const all = (await db.dbGet('product_reviews')) || [];
      const list = Array.isArray(all) ? all : [];
      const idx = list.findIndex((r) => r.id === req.params.id);
      if (idx < 0) return res.status(404).json({ error: 'Not found' });
      list[idx] = {
        ...list[idx],
        approved: req.body?.approved !== undefined ? Boolean(req.body.approved) : list[idx].approved,
      };
      await db.dbSet('product_reviews', list);
      res.json(list[idx]);
    } catch (e) { next(e); }
  });

  app.delete('/api/admin/reviews/:id', auth.requireAdmin, async (req, res, next) => {
    try {
      const all = ((await db.dbGet('product_reviews')) || []).filter((r) => r.id !== req.params.id);
      await db.dbSet('product_reviews', all);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.get('/api/content/home', async (_req, res, next) => {
    try {
      const home = await db.getHome();
      res.json(home);
    } catch (e) { next(e); }
  });

  app.get('/api/content/store', async (_req, res, next) => {
    try {
      const store = await db.getStore();
      const products = (store.products || []).map((p) => ({
        ...p,
        sizes: db.normalizeSizes(p.sizes),
      }));
      res.json({ products });
    } catch (e) { next(e); }
  });

  app.get('/api/content/gallery', async (_req, res, next) => {
    try {
      res.json(await db.getGallery());
    } catch (e) { next(e); }
  });

  app.post('/api/admin/login', (req, res) => {
    try {
      const out = auth.login(req.body?.email, req.body?.password);
      res.json(out);
    } catch (e) {
      res.status(401).json({ error: e.message || 'Login failed' });
    }
  });

  app.get('/api/admin/me', auth.requireAdmin, (req, res) => {
    res.json({ email: req.admin?.sub || '', role: 'admin' });
  });

  app.get('/api/admin/data/status', auth.requireAdmin, async (_req, res, next) => {
    try {
      const home = await db.getHome();
      const store = await db.getStore();
      const hasContent = (home?.featured?.length || 0) > 0 || (store?.products?.length || 0) > 0;
      res.json({
        mysql: { configured: true, table: 'mbp_kv', lastError: '' },
        cloudinary: { configured: false, syncEnabled: false },
        supabase: { configured: true, storageBucket: 'mbp' },
        restore: { expected: false, contentReady: hasContent, attempts: 0, lastSuccessAt: 0, lastError: '' },
        write: { lastError: '' },
      });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/data/export-all', auth.requireAdmin, async (_req, res, next) => {
    try {
      const snapshot = await db.buildExportSnapshot();
      const filename = `mbp-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(snapshot, null, 2));
    } catch (e) { next(e); }
  });

  app.post('/api/admin/data/backup-content', auth.requireAdmin, async (_req, res, next) => {
    try {
      const snapshot = await db.buildExportSnapshot();
      await db.dbSet('backup_content', snapshot);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.post('/api/admin/data/restore-content-backup', auth.requireAdmin, async (_req, res, next) => {
    try {
      const backup = await db.dbGet('backup_content');
      if (!backup) throw new Error('No content backup found');
      await db.restoreSnapshot(backup);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.post('/api/admin/data/backup-all', auth.requireAdmin, async (_req, res, next) => {
    try {
      const snapshot = await db.buildExportSnapshot();
      await db.dbSet('backup_all', snapshot);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.post('/api/admin/data/restore-all-backup', auth.requireAdmin, async (_req, res, next) => {
    try {
      const backup = await db.dbGet('backup_all');
      if (!backup) throw new Error('No full backup found');
      await db.restoreSnapshot(backup);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.post('/api/admin/data/pull', auth.requireAdmin, async (_req, res, next) => {
    try {
      await db.syncContent();
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.post('/api/admin/data/init-empty-content', auth.requireAdmin, async (_req, res, next) => {
    try {
      await db.restoreSnapshot({
        home: { heroVideo: '', bandVideo: '', preloadVideo: '', featured: [], reviews: [] },
        store: { products: [] },
        gallery: { items: [] },
        settings: { deliveryFee: 0 },
        orders: [],
        orderStatus: {},
        processed: [],
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.put('/api/admin/home/hero-video', auth.requireAdmin, async (req, res, next) => {
    try {
      const home = await db.getHome();
      home.heroVideo = String(req.body?.heroVideo || req.body?.url || '').trim();
      await db.dbSet('home', home);
      await db.syncContent();
      res.json(home);
    } catch (e) { next(e); }
  });

  app.get('/api/admin/home/featured', auth.requireAdmin, async (_req, res, next) => {
    try {
      const home = await db.getHome();
      res.json({ featured: home.featured || [] });
    } catch (e) { next(e); }
  });

  app.post('/api/admin/home/featured', auth.requireAdmin, async (req, res, next) => {
    try {
      const home = await db.getHome();
      const item = {
        id: randomUUID(),
        category: 'featured',
        name: String(req.body?.name || ''),
        price: Number(req.body?.price || 0),
        image: String(req.body?.image || ''),
        imageBack: String(req.body?.imageBack || ''),
        desc: String(req.body?.desc || ''),
        sizes: db.normalizeSizes(req.body?.sizes),
      };
      home.featured = Array.isArray(home.featured) ? home.featured : [];
      home.featured.unshift(item);
      await db.dbSet('home', home);
      await db.syncContent();
      res.json(item);
    } catch (e) { next(e); }
  });

  app.put('/api/admin/home/featured/:id', auth.requireAdmin, async (req, res, next) => {
    try {
      const home = await db.getHome();
      const idx = (home.featured || []).findIndex((f) => f.id === req.params.id);
      if (idx < 0) return res.status(404).json({ error: 'Not found' });
      home.featured[idx] = {
        ...home.featured[idx],
        name: String(req.body?.name ?? home.featured[idx].name),
        price: Number(req.body?.price ?? home.featured[idx].price),
        image: String(req.body?.image ?? home.featured[idx].image),
        imageBack: String(req.body?.imageBack ?? home.featured[idx].imageBack ?? ''),
        desc: String(req.body?.desc ?? home.featured[idx].desc),
        sizes: db.normalizeSizes(req.body?.sizes ?? home.featured[idx].sizes),
      };
      await db.dbSet('home', home);
      await db.syncContent();
      res.json(home.featured[idx]);
    } catch (e) { next(e); }
  });

  app.delete('/api/admin/home/featured/:id', auth.requireAdmin, async (req, res, next) => {
    try {
      const home = await db.getHome();
      home.featured = (home.featured || []).filter((f) => f.id !== req.params.id);
      await db.dbSet('home', home);
      await db.syncContent();
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/home/reviews', auth.requireAdmin, async (_req, res, next) => {
    try {
      const home = await db.getHome();
      res.json({ reviews: home.reviews || [] });
    } catch (e) { next(e); }
  });

  app.post('/api/admin/home/reviews', auth.requireAdmin, async (req, res, next) => {
    try {
      const home = await db.getHome();
      const item = { id: randomUUID(), text: String(req.body?.text || ''), meta: String(req.body?.meta || '') };
      home.reviews = Array.isArray(home.reviews) ? home.reviews : [];
      home.reviews.unshift(item);
      await db.dbSet('home', home);
      await db.syncContent();
      res.json(item);
    } catch (e) { next(e); }
  });

  app.put('/api/admin/home/reviews/:id', auth.requireAdmin, async (req, res, next) => {
    try {
      const home = await db.getHome();
      const idx = (home.reviews || []).findIndex((r) => r.id === req.params.id);
      if (idx < 0) return res.status(404).json({ error: 'Not found' });
      home.reviews[idx] = {
        ...home.reviews[idx],
        text: String(req.body?.text ?? home.reviews[idx].text),
        meta: String(req.body?.meta ?? home.reviews[idx].meta),
      };
      await db.dbSet('home', home);
      await db.syncContent();
      res.json(home.reviews[idx]);
    } catch (e) { next(e); }
  });

  app.delete('/api/admin/home/reviews/:id', auth.requireAdmin, async (req, res, next) => {
    try {
      const home = await db.getHome();
      home.reviews = (home.reviews || []).filter((r) => r.id !== req.params.id);
      await db.dbSet('home', home);
      await db.syncContent();
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/store/products', auth.requireAdmin, async (_req, res, next) => {
    try {
      const store = await db.getStore();
      res.json({ products: store.products || [] });
    } catch (e) { next(e); }
  });

  app.post('/api/admin/store/products', auth.requireAdmin, async (req, res, next) => {
    try {
      const store = await db.getStore();
      const item = {
        id: randomUUID(),
        name: String(req.body?.name || ''),
        price: Number(req.body?.price || 0),
        salePrice: req.body?.salePrice != null && req.body.salePrice !== '' ? Number(req.body.salePrice) : null,
        image: String(req.body?.image || ''),
        imageBack: String(req.body?.imageBack || ''),
        images: Array.isArray(req.body?.images) ? req.body.images : [],
        desc: String(req.body?.desc || ''),
        sizes: db.normalizeSizes(req.body?.sizes),
        colors: Array.isArray(req.body?.colors)
          ? req.body.colors
          : String(req.body?.colors || '').split(',').map((s) => s.trim()).filter(Boolean),
        category: String(req.body?.category || 'lingerie'),
        soldOut: Boolean(req.body?.soldOut),
        badges: Array.isArray(req.body?.badges) ? req.body.badges : [],
        stock: req.body?.stock != null && req.body.stock !== '' ? Number(req.body.stock) : null,
        sku: String(req.body?.sku || ''),
        tags: Array.isArray(req.body?.tags)
          ? req.body.tags
          : String(req.body?.tags || '').split(',').map((s) => s.trim()).filter(Boolean),
        materials: String(req.body?.materials || ''),
        care: String(req.body?.care || ''),
        slug: String(req.body?.slug || ''),
        seoTitle: String(req.body?.seoTitle || ''),
        seoDescription: String(req.body?.seoDescription || ''),
      };
      store.products = Array.isArray(store.products) ? store.products : [];
      store.products.unshift(item);
      await db.dbSet('store', store);
      await db.syncContent();
      res.json(item);
    } catch (e) { next(e); }
  });

  app.put('/api/admin/store/products/:id', auth.requireAdmin, async (req, res, next) => {
    try {
      const store = await db.getStore();
      const idx = (store.products || []).findIndex((p) => p.id === req.params.id);
      if (idx < 0) return res.status(404).json({ error: 'Not found' });
      const prev = store.products[idx];
      store.products[idx] = {
        ...prev,
        name: String(req.body?.name ?? prev.name),
        price: Number(req.body?.price ?? prev.price),
        salePrice: req.body?.salePrice !== undefined
          ? (req.body.salePrice === '' || req.body.salePrice == null ? null : Number(req.body.salePrice))
          : prev.salePrice ?? null,
        image: String(req.body?.image ?? prev.image),
        imageBack: String(req.body?.imageBack ?? prev.imageBack ?? ''),
        images: req.body?.images !== undefined ? (Array.isArray(req.body.images) ? req.body.images : prev.images || []) : (prev.images || []),
        desc: String(req.body?.desc ?? prev.desc),
        sizes: db.normalizeSizes(req.body?.sizes ?? prev.sizes),
        colors: req.body?.colors !== undefined
          ? (Array.isArray(req.body.colors) ? req.body.colors : String(req.body.colors || '').split(',').map((s) => s.trim()).filter(Boolean))
          : (prev.colors || []),
        category: String(req.body?.category ?? prev.category),
        badges: req.body?.badges !== undefined ? (Array.isArray(req.body.badges) ? req.body.badges : prev.badges || []) : (prev.badges || []),
        stock: req.body?.stock !== undefined
          ? (req.body.stock === '' || req.body.stock == null ? null : Number(req.body.stock))
          : (prev.stock ?? null),
        sku: String(req.body?.sku ?? prev.sku ?? ''),
        tags: req.body?.tags !== undefined
          ? (Array.isArray(req.body.tags) ? req.body.tags : String(req.body.tags || '').split(',').map((s) => s.trim()).filter(Boolean))
          : (prev.tags || []),
        materials: String(req.body?.materials ?? prev.materials ?? ''),
        care: String(req.body?.care ?? prev.care ?? ''),
        slug: String(req.body?.slug ?? prev.slug ?? ''),
        seoTitle: String(req.body?.seoTitle ?? prev.seoTitle ?? ''),
        seoDescription: String(req.body?.seoDescription ?? prev.seoDescription ?? ''),
        soldOut: req.body?.soldOut !== undefined ? Boolean(req.body.soldOut) : Boolean(prev.soldOut),
      };
      await db.dbSet('store', store);
      await db.syncContent();
      res.json(store.products[idx]);
    } catch (e) { next(e); }
  });

  app.put('/api/admin/store/products/:id/soldout', auth.requireAdmin, async (req, res, next) => {
    try {
      const store = await db.getStore();
      const idx = (store.products || []).findIndex((p) => p.id === req.params.id);
      if (idx < 0) return res.status(404).json({ error: 'Not found' });
      store.products[idx].soldOut = Boolean(req.body?.soldOut);
      await db.dbSet('store', store);
      await db.syncContent();
      res.json(store.products[idx]);
    } catch (e) { next(e); }
  });

  app.delete('/api/admin/store/products/:id', auth.requireAdmin, async (req, res, next) => {
    try {
      const store = await db.getStore();
      store.products = (store.products || []).filter((p) => p.id !== req.params.id);
      await db.dbSet('store', store);
      await db.syncContent();
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/gallery/items', auth.requireAdmin, async (_req, res, next) => {
    try {
      const gallery = await db.getGallery();
      res.json({ items: gallery.items || [] });
    } catch (e) { next(e); }
  });

  app.post('/api/admin/gallery/items', auth.requireAdmin, async (req, res, next) => {
    try {
      const gallery = await db.getGallery();
      const item = {
        id: randomUUID(),
        type: String(req.body?.type || 'image'),
        src: String(req.body?.src || ''),
        caption: String(req.body?.caption || ''),
      };
      gallery.items = Array.isArray(gallery.items) ? gallery.items : [];
      gallery.items.unshift(item);
      await db.dbSet('gallery', gallery);
      await db.syncContent();
      res.json(item);
    } catch (e) { next(e); }
  });

  app.put('/api/admin/gallery/items/:id', auth.requireAdmin, async (req, res, next) => {
    try {
      const gallery = await db.getGallery();
      const idx = (gallery.items || []).findIndex((g) => g.id === req.params.id);
      if (idx < 0) return res.status(404).json({ error: 'Not found' });
      gallery.items[idx] = {
        ...gallery.items[idx],
        type: String(req.body?.type ?? gallery.items[idx].type),
        src: String(req.body?.src ?? gallery.items[idx].src),
        caption: String(req.body?.caption ?? gallery.items[idx].caption),
      };
      await db.dbSet('gallery', gallery);
      await db.syncContent();
      res.json(gallery.items[idx]);
    } catch (e) { next(e); }
  });

  app.delete('/api/admin/gallery/items/:id', auth.requireAdmin, async (req, res, next) => {
    try {
      const gallery = await db.getGallery();
      gallery.items = (gallery.items || []).filter((g) => g.id !== req.params.id);
      await db.dbSet('gallery', gallery);
      await db.syncContent();
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/orders', auth.requireAdmin, async (_req, res, next) => {
    try {
      const orders = await db.getOrders();
      res.json({ orders });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/orders/:ref', auth.requireAdmin, async (req, res, next) => {
    try {
      const orders = await db.getOrders();
      const order = orders.find((o) => o.reference === req.params.ref);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      const processed = await db.getProcessed();
      if (!processed.includes(order.reference)) {
        processed.push(order.reference);
        await db.dbSet('processed', processed);
      }
      res.json({ order });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/delivery-fee', auth.requireAdmin, async (_req, res, next) => {
    try {
      const settings = await db.getSettings();
      res.json({ deliveryFee: Number(settings?.deliveryFee || 0) });
    } catch (e) { next(e); }
  });

  app.put('/api/admin/delivery-fee', auth.requireAdmin, async (req, res, next) => {
    try {
      const settings = await db.getSettings();
      settings.deliveryFee = Number(req.body?.deliveryFee || 0);
      await db.dbSet('settings', settings);
      res.json({ deliveryFee: settings.deliveryFee });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/settings', auth.requireAdmin, async (_req, res, next) => {
    try {
      res.json(await db.getSettings());
    } catch (e) { next(e); }
  });

  app.put('/api/admin/settings', auth.requireAdmin, async (req, res, next) => {
    try {
      const current = await db.getSettings();
      const nextSettings = {
        ...current,
        ...(req.body || {}),
        deliveryFee: Number(req.body?.deliveryFee ?? current.deliveryFee ?? 0),
      };
      await db.dbSet('settings', nextSettings);
      res.json(nextSettings);
    } catch (e) { next(e); }
  });

  app.put('/api/admin/orders/:ref/status', auth.requireAdmin, async (req, res, next) => {
    try {
      const ref = String(req.params.ref || '');
      const status = String(req.body?.status || 'pending');
      const notes = req.body?.adminNotes != null ? String(req.body.adminNotes) : undefined;
      const orders = await db.getOrders();
      const idx = orders.findIndex((o) => o.reference === ref);
      if (idx < 0) return res.status(404).json({ error: 'Order not found' });
      orders[idx] = {
        ...orders[idx],
        status,
        ...(notes !== undefined ? { adminNotes: notes } : {}),
        statusUpdatedAt: new Date().toISOString(),
      };
      await db.dbSet('orders', orders);
      const orderStatus = await db.getOrderStatus();
      orderStatus[ref] = status;
      await db.dbSet('orderStatus', orderStatus);
      res.json(orders[idx]);
    } catch (e) { next(e); }
  });

  app.get('/api/admin/analytics/summary', auth.requireAdmin, async (_req, res, next) => {
    try {
      const orders = await db.getOrders();
      const events = (await db.dbGet('analytics_events')) || [];
      const eventList = Array.isArray(events) ? events : [];
      const revenue = orders.reduce((s, o) => s + Number(o?.totals?.total || 0), 0);
      const today = new Date().toISOString().slice(0, 10);
      const todaysOrders = orders.filter((o) => String(o.createdAt || '').startsWith(today));
      const whatsappClicks = eventList.filter((e) => e.type === 'whatsapp_click').length;
      const productViews = eventList.filter((e) => e.type === 'product_view').length;
      const pageViews = eventList.filter((e) => e.type === 'page_view').length;
      const todayPageViews = eventList.filter((e) => e.type === 'page_view' && String(e.at || '').startsWith(today)).length;
      const live = await readLivePresence();
      const store = await db.getStore();
      const products = store.products || [];
      const lowStock = products.filter((p) => !p.soldOut && p.stock != null && Number(p.stock) > 0 && Number(p.stock) <= 3);
      const outOfStock = products.filter((p) => p.soldOut || Number(p.stock) === 0);
      res.json({
        totalRevenue: revenue,
        todayRevenue: todaysOrders.reduce((s, o) => s + Number(o?.totals?.total || 0), 0),
        totalOrders: orders.length,
        todayOrders: todaysOrders.length,
        averageOrderValue: orders.length ? revenue / orders.length : 0,
        productCount: products.length,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        whatsappClicks,
        productViews,
        pageViews,
        todayPageViews,
        liveViewers: live.liveViewers,
        livePaths: live.livePaths,
        eventCount: eventList.length,
        recentEvents: eventList.slice(0, 40),
        ordersOverTime: summarizeByDay(orders.map((o) => ({ at: o.createdAt, value: Number(o?.totals?.total || 0) }))),
        whatsappByDay: summarizeByDay(eventList.filter((e) => e.type === 'whatsapp_click').map((e) => ({ at: e.at, value: 1 }))),
      });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/promotions', auth.requireAdmin, async (_req, res, next) => {
    try {
      res.json({ promotions: (await db.dbGet('promotions')) || [] });
    } catch (e) { next(e); }
  });

  app.post('/api/admin/promotions', auth.requireAdmin, async (req, res, next) => {
    try {
      const list = (await db.dbGet('promotions')) || [];
      const promo = {
        id: randomUUID(),
        code: String(req.body?.code || '').trim().toUpperCase(),
        type: String(req.body?.type || 'percent'),
        value: Number(req.body?.value || 0),
        active: req.body?.active !== false,
        startsAt: req.body?.startsAt || null,
        endsAt: req.body?.endsAt || null,
        usageLimit: req.body?.usageLimit != null ? Number(req.body.usageLimit) : null,
        minOrder: Number(req.body?.minOrder || 0),
        createdAt: new Date().toISOString(),
      };
      list.unshift(promo);
      await db.dbSet('promotions', list);
      res.json(promo);
    } catch (e) { next(e); }
  });

  app.delete('/api/admin/promotions/:id', auth.requireAdmin, async (req, res, next) => {
    try {
      const list = ((await db.dbGet('promotions')) || []).filter((p) => p.id !== req.params.id);
      await db.dbSet('promotions', list);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/categories', auth.requireAdmin, async (_req, res, next) => {
    try {
      const cats = (await db.dbGet('categories')) || [
        { id: 'lingerie', slug: 'lingerie', name: 'Lingerie' },
        { id: 'underwear', slug: 'underwear', name: 'Underwear' },
        { id: 'nightwear', slug: 'nightwear', name: 'Nightwear' },
        { id: 'pyjamas', slug: 'pyjamas', name: 'Pyjamas' },
      ];
      res.json({ categories: cats });
    } catch (e) { next(e); }
  });

  app.put('/api/admin/categories', auth.requireAdmin, async (req, res, next) => {
    try {
      const categories = Array.isArray(req.body?.categories) ? req.body.categories : [];
      await db.dbSet('categories', categories);
      res.json({ categories });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/collections', auth.requireAdmin, async (_req, res, next) => {
    try {
      res.json({ collections: (await db.dbGet('collections')) || [] });
    } catch (e) { next(e); }
  });

  app.put('/api/admin/collections', auth.requireAdmin, async (req, res, next) => {
    try {
      const collections = Array.isArray(req.body?.collections) ? req.body.collections : [];
      await db.dbSet('collections', collections);
      res.json({ collections });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/abandoned-carts', auth.requireAdmin, async (_req, res, next) => {
    try {
      res.json({ carts: (await db.dbGet('abandoned_carts')) || [] });
    } catch (e) { next(e); }
  });

  app.get('/api/admin/newsletter', auth.requireAdmin, async (_req, res, next) => {
    try {
      res.json({ subscribers: (await db.dbGet('newsletter_subscribers')) || [] });
    } catch (e) { next(e); }
  });

  app.get('/api/assistant', async (req, res, next) => {
    try {
      const q = String(req.query.q || req.body?.q || '').toLowerCase().trim();
      const store = await db.getStore();
      const products = store.products || [];
      const faqs = (await db.dbGet('faqs')) || [
        { q: 'delivery', a: 'We deliver across Lagos with zone-based fees shown at checkout. WhatsApp us for other cities.' },
        { q: 'size', a: 'Use our Size Guide or WhatsApp 08087504905 for a personal fit consult. We never invent stock.' },
        { q: 'returns', a: 'Intimate products have limited returns for hygiene. Contact us within 48 hours if damaged or incorrect.' },
        { q: 'payment', a: 'Pay securely with Paystack on the site, or order via WhatsApp.' },
      ];
      if (!q) {
        return res.json({
          reply: 'Hi, I am the MBP shopping assistant. Ask about products, sizes, delivery, or WhatsApp ordering.',
          products: [],
        });
      }
      const matchedFaq = faqs.find((f) => q.includes(String(f.q).toLowerCase()) || String(f.a).toLowerCase().includes(q));
      const hits = products
        .filter((p) => {
          const hay = `${p.name} ${p.desc} ${p.category}`.toLowerCase();
          return q.split(/\s+/).some((w) => w.length > 2 && hay.includes(w));
        })
        .slice(0, 5)
        .map((p) => ({ id: p.id, name: p.name, price: p.price, image: p.image, soldOut: p.soldOut }));
      let reply = matchedFaq?.a || '';
      if (hits.length) {
        reply = (reply ? `${reply} ` : '') + `I found ${hits.length} matching piece(s) in the catalog. Tap a product for details — prices shown are from live inventory.`;
      } else if (!reply) {
        reply = 'I am not sure about that. For accurate stock, sizing, or custom requests, please message WhatsApp on 08087504905.';
      }
      res.json({ reply, products: hits, whatsapp: '2348087504905' });
    } catch (e) { next(e); }
  });

  function summarizeByDay(rows) {
    const map = new Map();
    for (const r of rows) {
      const day = String(r.at || '').slice(0, 10);
      if (!day) continue;
      map.set(day, (map.get(day) || 0) + Number(r.value || 0));
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, value]) => ({ date, value }));
  }

  app.post('/api/admin/upload', auth.requireAdmin, upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const key = String(req.query.key || `upload-${Date.now()}`);
      const out = await storage.uploadBuffer(req.file.buffer, {
        key: `mbp/${key}`,
        mime: req.file.mimetype,
      });
      res.json(out);
    } catch (e) { next(e); }
  });

  app.post('/api/paystack/initialize', async (req, res, next) => {
    try {
      const out = await paystack.initializePayment(req.body || {});
      res.json(out);
    } catch (e) { next(e); }
  });

  app.get('/api/paystack/verify', async (req, res, next) => {
    try {
      const reference = String(req.query.reference || '');
      let savedOrder = null;

      const out = await paystack.verifyPayment(reference, {
        async saveOrder(order, ref) {
          const orders = await db.getOrders();
          const existing = orders.find((o) => o.reference === ref);
          if (existing) {
            savedOrder = existing;
            return;
          }
          orders.unshift(order);
          await db.dbSet('orders', orders);
          savedOrder = order;
          const processed = await db.getProcessed();
          if (!processed.includes(ref)) {
            processed.push(ref);
            await db.dbSet('processed', processed);
          }
        },
      });

      if (out.status === 'success' && savedOrder) {
        try {
          const emailResult = await email.sendOrderEmails(savedOrder);
          out.emails = emailResult;
        } catch (mailErr) {
          console.error('Order email failed:', mailErr);
          out.emails = { ok: false, error: mailErr.message || 'Email failed' };
        }
      }

      res.json(out);
    } catch (e) { next(e); }
  });

  app.post('/api/admin/data/restore-all', auth.requireAdmin, async (req, res, next) => {
    try {
      await db.restoreSnapshot(req.body || {});
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  });

  return app;
}

module.exports = { createApp };
