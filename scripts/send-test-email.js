// Send a one-off test order email via Resend.
// Usage: node scripts/send-test-email.js gboisholaja@gmail.com

require('dotenv').config();
const templates = require('../server/email-templates');

const to = process.argv[2] || 'gboisholaja@gmail.com';
const key = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL || 'MBP Lingerie <onboarding@resend.dev>';

const sampleOrder = {
  reference: 'mbp_test_' + Date.now().toString(36),
  createdAt: new Date().toISOString(),
  customer: {
    email: to,
    phone: '08012345678',
    address: '12 Admiralty Way, Lekki Phase 1, Lagos',
  },
  notes: 'Test order from MBP migration.\nDelivery area: LAGOS ISLAND (₦2500)',
  totals: {
    items: [
      {
        id: 'test-1',
        name: "Victoria's Secret Crossback slipdress",
        size: 'M',
        qty: 1,
        price: 45000,
        image: 'https://xyuqcztzktqladitoell.supabase.co/storage/v1/object/public/mbp/migrated/featured-crimson-halo-set.jpg',
      },
      {
        id: 'test-2',
        name: 'Fishnet high thigh-stocking',
        size: 'M',
        qty: 2,
        price: 6000,
        image: 'https://xyuqcztzktqladitoell.supabase.co/storage/v1/object/public/mbp/migrated/store-new-1768344313451.jpg',
      },
      {
        id: '__delivery__lagos',
        name: 'Delivery - LAGOS ISLAND',
        size: '',
        qty: 1,
        price: 2500,
        image: '',
      },
    ],
    subtotal: 59500,
    total: 59500,
  },
};

async function main() {
  if (!key) throw new Error('RESEND_API_KEY missing in .env');

  const customerMail = templates.buildCustomerOrderEmail(sampleOrder);
  const adminMail = templates.buildAdminOrderEmail(sampleOrder);

  async function send(subject, html, recipient) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [recipient], subject, html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Resend error ${res.status}`);
    return data;
  }

  console.log(`Sending customer test to ${to}...`);
  const c = await send(customerMail.subject, customerMail.html, to);
  console.log('Customer email sent:', c.id);

  const adminTo = process.env.ADMIN_ORDER_EMAIL || 'mbplingerie@gmail.com';
  console.log(`Sending admin test to ${adminTo}...`);
  const a = await send(adminMail.subject, adminMail.html, adminTo);
  console.log('Admin email sent:', a.id);
}

main().catch((e) => {
  console.error('Failed:', e.message || e);
  process.exit(1);
});
