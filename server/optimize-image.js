let sharp = null;
try {
  sharp = require('sharp');
} catch {
  sharp = null;
}

const MAX_EDGE = 800;
const WEBP_QUALITY = 62;

async function optimizeImage(buffer, mime = '') {
  const input = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (!input.length) throw new Error('Empty image');
  if (!sharp) return { buffer: input, mime: mime || 'application/octet-stream', ext: '' };

  const out = await sharp(input, { failOn: 'none' })
    .rotate()
    .resize(MAX_EDGE, Math.round(MAX_EDGE * 1.25), {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
    .toBuffer();

  return { buffer: out, mime: 'image/webp', ext: '.webp' };
}

function isImageMime(mime, name = '') {
  const blob = `${mime} ${name}`.toLowerCase();
  return /image\/|(\.jpe?g|\.png|\.webp|\.gif)(\?|$)/i.test(blob);
}

module.exports = { optimizeImage, isImageMime, MAX_EDGE, WEBP_QUALITY };
