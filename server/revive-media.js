const fs = require('fs');
const path = require('path');

const DEAD_STORAGE = /xyuqcztzktqladitoell\.supabase\.co\/storage/i;
const LIVE_STORAGE = /xfyvvbtrxykpywpgicdi\.supabase\.co\/storage/i;
const CLOUDINARY = 'https://res.cloudinary.com/dw4fuxc5l';

let archive = null;

function getArchive() {
  if (!archive) {
    try {
      archive = JSON.parse(fs.readFileSync(path.join(__dirname, 'image-archive.json'), 'utf8'));
    } catch {
      archive = {};
    }
  }
  return archive;
}

function isDeadStorage(src) {
  return DEAD_STORAGE.test(String(src || ''));
}

function isLiveStorage(src) {
  const value = String(src || '');
  if (LIVE_STORAGE.test(value)) return true;
  return /supabase\.co\/storage/i.test(value) && !isDeadStorage(value);
}

function fileNameOf(src) {
  try {
    return decodeURIComponent(new URL(src).pathname.split('/').pop() || '');
  } catch {
    const clean = String(src || '').split('?')[0];
    return clean.split('/').pop() || '';
  }
}

function rewriteDeadStorage(src) {
  const value = String(src || '').trim();
  if (!value) return '';
  if (isLiveStorage(value)) return value;
  if (!isDeadStorage(value)) return value;
  const file = fileNameOf(value);
  if (!file) return '';
  const migrated = /\/migrated\//i.test(value);
  const known = /^(store-new-|featured-|home-)/i.test(file);
  if (!migrated && !known) return '';
  const kind = /\.(mp4|mov|webm)$/i.test(file) ? 'video' : 'image';
  return `${CLOUDINARY}/${kind}/upload/mbp/${file}`;
}

function reviveSrc(current, archived) {
  if (archived && isLiveStorage(archived)) return archived;
  if (current && isLiveStorage(current)) return current;
  const fromCurrent = rewriteDeadStorage(current);
  if (fromCurrent && isLiveStorage(fromCurrent)) return fromCurrent;
  if (archived) {
    const fromArchive = rewriteDeadStorage(archived);
    if (fromArchive && isLiveStorage(fromArchive)) return fromArchive;
    if (fromArchive && !isDeadStorage(fromArchive)) return fromArchive;
  }
  if (fromCurrent && !isDeadStorage(fromCurrent)) return fromCurrent;
  return '';
}

function reviveProduct(product) {
  if (!product || !product.id) return product;
  const hit = getArchive()[product.id] || {};
  const next = { ...product };
  next.image = reviveSrc(product.image, hit.image);
  next.imageBack = reviveSrc(product.imageBack, hit.imageBack);
  const currentImages = Array.isArray(product.images) ? product.images : [];
  const archivedImages = Array.isArray(hit.images) ? hit.images : [];
  const revivedImages = currentImages.map((src, i) => reviveSrc(src, archivedImages[i])).filter(Boolean);
  next.images = revivedImages.length
    ? revivedImages
    : archivedImages.map((src) => reviveSrc(src)).filter(Boolean);
  return next;
}

function reviveStore(store) {
  const products = Array.isArray(store?.products) ? store.products.map(reviveProduct) : [];
  return { ...(store || {}), products };
}

function reviveHome(home) {
  const featured = Array.isArray(home?.featured) ? home.featured.map(reviveProduct) : [];
  return {
    ...(home || {}),
    featured,
    heroVideo: reviveSrc(home?.heroVideo),
    bandVideo: reviveSrc(home?.bandVideo),
    preloadVideo: reviveSrc(home?.preloadVideo),
  };
}

function reviveGallery(gallery) {
  const items = Array.isArray(gallery?.items)
    ? gallery.items.map((item) => ({ ...item, src: reviveSrc(item?.src) }))
    : [];
  return { ...(gallery || {}), items };
}

module.exports = {
  reviveProduct,
  reviveStore,
  reviveHome,
  reviveGallery,
  reviveSrc,
  isDeadStorage,
  isLiveStorage,
  rewriteDeadStorage,
};
