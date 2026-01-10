(() => {
  const loader = document.getElementById('loader');
  const loaderLast = document.getElementById('loaderLast');

  const menu = document.getElementById('menu');
  const scrim = document.getElementById('scrim');
  const openMenu = document.getElementById('openMenu');
  const closeMenu = document.getElementById('closeMenu');

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  const initScrollTopButton = () => {
    try {
      if (!document.body) return;
      if (document.getElementById('scrollTopBtn')) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'scrollTopBtn';
      btn.className = 'scroll-top';
      btn.setAttribute('aria-label', 'Scroll to top');
      btn.hidden = true;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M12 5l-6 6m6-6 6 6M12 5v14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `;

      const update = () => {
        const y = window.scrollY || 0;
        btn.hidden = y < 420;
      };

      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      btn.addEventListener('click', () => {
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
          window.scrollTo(0, 0);
        }
      });

      document.body.appendChild(btn);
      update();
    } catch {
      // ignore
    }
  };

  initScrollTopButton();

  // Cookies + consent
  const CART_KEY = 'mbp_cart_v1';
  const CONSENT_KEY = 'mbp_cookie_consent';

  const isSecureContext = () => {
    try {
      return window.location.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const setCookie = (name, value, { days = 30, sameSite = 'Lax', secure = isSecureContext(), path = '/' } = {}) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    const encoded = encodeURIComponent(String(value));
    let cookie = `${name}=${encoded}; Expires=${expires}; Path=${path}; SameSite=${sameSite}`;
    if (secure) cookie += '; Secure';
    document.cookie = cookie;
  };

  const getCookie = (name) => {
    const needle = `${name}=`;
    const parts = document.cookie ? document.cookie.split('; ') : [];
    for (const part of parts) {
      if (part.startsWith(needle)) return decodeURIComponent(part.slice(needle.length));
    }
    return '';
  };

  const readCart = () => {
    try {
      const raw = getCookie(CART_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeCart = (cart) => {
    try {
      setCookie(CART_KEY, JSON.stringify(cart), { days: 30 });
    } catch {
      // ignore
    }
  };

  const getCartCount = () => {
    const cart = readCart();
    return cart.reduce((sum, item) => sum + (Number(item?.qty) || 1), 0);
  };

  const updateCartBadge = () => {
    const host = document.querySelector('.header__right');
    if (!host) return;

    let badge = host.querySelector('.cart-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'cart-badge';
      badge.setAttribute('aria-hidden', 'true');
      host.appendChild(badge);
    }

    const count = getCartCount();
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  };

  const normalizeSize = (size) => String(size || '').trim().replace(/\s+/g, ' ');

  const addToCart = (item) => {
    const cart = readCart();
    const next = { ...item, size: normalizeSize(item.size) };
    const existing = cart.find((x) => x?.id === next.id && normalizeSize(x?.size) === next.size);
    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
      if (!existing.size && next.size) existing.size = next.size;
    } else {
      cart.push({ ...next, qty: 1 });
    }
    writeCart(cart);
    updateCartBadge();
  };

  const parsePriceText = (text) => {
    const digits = String(text || '').replace(/[^0-9]/g, '');
    const n = Number(digits);
    return Number.isFinite(n) ? n : 0;
  };

  const formatNaira = (value) => {
    const n = Number(value) || 0;
    return `₦${n.toLocaleString('en-NG')}`;
  };

  const inferredLocalApiBase =
    !window.MBP_API_BASE &&
    (window.location.protocol === 'file:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')
      ? 'http://localhost:4000'
      : '';
  const API_BASE = String(window.MBP_API_BASE || inferredLocalApiBase).replace(/\/$/, '');

  const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

  const waitForEventOnce = (target, eventName, { timeoutMs = 7000 } = {}) => {
    return new Promise((resolve, reject) => {
      let timeoutId;
      const onEvent = () => {
        cleanup();
        resolve();
      };
      const onTimeout = () => {
        cleanup();
        reject(new Error(`${eventName} timed out`));
      };
      const cleanup = () => {
        try {
          target.removeEventListener(eventName, onEvent);
        } catch {
          // ignore
        }
        clearTimeout(timeoutId);
      };

      try {
        target.addEventListener(eventName, onEvent, { once: true });
      } catch {
        // ignore
      }
      timeoutId = window.setTimeout(onTimeout, timeoutMs);
    });
  };

  const setPosterFromVideoFrame = async (video, { atSeconds = 0.2, quality = 0.72 } = {}) => {
    if (!(video instanceof HTMLVideoElement)) return false;
    if (video.dataset.posterFromFrame === '1') return true;
    if (video.getAttribute('poster')) {
      // Respect any explicit poster that might be set elsewhere.
      video.dataset.posterFromFrame = '1';
      return true;
    }

    // Best-effort: for cross-origin videos, this only works if the server allows CORS.
    try {
      if (!video.getAttribute('crossorigin')) video.setAttribute('crossorigin', 'anonymous');
    } catch {
      // ignore
    }

    const wasPaused = video.paused;
    const startTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;

    try {
      // Need metadata to know dimensions/duration.
      if (video.readyState < 1) {
        try {
          video.load?.();
        } catch {
          // ignore
        }
        await waitForEventOnce(video, 'loadedmetadata', { timeoutMs: 9000 });
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return false;

      // Seek to a visible frame (avoid 0.0 which can be black on some encodes).
      const dur = Number(video.duration);
      const safeT = Number.isFinite(dur) && dur > 0.5 ? Math.min(Math.max(atSeconds, 0.1), dur - 0.1) : 0.1;
      try {
        video.currentTime = safeT;
      } catch {
        // ignore
      }
      if (video.readyState < 2) {
        await waitForEventOnce(video, 'loadeddata', { timeoutMs: 9000 });
      }
      await waitForEventOnce(video, 'seeked', { timeoutMs: 9000 }).catch(() => null);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      ctx.drawImage(video, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (!dataUrl || dataUrl === TRANSPARENT_PIXEL) return false;

      video.setAttribute('poster', dataUrl);
      video.dataset.posterFromFrame = '1';
      return true;
    } catch {
      // If canvas is tainted (CORS) or browser blocks the capture, just skip.
      return false;
    } finally {
      // Restore playback state so this doesn't affect UX.
      try {
        video.currentTime = startTime;
      } catch {
        // ignore
      }
      try {
        if (wasPaused) video.pause();
      } catch {
        // ignore
      }
    }
  };

  const resolveMediaUrl = (src) => {
    const s = String(src || '').trim();
    if (!s) return '';
    // Backend returns upload URLs like /uploads/..., which must be absolute when
    // the frontend is on a different origin (GitHub Pages) or opened via file://.
    if (s.startsWith('/uploads/')) {
      return API_BASE ? `${API_BASE}${s}` : s;
    }
    return s;
  };

  const fetchJson = async (url, options) => {
    const res = await fetch(url, { cache: 'no-store', ...options });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const message = data?.error || data?.message || `Request failed (${res.status})`;
      throw new Error(message);
    }
    return data;
  };

  // Cookie banner (accept all / reject non-essential)
  const cookieBanner = document.getElementById('cookieBanner');
  const cookieAccept = document.getElementById('cookieAccept');
  const cookieReject = document.getElementById('cookieReject');

  const getConsent = () => getCookie(CONSENT_KEY);
  const setConsent = (value) => setCookie(CONSENT_KEY, value, { days: 180 });

  const refreshCookieBanner = () => {
    if (!cookieBanner) return;
    const consent = getConsent();
    cookieBanner.hidden = Boolean(consent);
  };

  cookieAccept?.addEventListener('click', () => {
    setConsent('accept');
    refreshCookieBanner();
  });

  cookieReject?.addEventListener('click', () => {
    setConsent('reject');
    refreshCookieBanner();
  });

  refreshCookieBanner();

  updateCartBadge();
  window.addEventListener('pageshow', updateCartBadge);
  window.addEventListener('focus', updateCartBadge);

  // Cart page
  const cartItemsEl = document.getElementById('cartItems');
  const cartEmptyEl = document.getElementById('cartEmpty');
  const subtotalText = document.getElementById('subtotalText');
  const deliveryText = document.getElementById('deliveryText');
  const totalText = document.getElementById('totalText');
  const deliveryFeeValue = document.getElementById('deliveryFeeValue');
  const deliveryZones = document.getElementById('deliveryZones');
  const checkoutForm = document.getElementById('checkoutForm');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const checkoutPhone = document.getElementById('checkoutPhone');
  const checkoutEmail = document.getElementById('checkoutEmail');
  const checkoutAddress = document.getElementById('checkoutAddress');
  const checkoutNotes = document.getElementById('checkoutNotes');
  const paymentStatus = document.getElementById('paymentStatus');

  const setPaymentNotice = (type, message) => {
    if (!paymentStatus) return;
    paymentStatus.hidden = false;
    paymentStatus.textContent = message;
    paymentStatus.style.borderColor = type === 'success' ? 'rgba(46, 125, 70, 0.25)' : 'rgba(168, 75, 87, 0.22)';
  };

  const cartKeyFor = (item) => `${item?.id || ''}__${normalizeSize(item?.size)}`;

  const upsertCart = (cart) => {
    writeCart(cart);
    updateCartBadge();
  };

  const setQty = (id, size, qty) => {
    const cart = readCart();
    const s = normalizeSize(size);
    const index = cart.findIndex((x) => x?.id === id && normalizeSize(x?.size) === s);
    if (index === -1) return;
    const nextQty = Math.max(0, Math.min(99, Number(qty) || 0));
    if (nextQty <= 0) cart.splice(index, 1);
    else cart[index].qty = nextQty;
    upsertCart(cart);
  };

  const removeItem = (id, size) => {
    const cart = readCart();
    const s = normalizeSize(size);
    const next = cart.filter((x) => !(x?.id === id && normalizeSize(x?.size) === s));
    upsertCart(next);
  };

  let deliveryFee = 2500;

  const DELIVERY_ZONE_KEY = 'mbp_delivery_zone_v1';
  const deliveryZoneOptions = {
    lekki: { label: 'LEKKI', fee: 2000 },
    vi_ikoyi: { label: 'VI/IKOYI', fee: 3000 },
    ikota_ajah: { label: 'IKOTA/AJAH', fee: 3000 },
    others: { label: 'OTHERS', fee: 5000 },
  };

  const getSavedDeliveryZone = () => {
    try {
      const z = String(window.localStorage.getItem(DELIVERY_ZONE_KEY) || '').trim();
      return deliveryZoneOptions[z] ? z : '';
    } catch {
      return '';
    }
  };

  const setSavedDeliveryZone = (zone) => {
    const z = String(zone || '').trim();
    if (!deliveryZoneOptions[z]) return;
    try {
      window.localStorage.setItem(DELIVERY_ZONE_KEY, z);
    } catch {
      // ignore
    }
  };

  const getSelectedDeliveryZone = () => {
    const z = getSavedDeliveryZone();
    if (deliveryZoneOptions[z]) return z;
    // Default selection
    return 'lekki';
  };

  const applyDeliveryZoneToUi = () => {
    if (!deliveryZones) return;
    const selected = getSelectedDeliveryZone();
    const buttons = Array.from(deliveryZones.querySelectorAll('button[data-zone]'));
    for (const btn of buttons) {
      const z = String(btn.getAttribute('data-zone') || '').trim();
      btn.classList.toggle('is-selected', z === selected);
    }
  };

  const getDeliveryFeeForSelectedZone = () => {
    const selected = getSelectedDeliveryZone();
    return Number(deliveryZoneOptions[selected]?.fee) || 0;
  };

  const refreshTotals = () => {
    const cart = readCart();
    const subtotal = cart.reduce((sum, item) => sum + (Number(item?.price) || 0) * (Number(item?.qty) || 1), 0);
    const selectedFee = getDeliveryFeeForSelectedZone();
    const fee = cart.length ? selectedFee : 0;
    const total = subtotal + fee;

    if (subtotalText) subtotalText.textContent = formatNaira(subtotal);
    if (deliveryText) deliveryText.textContent = formatNaira(fee);
    if (totalText) totalText.textContent = formatNaira(total);
    if (deliveryFeeValue) deliveryFeeValue.textContent = String(selectedFee);
    applyDeliveryZoneToUi();
  };

  const renderCart = () => {
    if (!cartItemsEl) return;

    const cart = readCart();
    cartItemsEl.innerHTML = '';

    if (!cart.length) {
      if (cartEmptyEl) cartEmptyEl.hidden = false;
      refreshTotals();
      return;
    }

    if (cartEmptyEl) cartEmptyEl.hidden = true;

    for (const item of cart) {
      const id = item?.id || '';
      const name = item?.name || 'Product';
      const price = Number(item?.price) || 0;
      const qty = Number(item?.qty) || 1;
      const size = normalizeSize(item?.size);
      const img = item?.image || '';

      const row = document.createElement('div');
      row.className = 'cart-item';
      row.dataset.key = cartKeyFor(item);

      row.innerHTML = `
        <div class="cart-item__img">${img ? `<img src="${img}" alt="${name}" loading="lazy" />` : ''}</div>
        <div class="cart-item__body">
          <div class="cart-item__top">
            <div>
              <h3 class="cart-item__name">${name}</h3>
              <div class="cart-item__meta">${size ? `Size: <strong>${size}</strong>` : 'Size: —'}</div>
            </div>
            <div class="cart-item__price">${formatNaira(price * qty)}</div>
          </div>
          <div class="cart-item__bottom">
            <div class="qty" aria-label="Quantity">
              <button class="qty__btn" type="button" data-action="dec" aria-label="Decrease quantity">−</button>
              <input class="qty__input" type="number" min="1" max="99" value="${qty}" inputmode="numeric" aria-label="Quantity input" />
              <button class="qty__btn" type="button" data-action="inc" aria-label="Increase quantity">+</button>
            </div>
            <button class="cart-item__remove" type="button" aria-label="Remove item"><i class="fa-solid fa-trash" aria-hidden="true"></i> Remove</button>
          </div>
        </div>
      `;

      const input = row.querySelector('.qty__input');
      row.querySelector('[data-action="dec"]')?.addEventListener('click', () => {
        setQty(id, size, qty - 1);
        renderCart();
      });
      row.querySelector('[data-action="inc"]')?.addEventListener('click', () => {
        setQty(id, size, qty + 1);
        renderCart();
      });

      input?.addEventListener('change', () => {
        const v = Number(input.value);
        setQty(id, size, v);
        renderCart();
      });

      row.querySelector('.cart-item__remove')?.addEventListener('click', () => {
        removeItem(id, size);
        renderCart();
      });

      cartItemsEl.appendChild(row);
    }

    refreshTotals();
  };

  const loadDeliveryFee = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/api/config`, { method: 'GET' });
      const fee = Number(data?.deliveryFee);
      if (Number.isFinite(fee) && fee >= 0) deliveryFee = fee;
    } catch {
      // fallback to default
    }
  };

  const verifyFromQuery = async () => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;

    try {
      setPaymentNotice('info', 'Verifying payment...');
      const data = await fetchJson(`${API_BASE}/api/paystack/verify?reference=${encodeURIComponent(reference)}`, { method: 'GET' });
      if (data?.status === 'success') {
        setPaymentNotice('success', 'Payment successful. Your order has been received. A confirmation email will be sent shortly.');
        upsertCart([]);
        renderCart();
      } else {
        setPaymentNotice('error', 'Payment verification did not complete. If you were charged, please contact us.');
      }
    } catch (e) {
      setPaymentNotice('error', `Payment verification failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const beginCheckout = async () => {
    const cart = readCart();
    if (!cart.length) {
      setPaymentNotice('error', 'Your cart is empty.');
      return;
    }

    if (!checkoutEmail?.checkValidity()) {
      checkoutEmail?.reportValidity();
      return;
    }
    if (!checkoutPhone?.checkValidity()) {
      checkoutPhone?.reportValidity();
      return;
    }
    if (!checkoutAddress?.checkValidity()) {
      checkoutAddress?.reportValidity();
      return;
    }

    const email = String(checkoutEmail.value || '').trim();
    const phone = String(checkoutPhone.value || '').trim();
    const address = String(checkoutAddress?.value || '').trim();
    const notes = String(checkoutNotes?.value || '').trim();
    const selectedZone = getSelectedDeliveryZone();
    const selectedFee = getDeliveryFeeForSelectedZone();
    const zoneLabel = String(deliveryZoneOptions[selectedZone]?.label || selectedZone);

    // Treat delivery like a product for checkout (so backend can charge it) without altering the saved cart.
    const itemsForCheckout = Array.isArray(cart) ? cart.slice() : [];
    if (selectedFee > 0) {
      itemsForCheckout.push({
        id: `__delivery__${selectedZone}`,
        name: `Delivery - ${zoneLabel}`,
        price: selectedFee,
        qty: 1,
      });
    }

    // Add delivery info to notes for visibility (emails/admin) without requiring backend changes.
    const deliveryNote = `Delivery area: ${zoneLabel} (₦${selectedFee})`;
    const notesWithDelivery = notes
      ? notes.includes('Delivery area:')
        ? notes
        : `${notes}\n${deliveryNote}`
      : deliveryNote;

    try {
      if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Redirecting...';
      }

      const payload = { customer: { email, phone, address }, notes: notesWithDelivery, items: itemsForCheckout, deliveryZone: selectedZone, deliveryFee: selectedFee };
      const data = await fetchJson(`${API_BASE}/api/paystack/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const url = data?.authorizationUrl || data?.authorization_url;
      if (!url) throw new Error('Payment gateway did not return a redirect URL.');
      window.location.href = url;
    } catch (e) {
      setPaymentNotice('error', e?.message || 'Checkout failed.');
      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Proceed to Payment';
      }
    }
  };

  if (cartItemsEl) {
    (async () => {
      await loadDeliveryFee();

      // Setup delivery zone buttons (cart page only)
      try {
        const initial = getSelectedDeliveryZone();
        setSavedDeliveryZone(initial);
        applyDeliveryZoneToUi();

        deliveryZones?.addEventListener('click', (e) => {
          const btn = e.target?.closest?.('button[data-zone]');
          if (!(btn instanceof HTMLButtonElement)) return;
          const zone = String(btn.getAttribute('data-zone') || '').trim();
          if (!deliveryZoneOptions[zone]) return;
          setSavedDeliveryZone(zone);
          refreshTotals();
        });
      } catch {
        // ignore
      }

      renderCart();
      await verifyFromQuery();
    })();

    checkoutForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      beginCheckout();
    });
  }

  // Loader: letters fade in, then reveal site.
  const hideLoader = () => {
    if (!loader) return;
    loader.classList.add('is-hiding');
    window.setTimeout(() => {
      loader.style.display = 'none';
      document.documentElement.classList.add('is-loaded');

      // Some browsers are stricter with autoplay on a second video.
      // Try to start it; if blocked, the poster still looks good.
      const bandVideo = document.querySelector('.video-band__video');
      if (bandVideo && typeof bandVideo.play === 'function') {
        bandVideo.play().catch(() => {});
      }
    }, 560);
  };

  if (loaderLast) {
    loaderLast.addEventListener('animationend', hideLoader, { once: true });
    // Fallback in case animation doesn't fire
    window.setTimeout(hideLoader, 1800);
  }

  // Slide-in menu
  const setMenuOpen = (isOpen) => {
    if (!menu || !scrim || !openMenu) return;

    menu.classList.toggle('is-open', isOpen);
    scrim.hidden = !isOpen;
    menu.setAttribute('aria-hidden', String(!isOpen));
    openMenu.setAttribute('aria-expanded', String(isOpen));

    if (isOpen) {
      // trap focus lightly: focus first link
      const firstLink = menu.querySelector('a');
      if (firstLink) firstLink.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      openMenu.focus();
    }
  };

  openMenu?.addEventListener('click', () => setMenuOpen(true));
  closeMenu?.addEventListener('click', () => setMenuOpen(false));
  scrim?.addEventListener('click', () => setMenuOpen(false));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenuOpen(false);
  });

  // Make horizontal carousels swipe/drag feel good on desktop.
  const enableDragScroll = (el) => {
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onDown = (e) => {
      isDown = true;
      el.setPointerCapture?.(e.pointerId);
      startX = e.clientX;
      startScrollLeft = el.scrollLeft;
      el.style.scrollSnapType = 'none';
    };

    const onMove = (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      el.scrollLeft = startScrollLeft - dx;
    };

    const onUp = () => {
      if (!isDown) return;
      isDown = false;
      el.style.scrollSnapType = '';
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('mouseleave', onUp);
  };

  enableDragScroll(document.getElementById('carousel'));
  enableDragScroll(document.getElementById('reviewsCarousel'));

  // Swatches (color chooser) removed.

  // Size picker (used on index Featured Pieces)
  const sizeModal = document.getElementById('sizeModal');
  const sizeScrim = document.getElementById('sizeScrim');
  const sizeClose = document.getElementById('sizeClose');
  const sizeCancel = document.getElementById('sizeCancel');
  const sizeConfirm = document.getElementById('sizeConfirm');
  const sizeInput = document.getElementById('sizeInput');
  const sizeHint = document.getElementById('sizeHint');
  const sizeProduct = document.getElementById('sizeProduct');

  let pendingAdd = null;

  const setSizeModalOpen = (isOpen, { name = '', hint = '' } = {}) => {
    if (!sizeModal) return;
    sizeModal.hidden = !isOpen;
    if (isOpen) {
      if (sizeProduct) sizeProduct.textContent = name;
      if (sizeHint) sizeHint.textContent = hint || 'Available sizes: —';
      if (sizeInput) {
        sizeInput.value = '';
        sizeInput.setCustomValidity('');
        window.setTimeout(() => sizeInput.focus(), 0);
      }
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  };

  const closeSizeModal = () => {
    pendingAdd = null;
    try {
      sizeInput?.blur?.();
    } catch {
      // ignore
    }
    setSizeModalOpen(false);
  };

  sizeScrim?.addEventListener('click', closeSizeModal);
  sizeClose?.addEventListener('click', closeSizeModal);
  sizeCancel?.addEventListener('click', closeSizeModal);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sizeModal && !sizeModal.hidden) closeSizeModal();
  });

  const commitAddWithSize = () => {
    if (!pendingAdd || !sizeInput) return;
    const size = normalizeSize(sizeInput.value);
    if (!size) {
      sizeInput.setCustomValidity('Please enter your size.');
      sizeInput.reportValidity();
      return;
    }
    sizeInput.setCustomValidity('');

    addToCart({ ...pendingAdd.item, size });
    const btn = pendingAdd.btn;
    const original = pendingAdd.original;
    closeSizeModal();

    if (btn) {
      btn.textContent = `Added (${size})`;
      btn.classList.add('is-added');
      window.setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('is-added');
      }, 1100);
    }
  };

  sizeConfirm?.addEventListener('click', commitAddWithSize);
  sizeInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitAddWithSize();
    }
  });

  const handleAddToCartClick = (btn) => {
    const card = btn.closest('.product-card');
    if (!card) return;

    const name = card.dataset.name || card.querySelector('.product-card__name')?.textContent?.trim() || 'Product';
    const price = Number(card.dataset.price) || parsePriceText(card.querySelector('.product-card__price')?.textContent);
    const image = card.dataset.image || card.querySelector('img')?.getAttribute('src') || '';
    const id = card.dataset.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // If the size modal exists (index page), ask for size first.
    if (sizeModal && sizeInput && sizeConfirm) {
      const sizesText = card.querySelector('.product-card__sizes')?.textContent?.trim() || 'Available sizes: —';
      pendingAdd = {
        item: { id, name, price, image },
        btn,
        original: btn.textContent,
      };
      setSizeModalOpen(true, { name, hint: sizesText });
      return;
    }

    addToCart({ id, name, price, image, size: '' });

    const original = btn.textContent;
    btn.textContent = 'Added';
    btn.classList.add('is-added');
    window.setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('is-added');
    }, 900);
  };

  // Lightbox (full image)
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxScrim = document.getElementById('lightboxScrim');

  const setLightboxOpen = (isOpen, { src = '', alt = '' } = {}) => {
    if (!lightbox || !lightboxImg) return;

    if (isOpen) {
      lightbox.hidden = false;
      lightboxImg.src = src;
      lightboxImg.alt = alt;
      document.body.style.overflow = 'hidden';
      lightboxClose?.focus();
    } else {
      lightbox.hidden = true;
      lightboxImg.removeAttribute('src');
      lightboxImg.alt = '';
      document.body.style.overflow = '';
    }
  };

  const handleLightboxClick = (btn) => {
    const card = btn.closest('.product-card');
    const front = card?.querySelector('img[data-role="frontImg"]') || btn.querySelector('img');
    const back = card?.querySelector('img[data-role="backImg"]');

    let img = front;
    try {
      if (back instanceof HTMLImageElement) {
        const op = window.getComputedStyle(back).opacity;
        if (Number(op) >= 0.5) img = back;
      }
    } catch {
      // ignore
    }

    const src = img?.getAttribute('src') || '';
    const alt = img?.getAttribute('alt') || 'Product image';
    if (!src) return;
    setLightboxOpen(true, { src, alt });
  };

  lightboxClose?.addEventListener('click', () => setLightboxOpen(false));
  lightboxScrim?.addEventListener('click', () => setLightboxOpen(false));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox && !lightbox.hidden) setLightboxOpen(false);
  });

  // Footer email form: no backend yet.
  const form = document.querySelector('.footer__form');
  const emailInput = document.getElementById('email');
  const footerThanks = document.getElementById('footerThanks');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!emailInput) return;
    if (!emailInput.checkValidity()) {
      emailInput.reportValidity();
      return;
    }

    if (footerThanks) {
      footerThanks.hidden = false;
      window.setTimeout(() => {
        footerThanks.hidden = true;
      }, 3500);
    }

    emailInput.value = '';
  });

  // Gallery: play button overlay + WhatsApp inquiry deep-link
  const buildPostLink = (postId) => {
    const base = window.location.href.split('#')[0];
    return `${base}#${postId}`;
  };

  const openWhatsAppInquiry = ({ postId, caption }) => {
    const link = buildPostLink(postId);
    const message = `Hello MBP Lingerie, I would like to make inquiry on this:\n\n${caption}\n\n${link}`;
    const url = `https://wa.me/2348087504905?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const setGalleryPlayingUI = (post, isPlaying) => {
    post.classList.toggle('is-playing', isPlaying);
    const playBtn = post.querySelector('.ig-post__play');
    if (playBtn) playBtn.setAttribute('aria-label', isPlaying ? 'Pause video' : 'Play video');
  };

  const toggleGalleryVideo = (post) => {
    const video = post.querySelector('video.ig-post__media');
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setGalleryPlayingUI(post, true)).catch(() => setGalleryPlayingUI(post, false));
    } else {
      video.pause();
      setGalleryPlayingUI(post, false);
    }
  };

  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.add-to-cart');
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      handleAddToCartClick(addBtn);
      return;
    }

    const imgBtn = e.target.closest('.product-card__imgBtn');
    if (imgBtn) {
      e.preventDefault();
      handleLightboxClick(imgBtn);
      return;
    }

    const inquiryBtn = e.target.closest('.ig-post__inquiry');
    if (inquiryBtn) {
      e.preventDefault();
      const post = inquiryBtn.closest('.ig-post');
      if (!post?.id) return;
      const caption = post.getAttribute('data-caption') || post.querySelector('.ig-post__caption')?.textContent?.trim() || '';
      openWhatsAppInquiry({ postId: post.id, caption });
      return;
    }

    const playBtn = e.target.closest('.ig-post__play');
    if (playBtn) {
      e.preventDefault();
      const post = playBtn.closest('.ig-post');
      if (!post) return;
      toggleGalleryVideo(post);
      return;
    }

    const video = e.target.closest('video.ig-post__media');
    if (video) {
      e.preventDefault();
      const post = video.closest('.ig-post');
      if (!post) return;
      toggleGalleryVideo(post);
      return;
    }
  });

  document.addEventListener('play', (e) => {
    const video = e.target;
    if (!(video instanceof HTMLVideoElement)) return;
    const post = video.closest('.ig-post');
    if (!post) return;
    setGalleryPlayingUI(post, true);
  }, true);

  document.addEventListener('pause', (e) => {
    const video = e.target;
    if (!(video instanceof HTMLVideoElement)) return;
    const post = video.closest('.ig-post');
    if (!post) return;
    setGalleryPlayingUI(post, false);
  }, true);

  // Dynamic content loaders (home/store/gallery)
  const buildProductCardHtml = (p) => {
    const id = String(p?.id || '').trim();
    const name = String(p?.name || 'Product').trim();
    const price = Number(p?.price || 0);
    const imageResolved = resolveMediaUrl(p?.image);
    const image = imageResolved || TRANSPARENT_PIXEL;
    const imageBackResolved = resolveMediaUrl(p?.imageBack);
    const imageBack = imageBackResolved || '';
    const hasBack = Boolean(imageBack && imageBack !== TRANSPARENT_PIXEL);
    const desc = String(p?.desc || '').trim();
    const sizes = Array.isArray(p?.sizes) ? p.sizes.filter(Boolean).join(', ') : String(p?.sizes || '').trim();
    const sizeLine = sizes ? `Available sizes: ${sizes}` : 'Available sizes: —';

    const cardClass = hasBack ? 'product-card has-back' : 'product-card';
    const swapBar = hasBack
      ? `<div class="product-card__swap-bar" aria-label="More images">
      <button class="product-card__swap-arrow" type="button" data-role="swapPrev" aria-label="Show previous image">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <div class="product-card__swap-hint" aria-hidden="true">Front / Back</div>
      <button class="product-card__swap-arrow" type="button" data-role="swapNext" aria-label="Show next image">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>`
      : '';

    return `
<article class="${cardClass}" tabindex="0" data-id="${id}" data-name="${name.replace(/"/g, '&quot;')}" data-price="${price}" data-image="${image.replace(/"/g, '&quot;')}" data-image-back="${imageBack.replace(/"/g, '&quot;')}">
  <div class="product-card__img">
    <button class="product-card__imgBtn" type="button" aria-label="View ${name.replace(/"/g, '&quot;')} image">
      <img src="${image}" alt="${name.replace(/"/g, '&quot;')}" loading="lazy" data-role="frontImg" />
      ${hasBack ? `<img src="${imageBack}" alt="${name.replace(/"/g, '&quot;')} back" loading="lazy" data-role="backImg" style="opacity:0;position:absolute;top:0;left:0;" />` : ''}
    </button>
  </div>
  ${swapBar}
  <div class="product-card__body">
    <div class="product-card__top">
      <h3 class="product-card__name">${name.replace(/</g, '&lt;')}</h3>
      <div class="product-card__price">₦${Number(price).toLocaleString('en-NG')}</div>
    </div>
    <p class="product-card__desc">${desc.replace(/</g, '&lt;')}</p>
    <div class="product-card__sizes">${sizeLine.replace(/</g, '&lt;')}</div>
    <div class="product-card__actions">
      <button class="btn btn--card add-to-cart" type="button">Add to Cart</button>
    </div>
  </div>
