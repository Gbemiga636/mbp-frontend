(() => {
  const inferredLocalApiBase =
    !window.MBP_API_BASE &&
    (window.location.protocol === 'file:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1')
      ? 'http://localhost:4000'
      : '';

  const API_BASE = String(window.MBP_API_BASE || inferredLocalApiBase).replace(/\/$/, '');

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

  // Never let the browser "help" by restoring to an unexpected place after reload.
  try {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  } catch {
    // ignore
  }

  const SCROLL_SNAPSHOT_KEY = 'mbp_admin_scroll_snapshot_v1';
  const LAST_ANCHOR_KEY = 'mbp_admin_last_anchor_v1';

  const cssEscape = (value) => {
    try {
      if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
    } catch {
      // ignore
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, (m) => `\\${m}`);
  };

  const saveScrollSnapshot = ({ anchorSelector = '', page = '', extra = {} } = {}) => {
    try {
      const x = window.scrollX || 0;
      const y = window.scrollY || 0;
      const anchorEl = anchorSelector ? document.querySelector(anchorSelector) : null;
      const anchorTop = anchorEl ? anchorEl.getBoundingClientRect().top : null;
      const snap = {
        ts: Date.now(),
        x,
        y,
        page,
        anchorSelector,
        anchorTop,
        ...extra,
      };
      window.sessionStorage.setItem(SCROLL_SNAPSHOT_KEY, JSON.stringify(snap));
    } catch {
      // ignore
    }
  };

  const setLastAnchor = ({ anchorSelector = '', page = '', extra = {} } = {}) => {
    const sel = String(anchorSelector || '').trim();
    if (!sel) return;
    try {
      window.sessionStorage.setItem(
        LAST_ANCHOR_KEY,
        JSON.stringify({ ts: Date.now(), page: String(page || ''), anchorSelector: sel, extra: extra || {} })
      );
    } catch {
      // ignore
    }
  };

  const getLastAnchor = () => {
    try {
      const raw = window.sessionStorage.getItem(LAST_ANCHOR_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const trackAnchorFromElement = (el) => {
    const page = document.body?.getAttribute('data-admin-page') || '';
    const node = el instanceof HTMLElement ? el : null;
    if (!node) return;

    // Hero upload/save.
    if (node.closest('#heroUpload') || node.closest('#heroSave') || node.closest('#heroVideo')) {
      setLastAnchor({ page, anchorSelector: '#heroSave', extra: { reason: 'hero' } });
      return;
    }

    // Item editors.
    const item = node.closest('.admin-item[data-id]');
    if (!item) return;
    const id = item.getAttribute('data-id') || '';
    if (!id) return;

    // Prefer the per-item save button as an anchor.
    const saveBtn = item.querySelector('button[data-action$="-save"], button[data-action="featured-save"], button[data-action="store-save"], button[data-action="gallery-save"]');
    if (saveBtn) {
      setLastAnchor({ page, anchorSelector: `.admin-item[data-id="${cssEscape(id)}"] button[data-action$="-save"], .admin-item[data-id="${cssEscape(id)}"] button[data-action="featured-save"], .admin-item[data-id="${cssEscape(id)}"] button[data-action="store-save"], .admin-item[data-id="${cssEscape(id)}"] button[data-action="gallery-save"]`, extra: { itemId: id, reason: 'item' } });
      return;
    }

    // Fallback: anchor to the item itself.
    setLastAnchor({ page, anchorSelector: `.admin-item[data-id="${cssEscape(id)}"]`, extra: { itemId: id, reason: 'item-fallback' } });
  };

  const restoreScrollSnapshot = ({ maxAgeMs = 20000 } = {}) => {
    let snap = null;
    try {
      const raw = window.sessionStorage.getItem(SCROLL_SNAPSHOT_KEY);
      if (!raw) return;
      snap = JSON.parse(raw);
    } catch {
      return;
    }
    if (!snap || !snap.ts || Date.now() - snap.ts > maxAgeMs) return;

    // Allow programmatic scroll during restore; otherwise no-auto-scroll will snap back.
    try {
      window.__mbpNoAutoScroll?.allowFor?.(3500);
    } catch {
      // ignore
    }

    const triesMax = 24;
    let tries = 0;
    let lastAppliedY = null;

    const attempt = () => {
      tries += 1;
      try {
        // First restore to the last known scroll position.
        window.scrollTo(Number(snap.x) || 0, Number(snap.y) || 0);

        // Then (if we have an anchor), adjust so the same element sits at the same viewport top offset.
        if (snap.anchorSelector && typeof snap.anchorTop === 'number') {
          const anchorEl = document.querySelector(snap.anchorSelector);
          if (anchorEl) {
            const currentTop = anchorEl.getBoundingClientRect().top;
            const delta = currentTop - snap.anchorTop;
            if (Math.abs(delta) > 1) {
              window.scrollTo(window.scrollX || 0, (window.scrollY || 0) + delta);
            }
          }
        }

        // Keep the guard armed during initial layout reflows.
        armScrollGuard(window.scrollX || 0, window.scrollY || 0, 2200);

        // Tell the no-auto-scroll guard the new "truth" so it doesn't snap back.
        try {
          window.__mbpNoAutoScroll?.sync?.();
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }

      const yNow = window.scrollY || 0;
      if (lastAppliedY !== null && Math.abs(yNow - lastAppliedY) < 1) {
        return;
      }
      lastAppliedY = yNow;

      if (tries < triesMax) window.requestAnimationFrame(attempt);
    };

    // Try a few times; content/images can shift after load.
    window.requestAnimationFrame(attempt);

    // Clear snapshot so it doesn't "stick" forever.
    window.setTimeout(() => {
      try {
        window.sessionStorage.removeItem(SCROLL_SNAPSHOT_KEY);
      } catch {
        // ignore
      }
    }, 5000);
  };

  // Always keep a recent snapshot in case a dev live-reload forces refresh.
  window.addEventListener(
    'beforeunload',
    () => {
      const page = document.body?.getAttribute('data-admin-page') || '';
      const last = getLastAnchor();
      saveScrollSnapshot({
        page,
        anchorSelector: String(last?.anchorSelector || ''),
        extra: { ...(last?.extra || {}), reason: (last?.extra?.reason || 'beforeunload') },
      });
    },
    { capture: true }
  );

  // Track the last item the user interacted with so we can restore after reload.
  document.addEventListener(
    'click',
    (e) => {
      try {
        trackAnchorFromElement(e.target);
      } catch {
        // ignore
      }
    },
    true
  );
  document.addEventListener(
    'change',
    (e) => {
      try {
        trackAnchorFromElement(e.target);
      } catch {
        // ignore
      }
    },
    true
  );

  const tokenKey = 'mbp_admin_token';

  const getToken = () => window.localStorage.getItem(tokenKey) || '';
  const setToken = (t) => window.localStorage.setItem(tokenKey, t);
  const clearToken = () => window.localStorage.removeItem(tokenKey);

  const authHeaders = () => {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': options.body instanceof FormData ? undefined : 'application/json',
        ...(options.headers || {}),
      },
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg = data?.error || data?.message || `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  };

  const requireAuthOnPage = async () => {
    const needsAuth = document.body?.getAttribute('data-admin-auth') === 'true';
    if (!needsAuth) return;

    const t = getToken();
    if (!t) {
      window.location.href = 'login.html';
      return;
    }

    try {
      await fetchJson(`${API_BASE}/api/admin/me`, { headers: authHeaders() });
    } catch {
      clearToken();
      window.location.href = 'login.html';
    }
  };

  const wireLogout = () => {
    const btn = document.getElementById('adminLogout');
    btn?.addEventListener('click', (e) => {
      e.preventDefault();
      clearToken();
      window.location.href = 'login.html';
    });
  };

  const setNotice = (el, { message = '', isError = false } = {}) => {
    if (!el) return;
    if (!message) {
      el.textContent = '';
      el.classList.remove('notice--error');
      el.classList.add('notice--empty');
      return;
    }
    el.classList.remove('notice--empty');
    el.textContent = message;
    el.classList.toggle('notice--error', Boolean(isError));
  };

  const setButtonBusy = (btn, isBusy) => {
    if (!btn) return;
    btn.toggleAttribute('data-busy', Boolean(isBusy));
    btn.disabled = Boolean(isBusy);
  };

  const setInlineBusy = (container, role, isBusy, label = '') => {
    if (!container) return;
    const el = container.querySelector(`[data-role="${role}"]`);
    if (!el) return;
    if (label) {
      const text = el.querySelector('[data-role="busyText"]');
      if (text) text.textContent = label;
    }
    const busy = Boolean(isBusy);
    el.hidden = !busy;
    // Some browsers/extensions behave oddly with [hidden]; also force display.
    el.style.display = busy ? 'inline-flex' : '';
  };

  const preserveScroll = async (fn) => {
    const x = window.scrollX;
    const y = window.scrollY;
    const out = await fn();
    try {
      window.scrollTo(x, y);
    } catch {
      // ignore
    }
    return out;
  };

  // Guard against any unexpected browser scroll adjustments (focus, viewport resize,
  // scroll anchoring, etc). We can arm this for a short window after actions.
  const armScrollGuard = (x, y, ms = 1500) => {
    window.__mbpScrollGuard = {
      x: Number.isFinite(x) ? x : window.scrollX || 0,
      y: Number.isFinite(y) ? y : window.scrollY || 0,
      until: Date.now() + ms,
    };
  };

  const installScrollGuard = (() => {
    let installed = false;
    let enforcing = false;

    const enforce = () => {
      const g = window.__mbpScrollGuard;
      if (!g || Date.now() > g.until) return;
      if (enforcing) return;
      const dx = Math.abs((window.scrollX || 0) - g.x);
      const dy = Math.abs((window.scrollY || 0) - g.y);
      if (dx < 2 && dy < 2) return;
      enforcing = true;
      window.requestAnimationFrame(() => {
        try {
          window.scrollTo(g.x, g.y);
        } catch {
          // ignore
        }
        enforcing = false;
      });
    };

    return () => {
      if (installed) return;
      installed = true;
      window.addEventListener('scroll', enforce, { passive: true });
      window.addEventListener('resize', enforce);
      window.addEventListener('focus', enforce);
      document.addEventListener('focusin', enforce);
      document.addEventListener('visibilitychange', enforce);
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', enforce);
        window.visualViewport.addEventListener('scroll', enforce);
      }
    };
  })();

  const withScrollLock = async (y, fn) => {
    const y0 = Number.isFinite(y) ? y : window.scrollY || 0;
    const x0 = window.scrollX || 0;
    const body = document.body;
    if (!body) return await fn();

    // Allow internal helpers to restore scroll without being reverted by the
    // no-auto-scroll guard (file pickers and uploads often trigger focus/scroll).
    try {
      window.__mbpNoAutoScroll?.allowFor?.(4500);
    } catch {
      // ignore
    }

    installScrollGuard();
    armScrollGuard(x0, y0, 2000);

    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflowY: body.style.overflowY,
    };

    // Freeze scroll position.
    body.style.position = 'fixed';
    body.style.top = `-${y0}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflowY = 'scroll';

    try {
      return await fn();
    } finally {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflowY = prev.overflowY;

      // Restore scroll exactly.
      try {
        window.scrollTo(x0, y0);
      } catch {
        // ignore
      }

      // Tell the no-auto-scroll guard the new truth.
      try {
        window.__mbpNoAutoScroll?.sync?.();
      } catch {
        // ignore
      }

      // Keep enforcing for a short window after we unlock.
      armScrollGuard(x0, y0, 2000);
    }
  };

  // Prevent any automatic/programmatic scroll in admin pages.
  // Only allow scroll movement shortly after user intent (wheel/touch/keyboard/mouse).
  const installNoAutoScroll = (() => {
    let installed = false;
    let allowUntil = 0;
    let restoring = false;
    let lastX = 0;
    let lastY = 0;

    const allowFor = (ms) => {
      allowUntil = Date.now() + ms;
    };

    const syncLastToCurrent = () => {
      lastX = window.scrollX || 0;
      lastY = window.scrollY || 0;
    };

    const isUserScrollAllowed = () => Date.now() < allowUntil;

    const onUserIntent = () => {
      // Give enough time for momentum/inertia scroll to complete.
      allowFor(1800);
    };

    const onKeydown = (e) => {
      const k = e.key;
      // Keys that commonly scroll.
      if (
        k === 'ArrowUp' ||
        k === 'ArrowDown' ||
        k === 'PageUp' ||
        k === 'PageDown' ||
        k === 'Home' ||
        k === 'End' ||
        k === ' ' ||
        k === 'Spacebar'
      ) {
        onUserIntent();
      }
    };

    const onScroll = () => {
      if (restoring) return;
      const x = window.scrollX || 0;
      const y = window.scrollY || 0;

      // If user is actively scrolling, accept and update last-known.
      if (isUserScrollAllowed()) {
        lastX = x;
        lastY = y;
        return;
      }

      // Otherwise, revert any movement.
      const dx = Math.abs(x - lastX);
      const dy = Math.abs(y - lastY);
      if (dx < 2 && dy < 2) return;
      restoring = true;
      window.requestAnimationFrame(() => {
        try {
          window.scrollTo(lastX, lastY);
        } catch {
          // ignore
        }
        restoring = false;
      });
    };

    return () => {
      if (installed) return;
      installed = true;

      syncLastToCurrent();

      // Let internal helpers (like reload restore) temporarily allow programmatic scroll.
      try {
        window.__mbpNoAutoScroll = {
          allowFor,
          sync: syncLastToCurrent,
        };
      } catch {
        // ignore
      }

      window.addEventListener('wheel', onUserIntent, { passive: true });
      window.addEventListener('touchstart', onUserIntent, { passive: true });
      window.addEventListener('touchmove', onUserIntent, { passive: true });
      window.addEventListener('mousedown', onUserIntent, { passive: true });
      window.addEventListener('keydown', onKeydown);
      window.addEventListener('scroll', onScroll, { passive: true });

      // If focus changes cause scroll, block it (unless user just interacted).
      window.addEventListener('focus', onScroll);
      document.addEventListener('focusin', onScroll);
      document.addEventListener('visibilitychange', onScroll);

      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', onScroll);
        window.visualViewport.addEventListener('scroll', onScroll);
      }
    };
  })();

  // Store editor: keep "uploaded but not saved" images persistent across any accidental reload.
  const STORE_PENDING_IMAGES_KEY = 'mbp_store_pending_images_v1';
  const getPendingStoreImages = () => {
    try {
      const raw = window.sessionStorage.getItem(STORE_PENDING_IMAGES_KEY);
      const obj = raw ? JSON.parse(raw) : null;
      return obj && typeof obj === 'object' ? obj : {};
    } catch {
      return {};
    }
  };
  const setPendingStoreImage = (id, url) => {
    if (!id) return;
    try {
      const map = getPendingStoreImages();
      map[id] = String(url || '');
      window.sessionStorage.setItem(STORE_PENDING_IMAGES_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  };
  const clearPendingStoreImage = (id) => {
    if (!id) return;
    try {
      const map = getPendingStoreImages();
      delete map[id];
      window.sessionStorage.setItem(STORE_PENDING_IMAGES_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  };
  const applyPendingStoreImagesToList = (listEl) => {
    if (!listEl) return;
    const map = getPendingStoreImages();
    const ids = Object.keys(map || {});
    if (!ids.length) return;

    for (const id of ids) {
      const url = map[id];
      if (!url) continue;
      const item = listEl.querySelector(`.admin-item[data-id="${cssEscape(id)}"]`);
      if (!item) continue;
      const imgField = item.querySelector('[data-field="image"]');
      if (imgField) imgField.value = url;
      setInlinePreview(item, url);
    }
  };

  // Store add-form draft: keep unsaved new-product fields (including uploaded image) across reload.
  const STORE_ADD_DRAFT_KEY = 'mbp_store_add_draft_v1';
  const readStoreAddDraft = () => {
    try {
      const raw = window.sessionStorage.getItem(STORE_ADD_DRAFT_KEY);
      const d = raw ? JSON.parse(raw) : null;
      return d && typeof d === 'object' ? d : null;
    } catch {
      return null;
    }
  };
  const writeStoreAddDraft = (draft) => {
    try {
      window.sessionStorage.setItem(STORE_ADD_DRAFT_KEY, JSON.stringify(draft || {}));
    } catch {
      // ignore
    }
  };
  const clearStoreAddDraft = () => {
    try {
      window.sessionStorage.removeItem(STORE_ADD_DRAFT_KEY);
    } catch {
      // ignore
    }
  };
  const captureStoreAddDraft = (addForm) => {
    if (!addForm) return;
    const draft = {
      category: addForm.querySelector('[name="category"]')?.value || 'lingerie',
      price: addForm.querySelector('[name="price"]')?.value || '',
      name: addForm.querySelector('[name="name"]')?.value || '',
      image: addForm.querySelector('[name="image"]')?.value || '',
      imageBack: addForm.querySelector('[name="imageBack"]')?.value || '',
      desc: addForm.querySelector('[name="desc"]')?.value || '',
      sizes: addForm.querySelector('[name="sizes"]')?.value || '',
    };
    writeStoreAddDraft(draft);
  };
  const restoreStoreAddDraft = (addForm) => {
    if (!addForm) return;
    const d = readStoreAddDraft();
    if (!d) return;

    const setVal = (sel, v) => {
      const el = addForm.querySelector(sel);
      if (!el) return;
      el.value = v;
    };

    if (typeof d.category === 'string') setVal('[name="category"]', d.category);
    if (typeof d.price === 'string') setVal('[name="price"]', d.price);
    if (typeof d.name === 'string') setVal('[name="name"]', d.name);
    if (typeof d.image === 'string') setVal('[name="image"]', d.image);
    if (typeof d.imageBack === 'string') setVal('[name="imageBack"]', d.imageBack);
    if (typeof d.desc === 'string') setVal('[name="desc"]', d.desc);
    if (typeof d.sizes === 'string') setVal('[name="sizes"]', d.sizes);

    const thumb = addForm.querySelector('[data-role="addThumb"]');
    const img = String(d.image || '');
    if (thumb) {
      const u = img ? previewUrl(img) : '';
      thumb.innerHTML = u
        ? `<img src="${u}" alt="" style="width:100%; height:100%; object-fit:cover; display:block;" />`
        : `<div class="admin-mini" style="padding:10px;">No image</div>`;
    }
  };
  const rememberScrollBeforeFilePicker = (rootEl) => {
    if (!rootEl) return;
    // Capture scroll position BEFORE the file picker opens (click/touchstart).
    const handler = (e) => {
      const input = e.target?.closest?.('input[type="file"]');
      if (!(input instanceof HTMLInputElement)) return;
      input.dataset.scrollY = String(window.scrollY || 0);

      // A file picker is user intent; allow scroll restore shortly after.
      try {
        window.__mbpNoAutoScroll?.allowFor?.(4500);
      } catch {
        // ignore
      }
    };
    rootEl.addEventListener('click', handler, true);
    rootEl.addEventListener('touchstart', handler, true);
    rootEl.addEventListener('mousedown', handler, true);
  };
  // Debug marker: lets us confirm you are on the latest admin.js build.
  document.documentElement.dataset.mbpAdminBuild = '20260107_1';

  // Gallery add-form draft: keep unsaved new-item fields (including uploaded media URL) across reload.
  const GALLERY_ADD_DRAFT_KEY = 'mbp_gallery_add_draft_v1';
  const readGalleryAddDraft = () => {
    try {
      const raw = window.sessionStorage.getItem(GALLERY_ADD_DRAFT_KEY);
      const d = raw ? JSON.parse(raw) : null;
      return d && typeof d === 'object' ? d : null;
    } catch {
      return null;
    }
  };
  const writeGalleryAddDraft = (draft) => {
    try {
      window.sessionStorage.setItem(GALLERY_ADD_DRAFT_KEY, JSON.stringify(draft || {}));
    } catch {
      // ignore
    }
  };
  const clearGalleryAddDraft = () => {
    try {
      window.sessionStorage.removeItem(GALLERY_ADD_DRAFT_KEY);
    } catch {
      // ignore
    }
  };
  const captureGalleryAddDraft = (addForm) => {
    if (!addForm) return;
    const draft = {
      type: addForm.querySelector('[name="type"]')?.value || 'image',
      src: addForm.querySelector('[name="src"]')?.value || '',
      caption: addForm.querySelector('[name="caption"]')?.value || '',
    };
    writeGalleryAddDraft(draft);
  };
  const restoreGalleryAddDraft = (addForm) => {
    if (!addForm) return;
    const d = readGalleryAddDraft();
    if (!d) return;

    const setVal = (sel, v) => {
      const el = addForm.querySelector(sel);
      if (!el) return;
      el.value = v;
    };

    if (typeof d.type === 'string') setVal('[name="type"]', d.type);
    if (typeof d.src === 'string') setVal('[name="src"]', d.src);
    if (typeof d.caption === 'string') setVal('[name="caption"]', d.caption);

    const thumb = addForm.querySelector('[data-role="addThumb"]');
    const kind = String(d.type || 'image').toLowerCase() === 'video' ? 'video' : 'image';
    const src = String(d.src || '');
    if (thumb) {
      const u = src ? previewUrl(src) : '';
      if (!u) {
        thumb.innerHTML = `<div class="admin-mini" style="padding:10px;">No media</div>`;
      } else if (kind === 'video') {
        thumb.innerHTML = `<video src="${u}" style="width:100%; height:100%; object-fit:cover; display:block;" muted playsinline preload="metadata"></video>`;
      } else {
        thumb.innerHTML = `<img src="${u}" alt="" style="width:100%; height:100%; object-fit:cover; display:block;" />`;
      }
    }
  };

  const scrollToItem = (container, id) => {
    if (!container || !id) return;
    const el = container.querySelector(`.admin-item[data-id="${CSS.escape(id)}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'nearest' });
  };

  const scrollBackToItemSoon = (container, id) => {
    if (!container || !id) return;
    window.requestAnimationFrame(() => {
      try {
        scrollToItem(container, id);
      } catch {
        // ignore
      }
    });
  };

  const previewUrl = (src) => {
    const s = String(src || '').trim();
    if (!s) return '';

    // Backend returns upload URLs like /uploads/... (relative). When the admin
    // is hosted on another origin (e.g., GitHub Pages), prefix with API_BASE.
    // Also: many products use "assets/..." (valid on the public site root).
    // From /admin/* pages, that needs to resolve to ../assets/...
    const withAssetsFix = s.startsWith('assets/') ? `../${s}` : s;

    const absolute = withAssetsFix.startsWith('/uploads/') && API_BASE ? `${API_BASE}${withAssetsFix}` : withAssetsFix;

    // Cache-bust previews so overwrite-by-key shows immediately.
    // This is needed for both local /uploads and Cloudinary overwrites.
    const isLikelyCachedMedia =
      absolute.includes('/uploads/') ||
      absolute.includes('res.cloudinary.com/') ||
      absolute.includes('.cloudinary.com/');

    if (isLikelyCachedMedia) {
      const sep = absolute.includes('?') ? '&' : '?';
      return `${absolute}${sep}v=${Date.now()}`;
    }

    return absolute;
  };

  const maybeDownscaleImageFile = async (file) => {
    const f = file;
    if (!f) return f;

    const type = String(f.type || '').toLowerCase();
    const isImage = type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png' || type === 'image/webp';
    if (!isImage) return f;

    // Skip tiny images to avoid unnecessary work.
    if (Number(f.size || 0) < 350 * 1024) return f;

    const MAX_DIM = 1600;
    const QUALITY = 0.82;

    try {
      const bitmap = await createImageBitmap(f);
      const srcW = bitmap.width || 0;
      const srcH = bitmap.height || 0;
      if (!srcW || !srcH) return f;

      const scale = Math.min(1, MAX_DIM / Math.max(srcW, srcH));
      const dstW = Math.max(1, Math.round(srcW * scale));
      const dstH = Math.max(1, Math.round(srcH * scale));

      // If already small enough, keep original.
      if (scale === 1) return f;

      const canvas = document.createElement('canvas');
      canvas.width = dstW;
      canvas.height = dstH;
      const ctx = canvas.getContext('2d', { alpha: type !== 'image/jpeg' });
      if (!ctx) return f;

      ctx.drawImage(bitmap, 0, 0, dstW, dstH);

      const blob = await new Promise((resolve) => {
        const outType = type === 'image/jpg' ? 'image/jpeg' : type;
        canvas.toBlob(
          (b) => resolve(b || null),
          outType,
          outType === 'image/jpeg' || outType === 'image/webp' ? QUALITY : undefined
        );
      });

      if (!blob) return f;
      if (blob.size >= f.size) return f;

      return new File([blob], f.name || 'image', { type: blob.type || type, lastModified: Date.now() });
    } catch {
      return f;
    }
  };

  const uploadFile = async (file, { key = '' } = {}) => {
    const maybeCompressed = await maybeDownscaleImageFile(file);
    const fd = new FormData();
    fd.append('file', maybeCompressed);

    const url = `${API_BASE}/api/admin/upload${key ? `?key=${encodeURIComponent(key)}` : ''}`;
    // Some networks randomly stall DNS/HTTPS; avoid an infinite spinner.
    // Videos can take longer, so use a generous timeout.
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutMs = 3 * 60 * 1000;
    const t = window.setTimeout(() => {
      try {
        controller?.abort();
      } catch {
        // ignore
      }
    }, timeoutMs);

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          ...authHeaders(),
        },
        body: fd,
        signal: controller?.signal,
      });
    } catch (err) {
      if (String(err?.name || '') === 'AbortError') {
        throw new Error('Upload timed out. Your connection/DNS may be unstable. Try again or switch network.' );
      }
      throw err;
    } finally {
      window.clearTimeout(t);
    }

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
    return data;
  };

  const setInlinePreview = (itemEl, url) => {
    if (!itemEl) return;
    const thumb = itemEl.querySelector('[data-role="thumb"]');
    if (!thumb) return;
    const u = previewUrl(url);
    if (!u) return;

    const typeField = itemEl.querySelector('[data-field="type"]');
    const kind = String(typeField?.value || '').toLowerCase() === 'video' ? 'video' : 'image';

    if (kind === 'video') {
      thumb.innerHTML = `<video src="${u}" style="width:100%; height:100%; object-fit:cover; display:block;" muted playsinline preload="metadata"></video>`;
      return;
    }

    thumb.innerHTML = `<img src="${u}" alt="" style="width:100%; height:100%; object-fit:cover; display:block;" />`;
  };

  // Login page
  const initLogin = () => {
    const form = document.getElementById('adminLoginForm');
    if (!form) return;
    const notice = document.getElementById('adminNotice');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setNotice(notice, { message: '' });

      const email = String(document.getElementById('adminEmail')?.value || '').trim();
      const password = String(document.getElementById('adminPassword')?.value || '').trim();

      try {
        const data = await fetchJson(`${API_BASE}/api/admin/login`, {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setToken(String(data.token || ''));
        window.location.href = 'home.html';
      } catch (err) {
        setNotice(notice, { message: err.message || 'Login failed.', isError: true });
      }
    });
  };

  // Home editor
  const initHome = async () => {
    const page = document.body?.getAttribute('data-admin-page');
    if (page !== 'home') return;

    const MAX_HOME_FEATURED = 5;
    const MAX_HOME_REVIEWS = 5;

    const HOME_PENDING_FEATURED_IMAGES_KEY = 'mbp_home_pending_featured_images_v1';
    const HOME_PENDING_HERO_VIDEO_KEY = 'mbp_home_pending_hero_video_v1';

    const getPendingHomeFeaturedImages = () => {
      try {
        const raw = window.sessionStorage.getItem(HOME_PENDING_FEATURED_IMAGES_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    };

    const setPendingHomeFeaturedImage = (id, url) => {
      try {
        const map = getPendingHomeFeaturedImages();
        map[String(id || '')] = String(url || '');
        window.sessionStorage.setItem(HOME_PENDING_FEATURED_IMAGES_KEY, JSON.stringify(map));
      } catch {
        // ignore
      }
    };

    const clearPendingHomeFeaturedImage = (id) => {
      try {
        const map = getPendingHomeFeaturedImages();
        delete map[String(id || '')];
        window.sessionStorage.setItem(HOME_PENDING_FEATURED_IMAGES_KEY, JSON.stringify(map));
      } catch {
        // ignore
      }
    };

    const applyPendingHomeFeaturedImagesToList = (listEl) => {
      if (!(listEl instanceof HTMLElement)) return;
      const map = getPendingHomeFeaturedImages();
      const items = listEl.querySelectorAll('.admin-item[data-id]');
      items.forEach((itemEl) => {
        const id = itemEl.getAttribute('data-id') || '';
        const url = map[id];
        if (!url) return;
        const imgField = itemEl.querySelector('[data-field="image"]');
        if (imgField) imgField.value = url;
        setInlinePreview(itemEl, url);
      });
    };

    const getPendingHeroVideo = () => {
      try {
        return String(window.sessionStorage.getItem(HOME_PENDING_HERO_VIDEO_KEY) || '');
      } catch {
        return '';
      }
    };

    const setPendingHeroVideo = (url) => {
      try {
        window.sessionStorage.setItem(HOME_PENDING_HERO_VIDEO_KEY, String(url || ''));
      } catch {
        // ignore
      }
    };

    const clearPendingHeroVideo = () => {
      try {
        window.sessionStorage.removeItem(HOME_PENDING_HERO_VIDEO_KEY);
      } catch {
        // ignore
      }
    };

    const notice = document.getElementById('adminNotice');

    const heroInput = document.getElementById('heroVideo');
    const heroSave = document.getElementById('heroSave');
    const heroUpload = document.getElementById('heroUpload');

    const featuredList = document.getElementById('featuredList');
    const featuredAddForm = document.getElementById('featuredAddForm');
    const featuredAddBtn = featuredAddForm?.querySelector('button[type="submit"]') || null;

    const reviewsList = document.getElementById('reviewsList');
    const reviewAddForm = document.getElementById('reviewAddForm');
    const reviewAddBtn = reviewAddForm?.querySelector('button[type="submit"]') || null;

    let featuredCount = 0;
    let reviewsCount = 0;

    const flashSavedTick = (btn) => {
      if (!(btn instanceof HTMLElement)) return;
      const original = btn.dataset.mbpText || btn.textContent || 'Save changes';
      btn.dataset.mbpText = original;

      // Freeze width so label changes never cause layout jitter.
      const prevMinWidth = btn.style.minWidth;
      try {
        btn.style.minWidth = `${Math.ceil(btn.getBoundingClientRect().width)}px`;
      } catch {
        // ignore
      }

      btn.textContent = 'Saved ✓';
      window.setTimeout(() => {
        if (!document.contains(btn)) return;
        btn.textContent = btn.dataset.mbpText || 'Save changes';
        btn.style.minWidth = prevMinWidth;
      }, 1200);
    };

    const renderFeaturedItem = (p) => {
      const sizes = Array.isArray(p?.sizes) ? p.sizes.join(', ') : '';
      const img = String(p.image || '');
      const imgPreview = previewUrl(img);
      return `
<div class="admin-item" data-id="${p.id}">
  <div class="admin-item__top">
    <div>
      <div style="font-weight:900;">${p.name || 'Product'}</div>
      <div class="admin-mini">₦${Number(p.price || 0).toLocaleString('en-NG')} • ${p.image || 'No image'}</div>
    </div>
    <div class="admin-actions">
      <button class="btn" type="button" data-action="featured-save">Save changes</button>
    </div>
  </div>
  <div style="display:flex; gap:12px; align-items:center; margin: 6px 0 12px;">
    <div data-role="thumb" style="width:84px; height:84px; border-radius:14px; overflow:hidden; border:1px solid rgba(18,18,22,0.10); background:rgba(255,255,255,0.75); flex: 0 0 auto;">
      ${img ? `<img src="${imgPreview}" alt="" style="width:100%; height:100%; object-fit:cover; display:block;" />` : `<div class="admin-mini" style="padding:10px;">No image</div>`}
    </div>
    <div class="admin-mini">Upload replaces the same file for this product.</div>
  </div>
  <div class="admin-grid">
    <div class="admin-field">
      <label>Name</label>
      <input type="text" data-field="name" value="${(p.name || '').replace(/"/g, '&quot;')}" />
    </div>
    <div class="admin-field">
      <label>Price (NGN)</label>
      <input type="number" min="0" step="1" data-field="price" value="${Number(p.price || 0)}" />
    </div>
    <div class="admin-field" style="grid-column:1/-1;">
      <label>Image URL</label>
      <input type="text" data-field="image" value="${(p.image || '').replace(/"/g, '&quot;')}" />
      <div class="admin-mini admin-uploadRow" style="margin-top:6px;">Or upload: <input type="file" data-action="featured-upload" accept="image/*" />
        <span class="admin-uploadStatus" data-role="uploadStatus" hidden><span class="spinner" aria-hidden="true"></span><span data-role="busyText">Uploading…</span></span>
      </div>
    </div>
    <div class="admin-field" style="grid-column:1/-1;">
      <label>Description</label>
      <textarea data-field="desc">${p.desc || ''}</textarea>
    </div>
    <div class="admin-field" style="grid-column:1/-1;">
      <label>Available sizes (comma separated)</label>
      <input type="text" data-field="sizes" value="${sizes.replace(/"/g, '&quot;')}" />
    </div>
  </div>
</div>
`.trim();
    };

    const renderReviewItem = (r) => {
      return `
<div class="admin-item" data-id="${r.id}">
  <div class="admin-item__top">
    <div>
      <div style="font-weight:900;">${(r.meta || 'Customer').replace(/</g, '&lt;')}</div>
      <div class="admin-mini">${(r.text || '').slice(0, 72).replace(/</g, '&lt;')}${(r.text || '').length > 72 ? '…' : ''}</div>
    </div>
    <div class="admin-actions">
      <button class="btn" type="button" data-action="review-save">Save changes</button>
    </div>
  </div>
  <div class="admin-grid">
    <div class="admin-field" style="grid-column:1/-1;">
      <label>Review text</label>
      <textarea data-field="text">${r.text || ''}</textarea>
    </div>
    <div class="admin-field" style="grid-column:1/-1;">
      <label>Meta (e.g., Ada — Lagos)</label>
      <input type="text" data-field="meta" value="${(r.meta || '').replace(/"/g, '&quot;')}" />
    </div>
  </div>
</div>
`.trim();
    };

    const load = async () => {
      setNotice(notice, { message: '' });
      const [home, featured, reviews] = await Promise.all([
        fetchJson(`${API_BASE}/api/content/home`, { cache: 'no-store' }),
        fetchJson(`${API_BASE}/api/admin/home/featured`, { headers: authHeaders(), cache: 'no-store' }),
        fetchJson(`${API_BASE}/api/admin/home/reviews`, { headers: authHeaders(), cache: 'no-store' }),
      ]);

      // If user uploaded a new hero video but didn't click Save yet,
      // keep that pending value across reloads.
      const pendingHero = getPendingHeroVideo();
      if (heroInput) heroInput.value = pendingHero || String(home?.heroVideo || '');

      const featuredArr = Array.isArray(featured?.featured) ? featured.featured : [];
      const reviewsArr = Array.isArray(reviews?.reviews) ? reviews.reviews : [];
      featuredCount = featuredArr.length;
      reviewsCount = reviewsArr.length;

      if (featuredList) featuredList.innerHTML = featuredArr.map(renderFeaturedItem).join('') || '<div class="admin-muted">No featured products yet.</div>';
      if (reviewsList) reviewsList.innerHTML = reviewsArr.map(renderReviewItem).join('') || '<div class="admin-muted">No reviews yet.</div>';

      // Restore unsaved featured image previews after a live reload.
      applyPendingHomeFeaturedImagesToList(featuredList);

      if (featuredAddBtn) featuredAddBtn.disabled = featuredCount >= MAX_HOME_FEATURED;
      if (reviewAddBtn) reviewAddBtn.disabled = reviewsCount >= MAX_HOME_REVIEWS;

      // Home is edit-only; disable add forms if they exist.
      if (featuredAddBtn) featuredAddBtn.disabled = true;
      if (reviewAddBtn) reviewAddBtn.disabled = true;
    };

    const saveHeroVideo = async (heroVideo, { fromUpload = false } = {}) => {
      const value = String(heroVideo || '').trim();
      await fetchJson(`${API_BASE}/api/admin/home/hero-video`, {
        method: 'PUT',
        headers: { ...authHeaders() },
        body: JSON.stringify({ heroVideo: value }),
      });
      clearPendingHeroVideo();
      if (heroInput) heroInput.value = value;
      if (fromUpload) {
        setNotice(notice, { message: 'Hero video uploaded & saved ✓' });
      } else {
        setNotice(notice, { message: 'Hero video updated. The site will reflect it on refresh/focus.' });
      }
      flashSavedTick(heroSave);
    };

    heroSave?.addEventListener('click', async () => {
      try {
        setNotice(notice, { message: '' });
        const heroVideo = String(heroInput?.value || '').trim();
        await saveHeroVideo(heroVideo, { fromUpload: false });
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      }
    });

    heroUpload?.addEventListener('change', async () => {
      const file = heroUpload.files?.[0];
      if (!file) return;
      const y0 = Number(heroUpload.dataset.scrollY || window.scrollY || 0);
      try {
        // Snapshot viewport in case a dev live-reload happens mid-upload.
        try {
          saveScrollSnapshot({ page: 'home', anchorSelector: '#heroSave', extra: { reason: 'home-hero-upload' } });
        } catch {
          // ignore
        }

        await withScrollLock(y0, async () => {
          setNotice(notice, { message: 'Uploading video…' });
          setButtonBusy(heroSave, true);
          heroUpload.disabled = true;
          const up = await uploadFile(file, { key: 'home-hero-video' });

          if (heroInput) heroInput.value = up.url;
          setPendingHeroVideo(up.url);

          // Make hero upload behave like other uploads: upload -> saved immediately.
          try {
            await saveHeroVideo(up.url, { fromUpload: true });
          } catch (saveErr) {
            // Keep pending value so user can retry by clicking Save.
            setNotice(notice, {
              message: `Uploaded (${up.provider || 'unknown'}) but could not save yet: ${saveErr.message || 'Save failed.'} You can click “Save hero video” to retry.`,
              isError: true,
            });
          }
        });
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      } finally {
        setButtonBusy(heroSave, false);
        heroUpload.disabled = false;
        heroUpload.value = '';
        heroUpload.dataset.scrollY = '';
      }
    });

    rememberScrollBeforeFilePicker(heroUpload?.parentElement || null);

    featuredList?.addEventListener('change', async (e) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (input.getAttribute('data-action') !== 'featured-upload') return;
      const parent = input.closest('.admin-item');
      const file = input.files?.[0];
      if (!parent || !file) return;

      const y0 = Number(input.dataset.scrollY || window.scrollY || 0);
      const saveBtn = parent.querySelector('button[data-action="featured-save"]');

      // Snapshot viewport in case a dev live-reload happens mid-upload.
      try {
        const id = parent.getAttribute('data-id') || '';
        saveScrollSnapshot({
          page: 'home',
          anchorSelector: id ? `.admin-item[data-id="${cssEscape(id)}"] button[data-action="featured-save"]` : '',
          extra: { featuredId: id, reason: 'home-featured-upload' },
        });
      } catch {
        // ignore
      }

      try {
        await withScrollLock(y0, async () => {
          setNotice(notice, { message: 'Uploading image…' });
          setInlineBusy(parent, 'uploadStatus', true, 'Uploading…');
          setButtonBusy(saveBtn, true);
          input.disabled = true;
          const id = parent.getAttribute('data-id') || '';
          const up = await uploadFile(file, { key: `featured-${id}` });
          const imgField = parent.querySelector('[data-field="image"]');
          if (imgField) imgField.value = up.url;

          setInlinePreview(parent, up.url);
          // Mark as pending until the user clicks Save changes.
          setPendingHomeFeaturedImage(id, up.url);
          setNotice(notice, { message: `Uploaded (${up.provider || 'unknown'}). Click “Save changes” for this product.` });
        });
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      } finally {
        setInlineBusy(parent, 'uploadStatus', false);
        setButtonBusy(saveBtn, false);
        input.disabled = false;
        input.value = '';
        input.dataset.scrollY = '';
      }
    });

    rememberScrollBeforeFilePicker(featuredList);

    featuredList?.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const item = btn.closest('.admin-item');
      const id = item?.getAttribute('data-id') || '';
      if (!id) return;

      // Home is edit-only.
      if (action !== 'featured-save') return;

      const payloadFromItem = () => {
        const name = item.querySelector('[data-field="name"]')?.value || '';
        const price = item.querySelector('[data-field="price"]')?.value || 0;
        const image = item.querySelector('[data-field="image"]')?.value || '';
        const desc = item.querySelector('[data-field="desc"]')?.value || '';
        const sizes = item.querySelector('[data-field="sizes"]')?.value || '';
        return { name, price, image, desc, sizes };
      };

      try {
        setNotice(notice, { message: '' });
        const y0 = window.scrollY || 0;
        const originalText = btn.textContent || 'Save changes';
        btn.dataset.mbpText = originalText;

        await withScrollLock(y0, async () => {
          btn.textContent = 'Saving…';
          try {
            btn.blur();
          } catch {
            // ignore
          }
          setButtonBusy(btn, true);
          await fetchJson(`${API_BASE}/api/admin/home/featured/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { ...authHeaders() },
            body: JSON.stringify(payloadFromItem()),
          });
        });

        // No reload here (prevents scroll jumps). Keep UI as-is.
        clearPendingHomeFeaturedImage(id);
        setNotice(notice, { message: 'Featured piece saved ✓' });
        flashSavedTick(btn);
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      } finally {
        setButtonBusy(btn, false);
      }
    });

    // Home is edit-only; featuredAddForm is intentionally disabled/ignored.

    reviewsList?.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const item = btn.closest('.admin-item');
      const id = item?.getAttribute('data-id') || '';
      if (!id) return;

      // Home is edit-only.
      if (action !== 'review-save') return;

      try {
        setNotice(notice, { message: '' });
        const payload = {
          text: item.querySelector('[data-field="text"]')?.value || '',
          meta: item.querySelector('[data-field="meta"]')?.value || '',
        };

        const y0 = window.scrollY || 0;
        const originalText = btn.textContent || 'Save changes';
        btn.dataset.mbpText = originalText;

        await withScrollLock(y0, async () => {
          btn.textContent = 'Saving…';
          try {
            btn.blur();
          } catch {
            // ignore
          }
          setButtonBusy(btn, true);
          await fetchJson(`${API_BASE}/api/admin/home/reviews/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { ...authHeaders() },
            body: JSON.stringify(payload),
          });
        });

        setNotice(notice, { message: 'Review saved ✓' });
        flashSavedTick(btn);
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      }
    });

    // Home is edit-only; reviewAddForm is intentionally disabled/ignored.

    await load();
  };

  // Store editor
  const initStore = async () => {
    const page = document.body?.getAttribute('data-admin-page');
    if (page !== 'store') return;

    const notice = document.getElementById('adminNotice');
    const listEl = document.getElementById('storeList');
    const addForm = document.getElementById('storeAddForm');

    // Restore unsaved new-product draft after any accidental reload.
    restoreStoreAddDraft(addForm);
    // Keep draft up to date while editing the add form.
    addForm?.addEventListener('input', () => captureStoreAddDraft(addForm));
    addForm?.addEventListener('change', () => captureStoreAddDraft(addForm));

    // Prevent file-picker focus/scroll quirks from jumping to the top.
    rememberScrollBeforeFilePicker(addForm);

    const flashSavedTick = (btn) => {
      if (!(btn instanceof HTMLElement)) return;
      const original = btn.dataset.mbpText || btn.textContent || 'Save changes';
      btn.dataset.mbpText = original;
      btn.textContent = 'Saved ✓';
      window.setTimeout(() => {
        if (!document.contains(btn)) return;
        btn.textContent = btn.dataset.mbpText || 'Save changes';
      }, 1200);
    };

    const renderItem = (p) => {
      const sizes = Array.isArray(p?.sizes) ? p.sizes.join(', ') : '';
      const cat = String(p.category || '').toLowerCase();
      const img = String(p.image || '');
      const imgBack = String(p.imageBack || '');
      const imgPreview = previewUrl(img);
      return `
<div class="admin-item" data-id="${p.id}">
  <div class="admin-item__top">
    <div>
      <div style="font-weight:900;">${p.name || 'Product'}</div>
      <div class="admin-mini">${cat} • ₦${Number(p.price || 0).toLocaleString('en-NG')}</div>
    </div>
    <div class="admin-actions">
      <button class="btn btn--ghost" type="button" data-action="store-delete">Delete</button>
      <button class="btn" type="button" data-action="store-save">Save changes</button>
    </div>
  </div>
  <div style="display:flex; gap:12px; align-items:center; margin: 6px 0 12px;">
    <div data-role="thumb" style="width:84px; height:84px; border-radius:14px; overflow:hidden; border:1px solid rgba(18,18,22,0.10); background:rgba(255,255,255,0.75); flex: 0 0 auto;">
      ${img ? `<img src="${imgPreview}" alt="" style="width:100%; height:100%; object-fit:cover; display:block;" />` : `<div class="admin-mini" style="padding:10px;">No image</div>`}
    </div>
    <div class="admin-mini">Upload replaces the same file for this product.</div>
  </div>
  <div class="admin-grid">
    <div class="admin-field">
      <label>Category</label>
      <select data-field="category">
        <option value="lingerie" ${cat === 'lingerie' ? 'selected' : ''}>Lingerie</option>
        <option value="underwear" ${cat === 'underwear' ? 'selected' : ''}>Underwear</option>
        <option value="pyjamas" ${cat === 'pyjamas' ? 'selected' : ''}>Pyjamas</option>
        <option value="nightwear" ${cat === 'nightwear' ? 'selected' : ''}>Nightwear</option>
      </select>
    </div>
    <div class="admin-field">
      <label>Price (NGN)</label>
      <input type="number" min="0" step="1" data-field="price" value="${Number(p.price || 0)}" />
    </div>
    <div class="admin-field" style="grid-column:1/-1;">
      <label>Name</label>
      <input type="text" data-field="name" value="${(p.name || '').replace(/"/g, '&quot;')}" />
    </div>
    <div class="admin-field" style="grid-column:1/-1;">
      <label>Front Image URL</label>
      <input type="text" data-field="image" value="${(p.image || '').replace(/"/g, '&quot;')}" />
      <div class="admin-mini admin-uploadRow" style="margin-top:6px;">Or upload: <input type="file" data-action="store-upload" accept="image/*" />
        <span class="admin-uploadStatus" data-role="uploadStatus" hidden><span class="spinner" aria-hidden="true"></span><span data-role="busyText">Uploading…</span></span>
      </div>
    </div>
    <div class="admin-field" style="grid-column:1/-1;">
      <label>Back Image URL <span style="font-size:0.85em;color:#888;">(optional)</span></label>
      <input type="text" data-field="imageBack" value="${imgBack.replace(/"/g, '&quot;')}" />
      <div class="admin-mini admin-uploadRow" style="margin-top:6px;">Or upload: <input type="file" data-action="store-upload-back" accept="image/*" />
        <span class="admin-uploadStatus" data-role="uploadStatusBack" hidden><span class="spinner" aria-hidden="true"></span><span data-role="busyText">Uploading…</span></span>
      </div>
    </div>
    <div class="admin-field" style="grid-column:1/-1;">
      <label>Description</label>
      <textarea data-field="desc">${p.desc || ''}</textarea>
    </div>
    <div class="admin-field" style="grid-column:1/-1;">
      <label>Available sizes (comma separated)</label>
      <input type="text" data-field="sizes" value="${sizes.replace(/"/g, '&quot;')}" />
    </div>
  </div>
