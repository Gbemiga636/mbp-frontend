function listPromos(raw) {
  return Array.isArray(raw) ? raw : [];
}

function isLive(promo, now = Date.now()) {
  if (!promo || promo.active === false) return false;
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return false;
  if (promo.endsAt && new Date(promo.endsAt).getTime() < now) return false;
  if (promo.usageLimit != null && Number(promo.usedCount || 0) >= Number(promo.usageLimit)) return false;
  return true;
}

function applyToOf(promo) {
  if (promo?.applyTo === 'store' || promo?.applyTo === 'code') return promo.applyTo;
  return String(promo?.code || '').trim() ? 'code' : 'store';
}

function promoLabel(promo) {
  if (promo?.label) return String(promo.label);
  if (promo?.type === 'percent') return `-${Number(promo.value || 0)}% promo`;
  return 'Promo';
}

function publicPromo(promo) {
  if (!promo) return null;
  return {
    id: promo.id,
    type: promo.type === 'fixed' ? 'fixed' : 'percent',
    value: Number(promo.value || 0),
    applyTo: applyToOf(promo),
    code: String(promo.code || ''),
    label: promoLabel(promo),
  };
}

function activeStorePromo(list) {
  return listPromos(list).find((p) => isLive(p) && applyToOf(p) === 'store') || null;
}

function findCoupon(list, code) {
  const needle = String(code || '').trim().toUpperCase();
  if (!needle) return null;
  return listPromos(list).find(
    (p) => isLive(p) && applyToOf(p) === 'code' && String(p.code || '').trim().toUpperCase() === needle
  ) || null;
}

function unitPrice(product, storePromo) {
  const list = Number(product?.price || 0);
  const sale = product?.salePrice != null ? Number(product.salePrice) : 0;
  let current = sale > 0 && sale < list ? sale : list;
  if (!storePromo) return Math.max(0, Math.round(current));
  const value = Number(storePromo.value || 0);
  if (storePromo.type === 'percent' && value > 0) {
    current = Math.round(current * (1 - value / 100));
  } else if (storePromo.type === 'fixed' && value > 0) {
    current = Math.max(0, current - value);
  }
  return Math.max(0, Math.round(current));
}

function attachStorePromo(products, promo) {
  const pub = publicPromo(promo);
  if (!pub || pub.applyTo !== 'store' || !pub.value) return products || [];
  return (products || []).map((p) => ({
    ...p,
    storePromo: { type: pub.type, value: pub.value, label: pub.label },
  }));
}

function couponDiscount(subtotal, coupon) {
  const total = Math.max(0, Number(subtotal || 0));
  if (!coupon) return { discount: 0, total };
  if (Number(coupon.minOrder || 0) > 0 && total < Number(coupon.minOrder)) {
    return { discount: 0, total, error: 'Order is below this code’s minimum' };
  }
  let discount = coupon.type === 'percent'
    ? Math.round(total * Number(coupon.value || 0) / 100)
    : Math.round(Number(coupon.value || 0));
  discount = Math.min(Math.max(0, discount), total);
  return { discount, total: total - discount };
}

module.exports = {
  listPromos,
  isLive,
  applyToOf,
  promoLabel,
  publicPromo,
  activeStorePromo,
  findCoupon,
  unitPrice,
  attachStorePromo,
  couponDiscount,
};