</article>
`.trim();
  };

  const loadHomeContent = async () => {
    const heroSection = document.querySelector('section.hero');
    const heroSource = document.getElementById('heroVideoSource');
    const heroVideo = document.getElementById('heroVideo');
    const carousel = document.getElementById('carousel');
    const reviewsCarousel = document.getElementById('reviewsCarousel');
    if (!heroSource && !carousel && !reviewsCarousel) return;

    if (!API_BASE) return;

    const setSectionStatus = (el, message) => {
      if (!el) return;
      el.innerHTML = `<div class="store-empty" role="status" aria-live="polite">${String(message || '')}</div>`;
    };

    // Always clear any existing static HTML so public === admin.
    setSectionStatus(carousel, 'Loading featured pieces…');
    setSectionStatus(reviewsCarousel, 'Loading reviews…');

    const ensureHeroBackgroundVideo = () => {
      if (!heroVideo) return;
      try {
        heroVideo.controls = false;
        heroVideo.removeAttribute('controls');
        heroVideo.autoplay = true;
        heroVideo.loop = true;
        heroVideo.muted = true;
        heroVideo.defaultMuted = true;
        heroVideo.setAttribute('muted', '');
        heroVideo.setAttribute('autoplay', '');
        heroVideo.setAttribute('loop', '');
        heroVideo.setAttribute('playsinline', '');
        heroVideo.setAttribute('webkit-playsinline', '');
        heroVideo.setAttribute('disablepictureinpicture', '');
        heroVideo.setAttribute('disableremoteplayback', '');
      } catch {
        // ignore
      }
    };

    const kickstartHeroPlayback = (() => {
      let started = false;
      let attempts = 0;
      let lastAttemptAt = 0;

      const attempt = () => {
        if (!heroVideo) return;
        if (heroVideo.readyState < 2) {
          // Not enough data; we'll try again on canplay.
          return;
        }

        const now = Date.now();
        if (now - lastAttemptAt < 450) return;
        lastAttemptAt = now;

        ensureHeroBackgroundVideo();
        heroVideo
          .play?.()
          .then(() => {
            started = true;
            attempts = 0;
          })
          .catch(() => {
            attempts += 1;
          });
      };

      const attachOnce = () => {
        if (started) return;
        const onUser = () => {
          attempt();
        };
        window.addEventListener('pointerdown', onUser, { once: true, passive: true });
        window.addEventListener('touchstart', onUser, { once: true, passive: true });
        window.addEventListener('scroll', onUser, { once: true, passive: true });
      };

      return () => {
        if (!heroVideo) return;
        attachOnce();
        attempt();
        // A couple of delayed retries to reduce chance of a visible play-overlay.
        if (attempts < 3) {
          window.setTimeout(() => attempt(), 350);
          window.setTimeout(() => attempt(), 900);
        }
      };
    })();

    if (heroVideo && heroSection && !heroVideo.dataset.heroInit) {
      heroVideo.dataset.heroInit = '1';
      ensureHeroBackgroundVideo();

      try {
        if (!heroVideo.paused) heroSection.classList.add('is-video-playing');
      } catch {
        // ignore
      }

      heroVideo.addEventListener('playing', () => {
        try {
          heroSection.classList.add('is-video-playing');
        } catch {
          // ignore
        }
      });

      heroVideo.addEventListener('pause', () => {
        // Hide the element when paused so iOS doesn't show the big play overlay.
        try {
          heroSection.classList.remove('is-video-playing');
        } catch {
          // ignore
        }
        // Best-effort restart.
        kickstartHeroPlayback();
      });

      heroVideo.addEventListener('canplay', () => {
        kickstartHeroPlayback();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') kickstartHeroPlayback();
      });
    }

    try {
      const home = await fetchJson(`${API_BASE}/api/content/home`, { method: 'GET' });

      const heroUrl = resolveMediaUrl(home?.heroVideo);
      if (heroSource) {
        const current = heroSource.getAttribute('src') || '';
        if (!heroUrl) {
          // If admin cleared the hero video, hide it to avoid a broken player.
          try {
            heroSource.removeAttribute('src');
          } catch {
            // ignore
          }
          try {
            if (heroVideo) {
              heroVideo.pause?.();
              heroVideo.load();
              heroVideo.style.display = 'none';
            }
          } catch {
            // ignore
          }
        } else if (current !== heroUrl) {
          heroSource.setAttribute('src', heroUrl);
          if (heroVideo) {
            try {
              // Force background-video behavior: no controls, autoplay+loop, muted.
              heroVideo.controls = false;
              heroVideo.removeAttribute('controls');
              heroVideo.autoplay = true;
              heroVideo.loop = true;
              heroVideo.muted = true;
              heroVideo.setAttribute('muted', '');
              heroVideo.setAttribute('autoplay', '');
              heroVideo.setAttribute('loop', '');

              // Hide until we are actually playing (prevents a visible play overlay on iOS).
              if (heroSection) heroSection.classList.remove('is-video-playing');

              heroVideo.style.display = '';
              heroVideo.load();
              kickstartHeroPlayback();
            } catch {
              // ignore
            }
          }
        } else {
          // Ensure visible if it already matches.
          try {
            if (heroVideo && heroUrl) {
              heroVideo.controls = false;
              heroVideo.removeAttribute('controls');
              heroVideo.autoplay = true;
              heroVideo.loop = true;
              heroVideo.muted = true;
              heroVideo.setAttribute('muted', '');
              heroVideo.setAttribute('autoplay', '');
              heroVideo.setAttribute('loop', '');
              heroVideo.style.display = '';
              kickstartHeroPlayback();
            }
          } catch {
            // ignore
          }
        }
      }

      if (carousel && Array.isArray(home?.featured) && home.featured.length) {
        carousel.innerHTML = home.featured.map(buildProductCardHtml).join('');
      } else {
        setSectionStatus(carousel, 'No featured pieces yet.');
      }

      if (reviewsCarousel && Array.isArray(home?.reviews) && home.reviews.length) {
        reviewsCarousel.innerHTML = home.reviews
          .map((r) => {
            const text = String(r?.text || '').replace(/</g, '&lt;');
            const meta = String(r?.meta || '').replace(/</g, '&lt;');
            return `
