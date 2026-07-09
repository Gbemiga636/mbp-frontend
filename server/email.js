const templates = require('./email-templates');
const db = require('./db');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'MBP Lingerie <onboarding@resend.dev>';
const ADMIN_ORDER_EMAIL = process.env.ADMIN_ORDER_EMAIL || process.env.ADMIN_EMAIL || 'mbplingerie@gmail.com';

function isConfigured() {
  return Boolean(RESEND_API_KEY && RESEND_FROM);
}

async function resendSend({ to, subject, html }) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Resend error (${res.status})`);
  }
  return data;
}

async function wasEmailed(reference) {
  const list = await db.dbGet('emailed_orders');
  return Array.isArray(list) && list.includes(reference);
}

async function markEmailed(reference) {
  const list = Array.isArray(await db.dbGet('emailed_orders')) ? await db.dbGet('emailed_orders') : [];
  if (!list.includes(reference)) {
    list.push(reference);
    await db.dbSet('emailed_orders', list);
  }
}

async function enrichOrderItems(order) {
  const store = await db.getStore();
  const products = Array.isArray(store?.products) ? store.products : [];
  const byId = new Map(products.map((p) => [p.id, p]));

  const items = Array.isArray(order?.totals?.items) ? order.totals.items : [];
  const enriched = items.map((item) => {
    const product = byId.get(item?.id);
    return {
      ...item,
      image: item?.image || product?.image || '',
      name: item?.name || product?.name || 'Item',
      price: Number(item?.price ?? product?.price ?? 0),
    };
  });

  return {
    ...order,
    totals: {
      ...(order.totals || {}),
      items: enriched,
      subtotal: Number(order?.totals?.subtotal || 0),
      total: Number(order?.totals?.total || 0),
    },
  };
}

async function sendOrderEmails(order) {
  const reference = String(order?.reference || '').trim();
  if (!reference) return { skipped: true, reason: 'missing-reference' };
  if (await wasEmailed(reference)) return { skipped: true, reason: 'already-sent' };
  if (!isConfigured()) return { skipped: true, reason: 'resend-not-configured' };

  const customerEmail = String(order?.customer?.email || '').trim();
  if (!customerEmail) return { skipped: true, reason: 'missing-customer-email' };

  const fullOrder = await enrichOrderItems(order);
  const customerMail = templates.buildCustomerOrderEmail(fullOrder);
  const adminMail = templates.buildAdminOrderEmail(fullOrder);

  await resendSend({
    to: customerEmail,
    subject: customerMail.subject,
    html: customerMail.html,
  });

  await resendSend({
    to: ADMIN_ORDER_EMAIL,
    subject: adminMail.subject,
    html: adminMail.html,
  });

  await markEmailed(reference);
  return { ok: true, reference };
}

module.exports = {
  isConfigured,
  sendOrderEmails,
  wasEmailed,
};