</div>
`.trim();
    };

    const load = async () => {
      setNotice(notice, { message: '' });
      if (listEl) listEl.innerHTML = `<div class="admin-muted" style="display:flex; gap:10px; align-items:center;"><span class="spinner" aria-hidden="true"></span><span>Loading products…</span></div>`;
      const data = await fetchJson(`${API_BASE}/api/admin/store/products`, { headers: authHeaders(), cache: 'no-store' });
      const products = data?.products || [];
      if (listEl) listEl.innerHTML = products.map(renderItem).join('') || '<div class="admin-muted">No products yet.</div>';

      // If a live-reload happened after upload (before save), restore the unsaved preview.
      applyPendingStoreImagesToList(listEl);
    };

    rememberScrollBeforeFilePicker(listEl);

    listEl?.addEventListener('change', async (e) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement)) return;
      const action = input.getAttribute('data-action');
      if (action !== 'store-upload' && action !== 'store-upload-back') return;
      const parent = input.closest('.admin-item');
      const file = input.files?.[0];
      if (!parent || !file) return;

      const y0 = Number(input.dataset.scrollY || window.scrollY || 0);
      const saveBtn = parent.querySelector('button[data-action="store-save"]');
      // Snapshot current viewport position in case a live-reload happens during upload.
      try {
        const id = parent.getAttribute('data-id') || '';
        saveScrollSnapshot({
          page: 'store',
          anchorSelector: id ? `.admin-item[data-id="${cssEscape(id)}"] button[data-action="store-save"]` : '',
          extra: { productId: id, reason: 'store-upload' },
        });
      } catch {
        // ignore
      }
      try {
        await withScrollLock(y0, async () => {
          setNotice(notice, { message: 'Uploading image…' });
          setInlineBusy(parent, action === 'store-upload-back' ? 'uploadStatusBack' : 'uploadStatus', true, 'Uploading…');
          setButtonBusy(saveBtn, true);
          input.disabled = true;
          const id = parent.getAttribute('data-id') || '';
          const isBack = action === 'store-upload-back';
          const up = await uploadFile(file, { key: isBack ? `store-${id}-back` : `store-${id}` });
          const field = parent.querySelector(isBack ? '[data-field="imageBack"]' : '[data-field="image"]');
          if (field) field.value = up.url;

          // Keep the main thumb as the front image.
          if (!isBack) setInlinePreview(parent, up.url);

          // Mark as "pending" until the user clicks Save changes.
          if (!isBack) setPendingStoreImage(id, up.url);
          setNotice(notice, { message: `Uploaded (${up.provider || 'unknown'}). Click “Save changes” for this product.` });
        });
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      } finally {
        setInlineBusy(parent, action === 'store-upload-back' ? 'uploadStatusBack' : 'uploadStatus', false);
        setButtonBusy(saveBtn, false);
        input.disabled = false;
        input.value = '';
        input.dataset.scrollY = '';
      }
    });

    listEl?.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const item = btn.closest('.admin-item');
      const id = item?.getAttribute('data-id') || '';
      if (!id) return;

      // Snapshot current viewport position in case a live-reload happens mid-request.
      try {
        saveScrollSnapshot({
          page: 'store',
          anchorSelector: `.admin-item[data-id="${cssEscape(id)}"] button[data-action="${action}"]`,
          extra: { productId: id, reason: action },
        });
      } catch {
        // ignore
      }

      const payload = {
        name: item.querySelector('[data-field="name"]')?.value || '',
        price: item.querySelector('[data-field="price"]')?.value || 0,
        image: item.querySelector('[data-field="image"]')?.value || '',
        imageBack: item.querySelector('[data-field="imageBack"]')?.value || '',
        desc: item.querySelector('[data-field="desc"]')?.value || '',
        sizes: item.querySelector('[data-field="sizes"]')?.value || '',
        category: item.querySelector('[data-field="category"]')?.value || '',
      };

      try {
        setNotice(notice, { message: '' });
        if (action === 'store-save') {
          const y0 = window.scrollY || 0;
          const originalText = btn.textContent || 'Save changes';
          btn.dataset.mbpText = originalText;

          // Freeze button width so label changes never cause layout jitter.
          const prevMinWidth = btn.style.minWidth;
          try {
            btn.style.minWidth = `${Math.ceil(btn.getBoundingClientRect().width)}px`;
          } catch {
            // ignore
          }

          await withScrollLock(y0, async () => {
            btn.textContent = 'Saving…';
            try {
              btn.blur();
            } catch {
              // ignore
            }
            setButtonBusy(btn, true);
            await fetchJson(`${API_BASE}/api/admin/store/products/${encodeURIComponent(id)}`, {
              method: 'PUT',
              headers: { ...authHeaders() },
              body: JSON.stringify(payload),
            });
          });

          // Do not reload/re-render the list here; that causes scroll jumps.
          clearPendingStoreImage(id);
          setNotice(notice, { message: 'Changes saved successfully ✓' });
          btn.textContent = 'Saved ✓';
          window.setTimeout(() => {
            if (!document.contains(btn)) return;
            btn.textContent = btn.dataset.mbpText || 'Save changes';
            btn.style.minWidth = prevMinWidth;
          }, 1200);
        }
        if (action === 'store-delete') {
          const y0 = window.scrollY || 0;
          await withScrollLock(y0, async () => {
            setButtonBusy(btn, true);
            await fetchJson(`${API_BASE}/api/admin/store/products/${encodeURIComponent(id)}`, {
              method: 'DELETE',
              headers: { ...authHeaders() },
            });
            // Remove only this item; no reload (avoids scroll jump).
            try {
              item?.remove();
            } catch {
              // ignore
            }
          });
          clearPendingStoreImage(id);
          setNotice(notice, { message: 'Product deleted.' });
        }
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      } finally {
        setButtonBusy(btn, false);
      }
    });

    addForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = addForm.querySelector('button[type="submit"]');
      try {
        setNotice(notice, { message: '' });
        const y0 = window.scrollY || 0;

        // Snapshot viewport in case a dev live-reload happens mid-add.
        try {
          saveScrollSnapshot({ page: 'store', anchorSelector: '#storeAddForm button[type="submit"]', extra: { reason: 'store-add' } });
        } catch {
          // ignore
        }

        const originalText = submitBtn?.textContent || 'Add product';
        if (submitBtn) submitBtn.dataset.mbpText = originalText;

        // Freeze button width so label changes never cause layout jitter.
        const prevMinWidth = submitBtn?.style?.minWidth;
        try {
          if (submitBtn) submitBtn.style.minWidth = `${Math.ceil(submitBtn.getBoundingClientRect().width)}px`;
        } catch {
          // ignore
        }

        const payload = {
          name: addForm.querySelector('[name="name"]')?.value || '',
          price: addForm.querySelector('[name="price"]')?.value || 0,
          image: addForm.querySelector('[name="image"]')?.value || '',
          imageBack: addForm.querySelector('[name="imageBack"]')?.value || '',
          desc: addForm.querySelector('[name="desc"]')?.value || '',
          sizes: addForm.querySelector('[name="sizes"]')?.value || '',
          category: addForm.querySelector('[name="category"]')?.value || '',
        };

        const created = await withScrollLock(y0, async () => {
          if (submitBtn) submitBtn.textContent = 'Adding…';
          setButtonBusy(submitBtn, true);
          return await fetchJson(`${API_BASE}/api/admin/store/products`, {
            method: 'POST',
            headers: { ...authHeaders() },
            body: JSON.stringify(payload),
          });
        });

        // Insert new product immediately without reloading the list.
        if (listEl && created) {
          const html = renderItem(created);
          const isEmpty = Boolean(listEl.querySelector('.loading') || listEl.querySelector('.admin-muted'));
          if (isEmpty) listEl.innerHTML = html;
          else listEl.insertAdjacentHTML('afterbegin', html);

          // If you uploaded an image while adding, clear any pending map for this new id.
          try {
            clearPendingStoreImage(created?.id);
          } catch {
            // ignore
          }
        }

        // Reset the add form after success.
        addForm.reset();
        clearStoreAddDraft();
        const thumb = addForm.querySelector('[data-role="addThumb"]');
        if (thumb) thumb.innerHTML = `<div class="admin-mini" style="padding:10px;">No image</div>`;

        setNotice(notice, { message: 'Product added ✓' });
        if (submitBtn) submitBtn.textContent = 'Added ✓';
        window.setTimeout(() => {
          if (!submitBtn || !document.contains(submitBtn)) return;
          submitBtn.textContent = submitBtn.dataset.mbpText || 'Add product';
          submitBtn.style.minWidth = prevMinWidth || '';
        }, 1200);
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      } finally {
        setButtonBusy(submitBtn, false);
      }
    });

    // Add-form upload: uploads file, fills Image URL field, shows preview.
    addForm?.addEventListener('change', async (e) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement)) return;
      const action = input.getAttribute('data-action');
      if (action !== 'store-add-upload' && action !== 'store-add-upload-back') return;
      const file = input.files?.[0];
      if (!file) return;

      const y0 = Number(input.dataset.scrollY || window.scrollY || 0);
      const submitBtn = addForm.querySelector('button[type="submit"]');
      try {
        await withScrollLock(y0, async () => {
          setNotice(notice, { message: 'Uploading image…' });
          setInlineBusy(addForm, action === 'store-add-upload-back' ? 'addUploadStatusBack' : 'addUploadStatus', true, 'Uploading…');
          setButtonBusy(submitBtn, true);
          input.disabled = true;

          // New product has no ID yet; use a unique key.
          const key = `store-new-${Date.now()}`;
          const isBack = action === 'store-add-upload-back';
          const up = await uploadFile(file, { key: isBack ? `${key}-back` : key });

          const field = addForm.querySelector(isBack ? '[name="imageBack"]' : '[name="image"]');
          if (field) field.value = up.url;

          // Keep the preview thumbnail as the front image.
          if (!isBack) {
            const thumb = addForm.querySelector('[data-role="addThumb"]');
            if (thumb) {
              const u = previewUrl(up.url);
              thumb.innerHTML = u
                ? `<img src="${u}" alt="" style="width:100%; height:100%; object-fit:cover; display:block;" />`
                : `<div class="admin-mini" style="padding:10px;">No image</div>`;
            }
          }

          // Persist draft so a live-reload won't lose the uploaded image preview.
          captureStoreAddDraft(addForm);

          setNotice(notice, { message: `Uploaded (${up.provider || 'unknown'}). Click “Add product”.` });
        });
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      } finally {
        setInlineBusy(addForm, action === 'store-add-upload-back' ? 'addUploadStatusBack' : 'addUploadStatus', false);
        setButtonBusy(submitBtn, false);
        input.disabled = false;
        input.value = '';
        input.dataset.scrollY = '';
      }
    });

    await load();
  };

  // Gallery editor
  const initGallery = async () => {
    const page = document.body?.getAttribute('data-admin-page');
    if (page !== 'gallery') return;

    const notice = document.getElementById('adminNotice');
    const listEl = document.getElementById('galleryList');
    const addForm = document.getElementById('galleryAddForm');

    // Restore unsaved new-gallery draft after any accidental reload.
    restoreGalleryAddDraft(addForm);
    // Keep draft up to date while editing the add form.
    addForm?.addEventListener('input', () => captureGalleryAddDraft(addForm));
    addForm?.addEventListener('change', () => captureGalleryAddDraft(addForm));

    // Prevent file-picker focus/scroll quirks from jumping to the top.
    rememberScrollBeforeFilePicker(addForm);

    const renderItem = (it) => {
      const type = String(it.type || 'image');
      const src = String(it.src || '');
      const srcPreview = previewUrl(src);
      const preview =
        type === 'video'
          ? src
            ? `<video src="${srcPreview}" style="width:100%; height:100%; object-fit:cover; display:block;" muted playsinline preload="metadata"></video>`
            : `<div class="admin-mini" style="padding:10px;">No video</div>`
          : src
            ? `<img src="${srcPreview}" alt="" style="width:100%; height:100%; object-fit:cover; display:block;" />`
            : `<div class="admin-mini" style="padding:10px;">No image</div>`;
      return `
