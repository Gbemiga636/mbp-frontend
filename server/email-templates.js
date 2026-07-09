const SITE_URL = String(process.env.PUBLIC_SITE_URL || process.env.FRONTEND_ORIGIN || 'https://mbplingerie.com.ng').replace(/\/$/, '');
const BRAND = 'MBP Lingerie';

const C = {
  bg: '#ece7e1',
  paper: '#ffffff',
  ink: '#0a0a0c',
  inkSoft: '#2b2826',
  muted: '#5c5651',
  line: '#d9d0c7',
  accent: '#8b1538',
  accentDark: '#6d0f2b',
  accentSoft: '#fdf2f5',
  dark: '#0a0a0c',
  white: '#ffffff',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(n) {
  const num = Number(n || 0);
  return `₦${num.toLocaleString('en-NG')}`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('en-NG', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso || '');
  }
}

function emailStyles() {
  return `
<style type="text/css">
  body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  .wrap { width: 100% !important; max-width: 600px !important; }
  .fluid { width: 100% !important; max-width: 100% !important; height: auto !important; }
  .break { word-break: break-word; overflow-wrap: anywhere; }
  .nowrap { white-space: nowrap; }
  @media only screen and (max-width: 620px) {
    .outer-pad { padding: 16px 10px !important; }
    .inner-pad { padding: 20px 16px !important; }
    .header-pad { padding: 22px 16px 18px !important; }
    .footer-pad { padding: 0 16px 20px !important; }
    .title { font-size: 24px !important; line-height: 1.2 !important; }
    .stack { display: block !important; width: 100% !important; max-width: 100% !important; }
    .stack-pad { padding-left: 0 !important; padding-right: 0 !important; padding-top: 14px !important; }
    .meta-right { text-align: left !important; padding-top: 10px !important; }
    .product-img-cell { width: 64px !important; padding-right: 12px !important; }
    .product-img { width: 64px !important; height: 64px !important; }
    .price-cell { text-align: left !important; padding-top: 6px !important; }
    .btn a { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    .detail-col { display: block !important; width: 100% !important; padding: 0 0 16px 0 !important; }
  }
</style>`;
}

function productRows(items) {
  const lines = Array.isArray(items) ? items : [];
  if (!lines.length) {
    return `<tr><td colspan="3" class="break" style="padding:18px 0;font-size:14px;line-height:1.5;color:${C.muted};font-family:Arial,Helvetica,sans-serif;">No items listed.</td></tr>`;
  }

  return lines
    .map((item, index) => {
      const name = escapeHtml(item?.name || 'Item');
      const size = escapeHtml(item?.size || '');
      const qty = Number(item?.qty || 1);
      const price = Number(item?.price || 0);
      const lineTotal = price * qty;
      const image = String(item?.image || '').trim();
      const isDelivery = String(item?.id || '').startsWith('__delivery__');
      const border = index < lines.length - 1 ? `border-bottom:1px solid ${C.line};` : '';

      const thumb = image
        ? `<img src="${escapeHtml(image)}" alt="" width="76" height="76" class="product-img" style="width:76px;height:76px;max-width:76px;border-radius:10px;border:1px solid ${C.line};object-fit:cover;" />`
        : `<table role="presentation" width="76" height="76" cellspacing="0" cellpadding="0" class="product-img" style="width:76px;height:76px;border-radius:10px;border:1px solid ${C.line};background:${C.bg};"><tr><td align="center" valign="middle" style="font-size:20px;color:${C.muted};font-family:Arial,Helvetica,sans-serif;">${isDelivery ? 'DEL' : 'MBP'}</td></tr></table>`;

      const metaParts = [];
      if (size && size !== '—') metaParts.push(`Size <strong style="color:${C.ink};">${size}</strong>`);
      metaParts.push(`Qty <strong style="color:${C.ink};">${qty}</strong>`);
      if (price > 0 && qty > 1) metaParts.push(`Unit ${formatMoney(price)}`);

      return `
<tr>
  <td class="product-img-cell" width="76" valign="top" style="padding:16px 0;${border}width:76px;vertical-align:top;">${thumb}</td>
  <td valign="top" class="break" style="padding:16px 12px;${border}vertical-align:top;font-family:Arial,Helvetica,sans-serif;">
    <div style="font-size:15px;line-height:1.45;font-weight:700;color:${C.ink};margin:0 0 6px;">${name}</div>
    <div style="font-size:13px;line-height:1.55;color:${C.muted};">${metaParts.join(' &nbsp;·&nbsp; ')}</div>
  </td>
  <td valign="top" align="right" class="price-cell nowrap" style="padding:16px 0;${border}vertical-align:top;font-family:Arial,Helvetica,sans-serif;">
    <div style="font-size:15px;line-height:1.4;font-weight:700;color:${C.accent};">${formatMoney(lineTotal)}</div>
  </td>
</tr>`;
    })
    .join('');
}

