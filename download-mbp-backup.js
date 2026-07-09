// Read-only full-site backup for MBP Lingerie.
// Usage:
//   node download-mbp-backup.js
//   node download-mbp-backup.js --with-media
//
// This script only READS from the database and public API. It does not modify
// anything on the live site.

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const mysql = require('mysql2/promise');

const API_BASE = (process.env.MBP_API_BASE || 'https://mbp-backend-pqvs.onrender.com').replace(/\/$/, '');
const MYSQL_URL = process.env.MYSQL_URL || 'mysql://root:rQWvQwCwoaWsZWwbUCFYwDvajANtNvCT@shortline.proxy.rlwy.net:27704/railway';
const MYSQL_TABLE = 'mbp_kv';
const WITH_MEDIA = process.argv.includes('--with-media');

function parseJsonSafe(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function fetchJson(url, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Invalid JSON from ${url}: ${e.message}`));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error(`Timeout fetching ${url}`)));
    req.on('error', reject);
  });
}

async function loadFromMysql() {
  const pool = await mysql.createPool(MYSQL_URL);
  try {
    const [rows] = await pool.query(`SELECT k, v FROM ${MYSQL_TABLE}`);
    const map = new Map();
    for (const row of rows) {
      map.set(String(row.k || ''), parseJsonSafe(row.v));
    }
    return map;
  } finally {
    await pool.end();
  }
}

function buildSnapshot(kv) {
  const content = kv.get('content') && typeof kv.get('content') === 'object' ? kv.get('content') : {};
  const home = kv.get('home') || content.home || {};
  const store = kv.get('store') || content.store || {};
  const gallery = kv.get('gallery') || content.gallery || {};
  const settings = kv.get('settings') || {};
  const orders = Array.isArray(kv.get('orders')) ? kv.get('orders') : [];
  const orderStatus = kv.get('orderStatus') && typeof kv.get('orderStatus') === 'object' ? kv.get('orderStatus') : {};
  const processed = Array.isArray(kv.get('processed')) ? kv.get('processed') : [];

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    source: {
      mysql: { configured: true, table: MYSQL_TABLE },
      cloudinary: { configured: true, syncEnabled: true },
      method: 'read-only-mysql-export',
    },
    home,
    store,
    gallery,
    content: { home, store, gallery },
    settings,
    orders,
    orderStatus,
    processed,
    rawKeys: [...kv.keys()].sort(),
  };
}

async function enrichFromApi(snapshot) {
  const endpoints = [
    ['home', `${API_BASE}/api/content/home`],
    ['store', `${API_BASE}/api/content/store`],
    ['gallery', `${API_BASE}/api/content/gallery`],
    ['config', `${API_BASE}/api/config`],
  ];

  const apiData = {};
  for (const [name, url] of endpoints) {
    try {
      apiData[name] = await fetchJson(url);
      console.log(`  API ${name}: OK`);
    } catch (e) {
      console.warn(`  API ${name}: skipped (${e.message})`);
    }
  }

  snapshot.apiSnapshot = {
    fetchedAt: new Date().toISOString(),
    ...apiData,
  };

  return snapshot;
}

function collectMediaUrls(value, urls = new Set()) {
  if (value == null) return urls;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value) && /\.(jpg|jpeg|png|gif|webp|mov|mp4|webm)(\?|$)/i.test(value)) {
      urls.add(value);
    }
    if (/^https?:\/\/res\.cloudinary\.com\//i.test(value)) {
      urls.add(value);
    }
    return urls;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMediaUrls(item, urls);
    return urls;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value)) collectMediaUrls(v, urls);
  }
  return urls;
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { timeout: 120000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(destPath)));
      file.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function safeFilenameFromUrl(url, index) {
  try {
    const u = new URL(url);
    const base = path.basename(u.pathname).replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${String(index).padStart(4, '0')}-${base || 'asset'}`;
  } catch {
    return `${String(index).padStart(4, '0')}-asset`;
  }
}

async function downloadMedia(snapshot, mediaDir) {
  const urls = [...collectMediaUrls(snapshot)].sort();
  fs.mkdirSync(mediaDir, { recursive: true });
  const manifest = [];

  console.log(`\nDownloading ${urls.length} media files...`);
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const filename = safeFilenameFromUrl(url, i + 1);
    const dest = path.join(mediaDir, filename);
    process.stdout.write(`  [${i + 1}/${urls.length}] ${filename} ... `);
    try {
      await downloadFile(url, dest);
      manifest.push({ url, file: filename, status: 'ok' });
      ok++;
      console.log('OK');
    } catch (e) {
      manifest.push({ url, file: filename, status: 'failed', error: e.message });
      fail++;
      console.log(`FAILED (${e.message})`);
    }
  }

  fs.writeFileSync(path.join(mediaDir, 'media-manifest.json'), JSON.stringify(manifest, null, 2));
  return { total: urls.length, ok, fail };
}

function printSummary(snapshot) {
  const products = Array.isArray(snapshot.store?.products) ? snapshot.store.products.length : 0;
  const galleryItems = Array.isArray(snapshot.gallery?.items) ? snapshot.gallery.items.length : 0;
  const featured = Array.isArray(snapshot.home?.featured) ? snapshot.home.featured.length : 0;
  const reviews = Array.isArray(snapshot.home?.reviews) ? snapshot.home.reviews.length : 0;
  const orders = Array.isArray(snapshot.orders) ? snapshot.orders.length : 0;
  const rawKeys = Array.isArray(snapshot.rawKeys) ? snapshot.rawKeys.length : 0;

  console.log('\nBackup summary:');
  console.log(`  Store products:  ${products}`);
  console.log(`  Gallery items:   ${galleryItems}`);
  console.log(`  Featured pieces: ${featured}`);
  console.log(`  Reviews:         ${reviews}`);
  console.log(`  Orders:          ${orders}`);
  console.log(`  DB keys:         ${rawKeys}`);
}

async function main() {
  console.log('MBP Lingerie — read-only full backup\n');

  console.log('1) Reading live database (SELECT only)...');
  const kv = await loadFromMysql();
  console.log(`  Loaded ${kv.size} keys from ${MYSQL_TABLE}`);

  let snapshot = buildSnapshot(kv);

  console.log('\n2) Fetching public API snapshots for cross-check...');
  snapshot = await enrichFromApi(snapshot);

  const outName = `mbp-backup-${timestamp()}.json`;
  const outPath = path.join(process.cwd(), outName);
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(`\n3) Saved JSON backup: ${outPath}`);
  printSummary(snapshot);

  if (WITH_MEDIA) {
    const mediaDir = path.join(process.cwd(), `mbp-backup-media-${timestamp()}`);
    const mediaStats = await downloadMedia(snapshot, mediaDir);
    console.log(`\nMedia folder: ${mediaDir}`);
    console.log(`  Downloaded: ${mediaStats.ok}/${mediaStats.total} (${mediaStats.fail} failed)`);
  } else {
    console.log('\nTip: run with --with-media to also download all product images/videos locally.');
  }

  console.log('\nDone. The live site was not modified.');
}

main().catch((e) => {
  console.error('\nBackup failed:', e.message || e);
  process.exit(1);
});