<article class="review">
  <div class="review__stars" aria-hidden="true">★★★★★</div>
  <p class="review__text">${text}</p>
  <div class="review__meta">${meta}</div>
</article>
`.trim();
          })
          .join('');
      } else {
        setSectionStatus(reviewsCarousel, 'No reviews yet.');
      }
    } catch {
      setSectionStatus(carousel, 'Unable to load featured pieces right now. Please refresh.');
      setSectionStatus(reviewsCarousel, 'Unable to load reviews right now. Please refresh.');
    }
  };

  const loadStoreContent = async () => {
    const grids = {
      lingerie: document.getElementById('storeGridLingerie'),
      underwear: document.getElementById('storeGridUnderwear'),
      pyjamas: document.getElementById('storeGridPyjamas'),
      nightwear: document.getElementById('storeGridNightwear'),
    };
    if (!grids.lingerie && !grids.underwear && !grids.pyjamas && !grids.nightwear) return;

    const setGridStatus = (el, message) => {
      if (!el) return;
      el.innerHTML = `<div class="store-empty" role="status" aria-live="polite">${String(message || '')}</div>`;
    };

    if (!API_BASE) {
      Object.values(grids).forEach((el) => setGridStatus(el, 'Store is not connected.'));
      return;
    }

    // Always clear any existing static HTML so public === admin.
    Object.values(grids).forEach((el) => setGridStatus(el, 'Loading products…'));

    try {
      const store = await fetchJson(`${API_BASE}/api/content/store`, { method: 'GET' });
      const products = Array.isArray(store?.products) ? store.products : [];
      const byCat = { lingerie: [], underwear: [], pyjamas: [], nightwear: [] };
      for (const p of products) {
        const cat = String(p?.category || '').toLowerCase();
        if (byCat[cat]) byCat[cat].push(p);
      }

      Object.keys(byCat).forEach((cat) => {
        const el = grids[cat];
        if (!el) return;
        if (!byCat[cat].length) {
          setGridStatus(el, 'No products in this category yet.');
          return;
        }
        el.innerHTML = byCat[cat].map(buildProductCardHtml).join('');
      });

      // Wire up front/back swap on newly rendered cards.
      initProductCardImageSwap();
    } catch {
      Object.values(grids).forEach((el) => setGridStatus(el, 'Unable to load products right now. Please refresh.'));
    }
  };

  const initProductCardImageSwap = () => {
    const cards = Array.from(document.querySelectorAll('.product-card.has-back'));
    for (const card of cards) {
      if (card.dataset.swapInit === '1') continue;
      card.dataset.swapInit = '1';

      const front = card.querySelector('img[data-role="frontImg"]');
      const back = card.querySelector('img[data-role="backImg"]');
      const toggle = card.querySelector('[data-role="swapToggle"]');
      const prev = card.querySelector('[data-role="swapPrev"]');
      const next = card.querySelector('[data-role="swapNext"]');

      if (!(front instanceof HTMLImageElement) || !(back instanceof HTMLImageElement)) continue;

      let showingBack = false;
      const apply = () => {
        front.style.opacity = showingBack ? '0' : '1';
        back.style.opacity = showingBack ? '1' : '0';
        if (toggle) toggle.querySelector('span') && (toggle.querySelector('span').textContent = showingBack ? 'Front' : 'Back');
      };

      const flip = () => {
        showingBack = !showingBack;
        apply();
      };

      toggle?.addEventListener('click', (e) => {
        e.preventDefault();
        flip();
      });

      prev?.addEventListener('click', (e) => {
        e.preventDefault();
        flip();
      });

      next?.addEventListener('click', (e) => {
        e.preventDefault();
        flip();
      });

      // Basic swipe support on touch devices.
      let startX = 0;
      let startY = 0;
      let tracking = false;
      const onTouchStart = (e) => {
        const t = e.touches?.[0];
        if (!t) return;
        tracking = true;
        startX = t.clientX;
        startY = t.clientY;
      };
      const onTouchEnd = (e) => {
        if (!tracking) return;
        tracking = false;
        const t = e.changedTouches?.[0];
        if (!t) return;
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) < 28 || Math.abs(dx) < Math.abs(dy)) return;
        // swipe left/right flips
        flip();
      };

      const imgBtn = card.querySelector('.product-card__imgBtn');
      imgBtn?.addEventListener('touchstart', onTouchStart, { passive: true });
      imgBtn?.addEventListener('touchend', onTouchEnd, { passive: true });

      // Initial state
      apply();
    }
  };

  // For static store.html (when API is unavailable), still enable swapping.
  try {
    initProductCardImageSwap();
  } catch {
    // ignore
  }

  const buildGalleryItemHtml = (it) => {
    const id = String(it?.id || '').trim() || `post-${Math.random().toString(16).slice(2)}`;
    const type = String(it?.type || 'image') === 'video' ? 'video' : 'image';
    const caption = String(it?.caption || '').trim();
    const src = resolveMediaUrl(it?.src);

    // If media is cleared, don't render a broken tile.
    if (!src) return '';

    if (type === 'video') {
      return `
