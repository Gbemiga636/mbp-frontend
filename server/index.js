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
    'http://127.0.0.1:8888',
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
      res.json({ deliveryFee: Number(settings?.deliveryFee || 0) });
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
        home: { heroVideo: '', featured: [], reviews: [] },
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
        image: String(req.body?.image || ''),
        imageBack: String(req.body?.imageBack || ''),
        desc: String(req.body?.desc || ''),
        sizes: db.normalizeSizes(req.body?.sizes),
        category: String(req.body?.category || 'lingerie'),
        soldOut: false,
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
      store.products[idx] = {
        ...store.products[idx],
        name: String(req.body?.name ?? store.products[idx].name),
        price: Number(req.body?.price ?? store.products[idx].price),
        image: String(req.body?.image ?? store.products[idx].image),
        imageBack: String(req.body?.imageBack ?? store.products[idx].imageBack ?? ''),
        desc: String(req.body?.desc ?? store.products[idx].desc),
        sizes: db.normalizeSizes(req.body?.sizes ?? store.products[idx].sizes),
        category: String(req.body?.category ?? store.products[idx].category),
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