function emailShell({ preheader, title, bodyHtml, footerNote }) {
  const safePreheader = escapeHtml(preheader);
  const safeTitle = escapeHtml(title);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <title>${safeTitle}</title>
  ${emailStyles()}
</head>
<body style="margin:0;padding:0;background:${C.bg};color:${C.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${safePreheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg};">
    <tr>
      <td align="center" class="outer-pad" style="padding:28px 14px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="wrap" style="max-width:600px;width:100%;background:${C.paper};border:1px solid ${C.line};border-radius:4px;overflow:hidden;">
          <tr>
            <td class="header-pad" style="padding:28px 28px 22px;background:${C.dark};border-bottom:3px solid ${C.accent};">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.2;letter-spacing:0.22em;text-transform:uppercase;color:#f3c1cf;font-weight:700;margin:0 0 12px;">${BRAND}</div>
              <div class="title break" style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;font-weight:700;color:${C.white};margin:0;">${safeTitle}</div>
            </td>
          </tr>
          <tr>
            <td class="inner-pad" style="padding:28px;font-family:Arial,Helvetica,sans-serif;">${bodyHtml}</td>
          </tr>
          <tr>
            <td class="footer-pad" style="padding:0 28px 28px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-top:1px solid ${C.line};padding-top:18px;font-size:12px;line-height:1.65;color:${C.muted};" class="break">
                    ${footerNote || `Need help? Reply to this email or visit <a href="${SITE_URL}" style="color:${C.accent};text-decoration:underline;font-weight:700;">${SITE_URL.replace(/^https?:\/\//, '')}</a>.`}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="wrap" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:14px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:${C.muted};text-align:center;" class="break">
              You are receiving this because you placed an order with ${BRAND}.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function orderSummaryBlock(order) {
  const items = order?.totals?.items || [];
  const subtotal = Number(order?.totals?.subtotal || 0);
  const total = Number(order?.totals?.total || subtotal);
  const reference = escapeHtml(order?.reference || '—');
  const createdAt = escapeHtml(formatDate(order?.createdAt || new Date().toISOString()));
  const notes = escapeHtml(String(order?.notes || '').trim() || '—');
  const customer = order?.customer || {};

  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
  <tr>
    <td style="padding:16px 18px;background:${C.accentSoft};border:1px solid #f0c8d4;border-left:4px solid ${C.accent};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td class="stack break" valign="top" style="font-family:Arial,Helvetica,sans-serif;vertical-align:top;">
            <div style="font-size:11px;line-height:1.3;letter-spacing:0.14em;text-transform:uppercase;color:${C.accent};font-weight:700;margin:0 0 6px;">Order reference</div>
            <div class="break" style="font-size:16px;line-height:1.35;font-weight:700;color:${C.ink};">${reference}</div>
          </td>
          <td class="stack meta-right break" valign="top" align="right" style="font-family:Arial,Helvetica,sans-serif;vertical-align:top;text-align:right;">
            <div style="font-size:11px;line-height:1.3;letter-spacing:0.14em;text-transform:uppercase;color:${C.accent};font-weight:700;margin:0 0 6px;">Date placed</div>
            <div class="break" style="font-size:14px;line-height:1.45;font-weight:600;color:${C.inkSoft};">${createdAt}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 10px;">
  <tr>
    <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.3;letter-spacing:0.16em;text-transform:uppercase;color:${C.ink};font-weight:700;padding-bottom:8px;border-bottom:2px solid ${C.ink};">
      Order items
    </td>
  </tr>
</table>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;">
  ${productRows(items)}
</table>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
  <tr>
    <td style="padding:18px 20px;background:${C.dark};border-radius:4px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-family:Arial,Helvetica,sans-serif;">
        <tr>
          <td class="break" style="font-size:14px;line-height:1.5;color:#d7d2cd;">Subtotal</td>
          <td align="right" class="nowrap" style="font-size:14px;line-height:1.5;color:#ffffff;font-weight:600;">${formatMoney(subtotal)}</td>
        </tr>
        <tr>
          <td class="break" style="font-size:17px;line-height:1.4;color:#ffffff;font-weight:700;padding-top:12px;">Total paid</td>
          <td align="right" class="nowrap" style="font-size:22px;line-height:1.2;color:#f7c6d4;font-weight:700;padding-top:12px;">${formatMoney(total)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
  <tr>
    <td class="detail-col stack" width="50%" valign="top" style="padding:0 10px 0 0;vertical-align:top;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:11px;line-height:1.3;letter-spacing:0.14em;text-transform:uppercase;color:${C.accent};font-weight:700;margin:0 0 10px;">Delivery details</div>
      <div class="break" style="font-size:14px;line-height:1.65;color:${C.inkSoft};background:${C.bg};border:1px solid ${C.line};border-radius:4px;padding:14px 16px;">
        <div style="font-weight:700;color:${C.ink};margin-bottom:6px;">${escapeHtml(customer.name || 'Customer')}</div>
        <div style="margin-bottom:4px;">${escapeHtml(customer.email || '—')}</div>
        <div style="margin-bottom:4px;">${escapeHtml(customer.phone || '—')}</div>
        <div>${escapeHtml(customer.address || '—')}</div>
      </div>
    </td>
    <td class="detail-col stack stack-pad" width="50%" valign="top" style="padding:0 0 0 10px;vertical-align:top;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:11px;line-height:1.3;letter-spacing:0.14em;text-transform:uppercase;color:${C.accent};font-weight:700;margin:0 0 10px;">Order notes</div>
      <div class="break" style="font-size:14px;line-height:1.65;color:${C.inkSoft};background:${C.bg};border:1px solid ${C.line};border-radius:4px;padding:14px 16px;white-space:pre-wrap;">${notes}</div>
    </td>
  </tr>
</table>`;
}

function ctaButton(href, label, dark = false) {
  const bg = dark ? C.dark : C.accent;
  return `
<table role="presentation" cellspacing="0" cellpadding="0" class="btn" style="margin-top:24px;">
  <tr>
    <td align="center" style="border-radius:4px;background:${bg};">
      <a href="${href}" style="display:inline-block;padding:15px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.2;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ffffff;text-decoration:none;">${label}</a>
    </td>
  </tr>
</table>`;
}

function buildCustomerOrderEmail(order) {
  const reference = order?.reference || '';
  const html = emailShell({
    preheader: `Your MBP Lingerie order ${reference} is confirmed.`,
    title: 'Your order is confirmed',
    bodyHtml: `
<p class="break" style="margin:0 0 14px;font-size:16px;line-height:1.65;color:${C.inkSoft};">
  Thank you for choosing <strong style="color:${C.ink};">MBP Lingerie</strong>. Your payment was successful and your order is now being prepared.
</p>
<p class="break" style="margin:0 0 22px;font-size:14px;line-height:1.65;color:${C.muted};">
  Below is your full order summary with product images, sizes, and pricing. We will contact you if anything else is needed for delivery.
</p>
${orderSummaryBlock(order)}
${ctaButton(`${SITE_URL}/store.html`, 'Continue shopping')}`,
    footerNote: `Questions about your order? Email <a href="mailto:mbplingerie@gmail.com" style="color:${C.accent};text-decoration:underline;font-weight:700;">mbplingerie@gmail.com</a>.`,
  });

  return {
    subject: `Order confirmed — ${reference} · MBP Lingerie`,
    html,
  };
}

function buildAdminOrderEmail(order) {
  const reference = order?.reference || '';
  const customer = order?.customer || {};
  const total = Number(order?.totals?.total || 0);

  const html = emailShell({
    preheader: `New paid order ${reference} — ${formatMoney(total)}`,
    title: 'New order received',
    bodyHtml: `
<p class="break" style="margin:0 0 14px;font-size:16px;line-height:1.65;color:${C.inkSoft};">
  A new <strong style="color:${C.ink};">paid order</strong> has been placed on the storefront. Review the details below and fulfil it from admin.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
  <tr>
    <td style="padding:16px 18px;background:${C.accentSoft};border:1px solid #f0c8d4;border-left:4px solid ${C.accent};">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.3;letter-spacing:0.14em;text-transform:uppercase;color:${C.accent};font-weight:700;margin:0 0 8px;">Customer contact</div>
      <div class="break" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:${C.ink};">
        <div style="margin-bottom:4px;"><strong>Email:</strong> ${escapeHtml(customer.email || '—')}</div>
        <div style="margin-bottom:4px;"><strong>Phone:</strong> ${escapeHtml(customer.phone || '—')}</div>
        <div><strong>Address:</strong> ${escapeHtml(customer.address || '—')}</div>
      </div>
    </td>
  </tr>
</table>
${orderSummaryBlock(order)}
${ctaButton(`${SITE_URL}/admin/orders.html`, 'Open admin orders', true)}`,
    footerNote: `Admin notification for order <strong style="color:${C.ink};">${escapeHtml(reference)}</strong>.`,
  });

  return {
    subject: `New order ${reference} — ${formatMoney(total)}`,
    html,
  };
}

module.exports = {
  buildCustomerOrderEmail,
  buildAdminOrderEmail,
  formatMoney,
};