<article class="ig-post" id="${id}" data-caption="${caption.replace(/"/g, '&quot;')}" data-type="video">
  <div class="ig-post__frame">
    <video class="ig-post__media" playsinline muted loop preload="metadata" crossorigin="anonymous">
      <source src="${src}" type="video/mp4" />
    </video>
    <button class="ig-post__play" type="button" aria-label="Play video">
      <i class="fa-solid fa-play" aria-hidden="true"></i>
    </button>
  </div>
  <div class="ig-post__meta">
    <div class="ig-post__icons" aria-label="Post actions">
      <button class="ig-ico" type="button" aria-label="Like"><i class="fa-regular fa-heart" aria-hidden="true"></i></button>
      <button class="ig-ico" type="button" aria-label="Comment"><i class="fa-regular fa-comment" aria-hidden="true"></i></button>
      <button class="ig-ico" type="button" aria-label="Share"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button>
    </div>
    <p class="ig-post__caption">${caption.replace(/</g, '&lt;')}</p>
    <button class="btn btn--card ig-post__inquiry" type="button" data-inquiry="${id}">Make inquiry</button>
  </div>
</article>
`.trim();
    }

    return `
<article class="ig-post" id="${id}" data-caption="${caption.replace(/"/g, '&quot;')}" data-type="image">
  <div class="ig-post__frame">
    <img class="ig-post__media" src="${src}" alt="${caption.replace(/"/g, '&quot;')}" loading="lazy" />
  </div>
  <div class="ig-post__meta">
    <div class="ig-post__icons" aria-label="Post actions">
      <button class="ig-ico" type="button" aria-label="Like"><i class="fa-regular fa-heart" aria-hidden="true"></i></button>
      <button class="ig-ico" type="button" aria-label="Comment"><i class="fa-regular fa-comment" aria-hidden="true"></i></button>
      <button class="ig-ico" type="button" aria-label="Share"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button>
    </div>
    <p class="ig-post__caption">${caption.replace(/</g, '&lt;')}</p>
    <button class="btn btn--card ig-post__inquiry" type="button" data-inquiry="${id}">Make inquiry</button>
  </div>