<div class="admin-item" data-id="${it.id}">
  <div class="admin-item__top">
    <div>
      <div style="font-weight:900;">${type.toUpperCase()}</div>
      <div class="admin-mini">${(it.caption || '').slice(0, 72).replace(/</g, '&lt;')}${(it.caption || '').length > 72 ? '…' : ''}</div>
    </div>
    <div class="admin-actions">
      <button class="btn btn--ghost" type="button" data-action="gallery-delete">Delete</button>
      <button class="btn" type="button" data-action="gallery-save">Save changes</button>
    </div>
  </div>

  <div class="admin-grid">
    <div class="admin-field">
      <label>Type</label>
      <select data-field="type">
        <option value="image" ${type === 'image' ? 'selected' : ''}>Image</option>
        <option value="video" ${type === 'video' ? 'selected' : ''}>Video</option>
      </select>
    </div>

    <div class="admin-field">
      <label>Preview</label>
      <div data-role="thumb" style="width:84px; height:84px; border-radius:14px; overflow:hidden; border:1px solid rgba(18,18,22,0.10); background:rgba(255,255,255,0.75);">
        ${preview}
      </div>
    </div>

    <div class="admin-field" style="grid-column:1/-1;">
      <label>Media URL</label>
      <input type="text" data-field="src" value="${(it.src || '').replace(/"/g, '&quot;')}" />
      <div class="admin-mini admin-uploadRow" style="margin-top:6px;">Or upload: <input type="file" data-action="gallery-upload" accept="image/*,video/*" />
        <span class="admin-uploadStatus" data-role="uploadStatus" hidden><span class="spinner" aria-hidden="true"></span><span data-role="busyText">Uploading…</span></span>
      </div>
    </div>

    <div class="admin-field" style="grid-column:1/-1;">
      <label>Caption</label>
      <textarea data-field="caption">${it.caption || ''}</textarea>
    </div>
  </div>
