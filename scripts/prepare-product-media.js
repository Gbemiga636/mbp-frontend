// Build a product-id → Cloudinary URL archive from the July backup.
// Does not change product records. The API/client swap dead Storage URLs at read time.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BACKUP = path.join(ROOT, 'mbp-backup-2026-07-09T12-19-54-300Z.json');
const ARCHIVE = path.join(ROOT, 'server', 'image-archive.json');

const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));

function keep(url) {
  const value = String(url || '').trim();
  if (/^https?:\/\//i.test(value) && !/supabase\.co\/storage/i.test(value)) return value;
  return '';
}

const archive = {};

function add(id, product) {
  if (!id) return;
  const image = keep(product.image);
  const imageBack = keep(product.imageBack);
  const images = (product.images || []).map(keep).filter(Boolean);
  if (image || imageBack || images.length) {
    archive[id] = { image, imageBack, images };
  }
}

for (const p of backup.store?.products || []) add(p.id, p);
for (const p of backup.home?.featured || []) add(p.id, p);

fs.writeFileSync(ARCHIVE, JSON.stringify(archive));
console.log('archived ids', Object.keys(archive).length);