</article>
`.trim();
  };

  const loadGalleryContent = async () => {
    const grid = document.getElementById('igGrid');
    if (!grid) return;
    if (!API_BASE) return;

    const setGridStatus = (message) => {
      grid.innerHTML = `<div class="store-empty" role="status" aria-live="polite">${String(message || '')}</div>`;
    };

    // Always clear any existing static HTML so public === admin.
    setGridStatus('Loading gallery…');
    try {
      const gallery = await fetchJson(`${API_BASE}/api/content/gallery`, { method: 'GET' });
      const items = Array.isArray(gallery?.items) ? gallery.items : [];
      if (!items.length) {
        setGridStatus('No gallery items yet.');
        return;
      }
      grid.innerHTML = items.map(buildGalleryItemHtml).join('') || '';
    } catch {
      setGridStatus('Unable to load gallery right now. Please refresh.');
    }
  };

  const refreshDynamicContent = () => {
    loadHomeContent();
    loadStoreContent();
    loadGalleryContent();

    // Best-effort posters from video frames (no static Pic.png).
    try {
      document.querySelectorAll('video.ig-post__media, video.video-band__video').forEach((v) => {
        setPosterFromVideoFrame(v).catch(() => null);
      });
    } catch {
      // ignore
    }
  };

  refreshDynamicContent();
  window.addEventListener('focus', refreshDynamicContent);
  window.addEventListener('pageshow', refreshDynamicContent);
})();