</div>
`.trim();
    };

    const load = async () => {
      if (listEl) listEl.innerHTML = `<div class="admin-muted" style="display:flex; gap:10px; align-items:center;"><span class="spinner" aria-hidden="true"></span><span>Loading gallery…</span></div>`;
      const data = await fetchJson(`${API_BASE}/api/admin/gallery/items`, { headers: authHeaders(), cache: 'no-store' });
      const items = data?.items || [];
      if (listEl) listEl.innerHTML = items.map(renderItem).join('') || '<div class="admin-muted">No gallery items yet.</div>';
    };

    listEl?.addEventListener('change', async (e) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (input.getAttribute('data-action') !== 'gallery-upload') return;
      const parent = input.closest('.admin-item');
      const file = input.files?.[0];
      if (!parent || !file) return;

      const y0 = Number(input.dataset.scrollY || window.scrollY || 0);
      const saveBtn = parent.querySelector('button[data-action="gallery-save"]');

      // Snapshot viewport in case a dev live-reload happens mid-upload.
      try {
        const id = parent.getAttribute('data-id') || '';
        saveScrollSnapshot({
          page: 'gallery',
          anchorSelector: id ? `.admin-item[data-id="${cssEscape(id)}"] button[data-action="gallery-save"]` : '',
          extra: { itemId: id, reason: 'gallery-upload' },
        });
      } catch {
        // ignore
      }

      try {
        await withScrollLock(y0, async () => {
          setNotice(notice, { message: 'Uploading…' });
          setInlineBusy(parent, 'uploadStatus', true, 'Uploading…');
          setButtonBusy(saveBtn, true);
          input.disabled = true;
          const id = parent.getAttribute('data-id') || '';
          const kind = parent.querySelector('[data-field="type"]')?.value || 'image';
          const up = await uploadFile(file, { key: `gallery-${id}-${kind}` });

          const srcField = parent.querySelector('[data-field="src"]');
          if (srcField) srcField.value = up.url;
          setInlinePreview(parent, up.url);
          setNotice(notice, { message: `Uploaded (${up.provider || 'unknown'}). Click “Save changes” for this item.` });
        });
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      } finally {
        setInlineBusy(parent, 'uploadStatus', false);
        setButtonBusy(saveBtn, false);
        input.disabled = false;
        input.value = '';
        input.dataset.scrollY = '';
      }
    });

    rememberScrollBeforeFilePicker(listEl);

    listEl?.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const item = btn.closest('.admin-item');
      const id = item?.getAttribute('data-id') || '';
      if (!id) return;

      const payload = {
        type: item.querySelector('[data-field="type"]')?.value || 'image',
        src: item.querySelector('[data-field="src"]')?.value || '',
        caption: item.querySelector('[data-field="caption"]')?.value || '',
      };

      try {
        setNotice(notice, { message: '' });
        if (action === 'gallery-save') {
          setButtonBusy(btn, true);
          await fetchJson(`${API_BASE}/api/admin/gallery/items/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { ...authHeaders() },
            body: JSON.stringify(payload),
          });
          setNotice(notice, { message: 'Gallery item saved.' });
          await preserveScroll(async () => {
            await load();
            scrollToItem(listEl, id);
          });
        }
        if (action === 'gallery-delete') {
          setButtonBusy(btn, true);
          await fetchJson(`${API_BASE}/api/admin/gallery/items/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { ...authHeaders() },
          });
          setNotice(notice, { message: 'Gallery item deleted.' });
          await preserveScroll(load);
        }
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      } finally {
        setButtonBusy(btn, false);
      }
    });

    addForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        setNotice(notice, { message: '' });
        const submitBtn = addForm.querySelector('button[type="submit"]');
        const y0 = window.scrollY || 0;

        // Snapshot viewport in case a dev live-reload happens mid-add.
        try {
          saveScrollSnapshot({ page: 'gallery', anchorSelector: '#galleryAddForm button[type="submit"]', extra: { reason: 'gallery-add' } });
        } catch {
          // ignore
        }

        const originalText = submitBtn?.textContent || 'Add gallery item';
        if (submitBtn) submitBtn.dataset.mbpText = originalText;

        // Freeze button width so label changes never cause layout jitter.
        const prevMinWidth = submitBtn?.style?.minWidth;
        try {
          if (submitBtn) submitBtn.style.minWidth = `${Math.ceil(submitBtn.getBoundingClientRect().width)}px`;
        } catch {
          // ignore
        }

        const payload = {
          type: addForm.querySelector('[name="type"]')?.value || 'image',
          src: addForm.querySelector('[name="src"]')?.value || '',
          caption: addForm.querySelector('[name="caption"]')?.value || '',
        };

        // Keep draft fresh right before submit.
        captureGalleryAddDraft(addForm);

        const created = await withScrollLock(y0, async () => {
          if (submitBtn) submitBtn.textContent = 'Adding…';
          setButtonBusy(submitBtn, true);
          return await fetchJson(`${API_BASE}/api/admin/gallery/items`, {
            method: 'POST',
            headers: { ...authHeaders() },
            body: JSON.stringify(payload),
          });
        });

        // Insert new item immediately without reloading the whole list.
        if (listEl && created) {
          const html = renderItem(created);
          const isEmpty = Boolean(listEl.querySelector('.loading') || listEl.querySelector('.admin-muted'));
          if (isEmpty) listEl.innerHTML = html;
          else listEl.insertAdjacentHTML('afterbegin', html);
        }

        addForm.reset();
        // Reset add-preview thumbnail if present.
        const thumb = addForm.querySelector('[data-role="addThumb"]');
        if (thumb) thumb.innerHTML = `<div class="admin-mini" style="padding:10px;">No media</div>`;

        clearGalleryAddDraft();

        setNotice(notice, { message: 'Gallery item added ✓' });
        if (submitBtn) submitBtn.textContent = 'Added ✓';
        window.setTimeout(() => {
          if (!submitBtn || !document.contains(submitBtn)) return;
          submitBtn.textContent = submitBtn.dataset.mbpText || 'Add gallery item';
          submitBtn.style.minWidth = prevMinWidth || '';
        }, 1200);
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      } finally {
        const submitBtn = addForm?.querySelector?.('button[type="submit"]');
        setButtonBusy(submitBtn, false);
      }
    });

    // Add-form upload: uploads file, fills Media URL field, shows preview.
    addForm?.addEventListener('change', async (e) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (input.getAttribute('data-action') !== 'gallery-add-upload') return;
      const file = input.files?.[0];
      if (!file) return;

      const y0 = Number(input.dataset.scrollY || window.scrollY || 0);
      const submitBtn = addForm.querySelector('button[type="submit"]');

      // Snapshot viewport in case a dev live-reload happens mid-upload.
      try {
        saveScrollSnapshot({ page: 'gallery', anchorSelector: '#galleryAddForm button[type="submit"]', extra: { reason: 'gallery-add-upload' } });
      } catch {
        // ignore
      }

      try {
        await withScrollLock(y0, async () => {
          setNotice(notice, { message: 'Uploading…' });
          setInlineBusy(addForm, 'addUploadStatus', true, 'Uploading…');
          setButtonBusy(submitBtn, true);
          input.disabled = true;

          const kind = addForm.querySelector('[name="type"]')?.value || 'image';
          const key = `gallery-new-${Date.now()}-${kind}`;
          const up = await uploadFile(file, { key });

          const srcField = addForm.querySelector('[name="src"]');
          if (srcField) srcField.value = up.url;

          const thumb = addForm.querySelector('[data-role="addThumb"]');
          if (thumb) {
            const u = previewUrl(up.url);
            if (String(kind).toLowerCase() === 'video') {
              thumb.innerHTML = u
                ? `<video src="${u}" style="width:100%; height:100%; object-fit:cover; display:block;" muted playsinline preload="metadata"></video>`
                : `<div class="admin-mini" style="padding:10px;">No video</div>`;
            } else {
              thumb.innerHTML = u
                ? `<img src="${u}" alt="" style="width:100%; height:100%; object-fit:cover; display:block;" />`
                : `<div class="admin-mini" style="padding:10px;">No image</div>`;
            }
          }

          setNotice(notice, { message: `Uploaded (${up.provider || 'unknown'}). Click “Add gallery item”.` });
        });

        // Persist draft so a live-reload won't lose the uploaded media preview.
        captureGalleryAddDraft(addForm);
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      } finally {
        setInlineBusy(addForm, 'addUploadStatus', false);
        setButtonBusy(submitBtn, false);
        input.disabled = false;
        input.value = '';
        input.dataset.scrollY = '';
      }
    });

    await load();
  };

  // Orders
  const initOrders = async () => {
    const page = document.body?.getAttribute('data-admin-page');
    if (page !== 'orders') return;

    const notice = document.getElementById('adminNotice');
    const listEl = document.getElementById('ordersList');
    const detailEl = document.getElementById('orderDetail');

    const listCard = listEl?.closest('.admin-card') || null;
    let listScrollY = 0;

    const OPEN_ORDER_KEY = 'mbp_admin_open_order_ref_v1';

    const getOpenRef = () => {
      try {
        return String(window.sessionStorage.getItem(OPEN_ORDER_KEY) || '').trim();
      } catch {
        return '';
      }
    };

    const setOpenRef = (ref) => {
      const r = String(ref || '').trim();
      if (!r) return;
      try {
        window.sessionStorage.setItem(OPEN_ORDER_KEY, r);
      } catch {
        // ignore
      }
    };

    const clearOpenRef = () => {
      try {
        window.sessionStorage.removeItem(OPEN_ORDER_KEY);
      } catch {
        // ignore
      }
    };

    const showList = () => {
      if (detailEl) {
        detailEl.innerHTML = '';
        detailEl.hidden = true;
      }
      if (listCard) listCard.hidden = false;
      clearOpenRef();
      try {
        window.scrollTo(window.scrollX, Number(listScrollY || 0));
      } catch {
        // ignore
      }
    };

    const showDetail = () => {
      if (listCard) listCard.hidden = true;
      if (detailEl) detailEl.hidden = false;
      try {
        window.scrollTo(window.scrollX, 0);
      } catch {
        // ignore
      }
    };

    const renderRow = (o) => {
      const who = o?.customer?.email || o?.customer?.phone || 'Customer';
      const total = Number(o?.totals?.total || 0).toLocaleString('en-NG');
      return `
<div class="admin-item" data-ref="${o.reference}">
  <div class="admin-item__top">
    <div>
      <div style="font-weight:900;">${o.reference}</div>
      <div class="admin-mini">${who} • ₦${total}</div>
    </div>
    <div class="admin-row">
      ${o.unread ? '<span class="admin-pill admin-pill--unread" data-role="pill">Unread</span>' : '<span class="admin-pill" data-role="pill">Read</span>'}
      <button class="btn btn--ghost" type="button" data-action="order-open">Open</button>
    </div>
  </div>
</div>
`.trim();
    };

    const load = async () => {
      const data = await fetchJson(`${API_BASE}/api/admin/orders`, { headers: authHeaders(), cache: 'no-store' });
      const orders = data?.orders || [];
      if (listEl) listEl.innerHTML = orders.map(renderRow).join('') || '<div class="admin-muted">No orders yet.</div>';
    };

    const markRowRead = (ref) => {
      const row = listEl?.querySelector(`.admin-item[data-ref="${CSS.escape(String(ref || ''))}"]`) || null;
      const pill = row?.querySelector('[data-role="pill"]') || null;
      if (!(pill instanceof HTMLElement)) return;
      pill.classList.remove('admin-pill--unread');
      pill.textContent = 'Read';
    };

    const openOrder = async (ref) => {
      try {
        setNotice(notice, { message: '' });
        listScrollY = Number(window.scrollY || 0);
        const data = await fetchJson(`${API_BASE}/api/admin/orders/${encodeURIComponent(ref)}`, { headers: authHeaders(), cache: 'no-store' });
        const o = data?.order;
        if (!o) return;

        setOpenRef(ref);

        const rawItems = Array.isArray(o?.totals?.items)
          ? o.totals.items
          : Array.isArray(o?.items)
            ? o.items
            : [];

        const itemsHtml = rawItems
          .map((it) => {
            const name = String(it?.name || 'Item').replace(/</g, '&lt;');
            const size = String(it?.size || '—').replace(/</g, '&lt;');
            const qty = Number(it?.qty || 1);
            const price = Number(it?.price || 0);
            const line = price * qty;
            return `<div class="admin-mini"><b>${name}</b> • Size: ${size} • Qty: ${qty} • ₦${line.toLocaleString('en-NG')}</div>`;
          })
          .join('');

        const email = String(o?.customer?.email || '').replace(/</g, '&lt;');
        const phone = String(o?.customer?.phone || '').replace(/</g, '&lt;');
        const address = String(o?.customer?.address || '').replace(/</g, '&lt;');
        const createdAt = String(o?.createdAt || '').replace(/</g, '&lt;');

        if (detailEl) {
          detailEl.innerHTML = `
<div class="admin-card">
  <div class="admin-row" style="justify-content: space-between; align-items:center; gap:12px; margin-bottom: 10px;">
    <div>
      <div class="admin-card__title">Order ${String(o.reference || '').replace(/</g, '&lt;')}</div>
      <div class="admin-card__sub">${createdAt}</div>
    </div>
    <button class="btn btn--ghost" type="button" data-action="order-back">Back</button>
  </div>

  <div class="admin-grid">
    <div class="admin-field" style="grid-column:1/-1;">
      <label>Customer</label>
      <div class="notice">${email} • ${phone}<br/>${address || '—'}</div>
    </div>
    <div class="admin-field" style="grid-column:1/-1;">
      <label>Items</label>
      <div class="notice">${itemsHtml || '—'}</div>
    </div>
    <div class="admin-field" style="grid-column:1/-1;">
      <label>Totals</label>
      <div class="notice">Subtotal: ₦${Number(o?.totals?.subtotal || 0).toLocaleString('en-NG')}<br/>Delivery: ₦${Number(o?.totals?.delivery || 0).toLocaleString('en-NG')}<br/><b>Total: ₦${Number(o?.totals?.total || 0).toLocaleString('en-NG')}</b></div>
    </div>
  </div>
</div>
`.trim();
          detailEl.hidden = false;
        }

        markRowRead(ref);
        showDetail();
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      }
    };

    listEl?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action="order-open"]');
      const row = e.target.closest('.admin-item');
      if (!btn && !row) return;
      const ref = row?.getAttribute('data-ref');
      if (!ref) return;
      openOrder(ref);
    });

    detailEl?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action="order-back"]');
      if (!btn) return;
      showList();
    });

    showList();
    await load();

    // If the page reloads (e.g., dev live-reload), restore the opened order.
    const openRef = getOpenRef();
    if (openRef) await openOrder(openRef);
  };

  // Delivery fee
  const initDelivery = async () => {
    const page = document.body?.getAttribute('data-admin-page');
    if (page !== 'delivery') return;

    const notice = document.getElementById('adminNotice');
    const input = document.getElementById('deliveryFee');
    const saveBtn = document.getElementById('deliverySave');

    const load = async () => {
      const data = await fetchJson(`${API_BASE}/api/admin/delivery-fee`, { headers: authHeaders(), cache: 'no-store' });
      if (input) input.value = Number(data?.deliveryFee || 2500);
    };

    saveBtn?.addEventListener('click', async () => {
      try {
        setNotice(notice, { message: '' });
        const deliveryFee = Number(input?.value || 0);
        await fetchJson(`${API_BASE}/api/admin/delivery-fee`, {
          method: 'PUT',
          headers: { ...authHeaders() },
          body: JSON.stringify({ deliveryFee }),
        });
        setNotice(notice, { message: 'Delivery fee updated. The cart will reflect it on refresh/focus.' });
        await load();
      } catch (err) {
        setNotice(notice, { message: err.message, isError: true });
      }
    });

    await load();
  };

  document.addEventListener('DOMContentLoaded', async () => {
    await requireAuthOnPage();
    wireLogout();

    // Make admin pages immune to automatic scroll.
    installNoAutoScroll();

    // If something live-reloaded the page, restore the exact viewport position.
    restoreScrollSnapshot();

    initLogin();
    await initHome();
    await initStore();
    await initGallery();
    await initOrders();
    await initDelivery();
  });
})();
