const crypto = require('crypto');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const PUBLIC_SITE_URL = String(process.env.PUBLIC_SITE_URL || process.env.FRONTEND_ORIGIN || '').replace(/\/$/, '');
const PAYSTACK_CALLBACK_URL = String(process.env.PAYSTACK_CALLBACK_URL || '').replace(/\/$/, '');

async function paystackFetch(path, options = {}) {
  if (!PAYSTACK_SECRET) throw new Error('Paystack is not configured on the server');
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Paystack error (${res.status})`);
  }
  return data;
}

function computeTotals(items) {
  const lines = Array.isArray(items) ? items : [];
  let subtotal = 0;
  for (const it of lines) {
    const price = Number(it?.price || 0);
    const qty = Number(it?.qty || 1);
    subtotal += price * qty;
  }
  return { subtotal, delivery: 0, total: subtotal, items: lines };
}

async function initializePayment({ customer, notes, items, deliveryZone, deliveryFee }) {
  const totals = computeTotals(items);
  const reference = `mbp_${crypto.randomBytes(8).toString('hex')}`;
  const callbackUrl = PAYSTACK_CALLBACK_URL || (PUBLIC_SITE_URL ? `${PUBLIC_SITE_URL}/cart.html` : undefined);

  const init = await paystackFetch('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: customer?.email,
      amount: Math.round(totals.total * 100),
      reference,
      callback_url: callbackUrl,
      metadata: {
        customer,
        notes,
        items,
        deliveryZone,
        deliveryFee,
      },
    }),
  });

  return {
    reference,
    authorizationUrl: init?.data?.authorization_url,
    authorization_url: init?.data?.authorization_url,
    accessCode: init?.data?.access_code,
  };
}

async function verifyPayment(reference, { saveOrder } = {}) {
  const data = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
  const tx = data?.data;
  const ok = tx?.status === 'success';

  if (ok && typeof saveOrder === 'function') {
    const meta = tx?.metadata || {};
    const items = Array.isArray(meta.items) ? meta.items : [];
    const totals = computeTotals(items);
    const order = {
      reference,
      customer: meta.customer || { email: tx?.customer?.email || '' },
      notes: meta.notes || '',
      totals,
      paystack: { id: tx.id, paidAt: tx.paid_at || tx.paidAt || new Date().toISOString() },
      createdAt: new Date().toISOString(),
    };
    await saveOrder(order, reference);
  }

  return { status: ok ? 'success' : 'failed', data: tx };
}

module.exports = { initializePayment, verifyPayment, computeTotals };
