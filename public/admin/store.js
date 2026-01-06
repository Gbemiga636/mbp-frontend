(() => {
  'use strict';

  const elNotice = document.getElementById('adminNotice');
  const elList = document.getElementById('storeList');
  const elAddForm = document.getElementById('addProductForm');
  const elAddBtn = document.getElementById('addProductBtn');

  let products = [];

  const setNotice = (el, { message = '', isError = false, isSuccess = false } = {}) => {
    if (!el) return;
    el.textContent = message;
    el.className = 'notice';
    if (isError) el.classList.add('notice--error');
    if (isSuccess) el.classList.add('notice--success');
    el.hidden = !message;
  };

  const setButtonBusy = (btn, busy) => {
    if (!btn) return;
    btn.toggleAttribute('data-busy', Boolean(busy));
    btn.disabled = Boolean(busy);
  };

  const showUploadStatus = (card, show, message = '') => {
    const status = card.querySelector('.upload-status');
    if (!status) return;
    status.textContent = message;
    status.hidden = !show;
  };

  const renderThumb = (el, src, { cacheBust = false } = {}) => {
    if (!el) return;
    el.innerHTML = '';
    if (!src) return;

    const img = document.createElement('img');
    img.src = src + (cacheBust ? `?t=${Date.now()}` : '');
    img.alt = 'Product image';
    img.loading = 'lazy';
    el.appendChild(img);
  };

  const loadProducts = async () => {
    try {
      setNotice(elNotice);
      const data = await fetchJson(`${API_BASE}/api/admin/store/products`);
      products = Array.isArray(data?.products) ? data.products : [];
      renderProducts();
    } catch (err) {
      setNotice(elNotice, { message: err.message || 'Failed to load products.', isError: true });
      elList.innerHTML = '<div class="error">Failed to load products.</div>';
    }
  };

  const renderProducts = () => {
    if (!products.length) {
      elList.innerHTML = '<div class="empty">No products yet. Add one above.</div>';
      return;
    }

    elList.innerHTML = products.map(product => `
      <div class="admin-item" data-id="${product.id}">
        <div class="admin-item__thumb">
          <div class="thumb-preview" data-role="thumb"></div>
        </div>
        <div class="admin-item__content">
          <form class="admin-form" data-role="editForm">
            <div class="form-group">
              <label>Name</label>
              <input type="text" name="name" value="${product.name || ''}" required />
            </div>
            <div class="form-group">
              <label>Price (NGN)</label>
              <input type="number" name="price" value="${product.price || 0}" min="0" required />
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea name="desc" rows="3" required>${product.desc || ''}</textarea>
            </div>
            <div class="form-group">
              <label>Sizes (comma-separated)</label>
              <input type="text" name="sizes" value="${Array.isArray(product.sizes) ? product.sizes.join(', ') : ''}" required />
            </div>
            <div class="form-group">
              <label>Category</label>
              <input type="text" name="category" value="${product.category || ''}" required />
            </div>
            <div class="form-group">
              <label>Image</label>
              <input type="file" name="image" accept="image/*" data-role="uploadInput" />
              <div class="upload-status" hidden></div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn" data-role="saveBtn">Save Changes</button>
              <button type="button" class="btn btn--ghost" data-role="deleteBtn">Delete</button>
            </div>
          </form>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    products.forEach(product => {
      const card = elList.querySelector(`[data-id="${product.id}"]`);
      if (!card) return;

      const thumb = card.querySelector('[data-role="thumb"]');
      const form = card.querySelector('[data-role="editForm"]');
      const saveBtn = card.querySelector('[data-role="saveBtn"]');
      const deleteBtn = card.querySelector('[data-role="deleteBtn"]');
      const uploadInput = card.querySelector('[data-role="uploadInput"]');

      // Render initial thumb
      renderThumb(thumb, product.image, { cacheBust: true });

      // Save handler
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSave(card, product.id);
      });

      // Delete handler
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Delete "${product.name}"? This cannot be undone.`)) {
          handleDelete(product.id);
        }
      });

      // Upload handler
      uploadInput.addEventListener('change', async () => {
        const file = uploadInput.files?.[0];
        if (!file) return;

        // Instant local preview
        const localUrl = URL.createObjectURL(file);
        renderThumb(thumb, localUrl);
        card.dataset.pendingUpload = 'true';

        // Clean up URL later
        setTimeout(() => {
          try {
            URL.revokeObjectURL(localUrl);
          } catch {}
        }, 30000);
      });
    });
  };

  const handleSave = async (card, id) => {
    const form = card.querySelector('[data-role="editForm"]');
    const saveBtn = card.querySelector('[data-role="saveBtn"]');
    const uploadInput = card.querySelector('[data-role="uploadInput"]');

    try {
      setNotice(elNotice);
      setButtonBusy(saveBtn, true);

      const formData = new FormData(form);
      let imageUrl = null;

      // Upload image if changed
      if (uploadInput.files?.[0]) {
        showUploadStatus(card, true, 'Uploading image...');
        const up = await uploadFile(uploadInput.files[0], { key: `store-${id}` });
        imageUrl = up.url;
        showUploadStatus(card, false);
      }

      // Prepare update data
      const updateData = {
        name: formData.get('name')?.trim(),
        price: Number(formData.get('price')) || 0,
        desc: formData.get('desc')?.trim(),
        sizes: formData.get('sizes')?.split(',').map(s => s.trim()).filter(Boolean) || [],
        category: formData.get('category')?.trim(),
      };

      if (imageUrl) {
        updateData.image = imageUrl;
      }

      // Save to server
      await fetchJson(`${API_BASE}/api/admin/store/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: authHeaders(),
      });

      // Update local data
      const idx = products.findIndex(p => p.id === id);
      if (idx >= 0) {
        products[idx] = { ...products[idx], ...updateData };
      }

      // Re-render
      renderProducts();

      setNotice(elNotice, { message: 'Changes saved successfully!', isSuccess: true });
    } catch (err) {
      setNotice(elNotice, { message: err.message || 'Failed to save changes.', isError: true });
    } finally {
      setButtonBusy(saveBtn, false);
      showUploadStatus(card, false);
      card.dataset.pendingUpload = '';
    }
  };

  const handleDelete = async (id) => {
    try {
      setNotice(elNotice);
      await fetchJson(`${API_BASE}/api/admin/store/products/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      // Remove from local data
      products = products.filter(p => p.id !== id);
      renderProducts();

      setNotice(elNotice, { message: 'Product deleted successfully!', isSuccess: true });
    } catch (err) {
      setNotice(elNotice, { message: err.message || 'Failed to delete product.', isError: true });
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const name = formData.get('newName')?.trim();
    const imageFile = formData.get('newImage');

    if (!name || !imageFile) return;

    try {
      setNotice(elNotice);
      setButtonBusy(elAddBtn, true);

      // Upload image first
      const tempId = `temp-${Date.now()}`;
      const up = await uploadFile(imageFile, { key: `store-${tempId}` });

      // Create product
      const newProduct = {
        name,
        price: Number(formData.get('newPrice')) || 0,
        desc: formData.get('newDesc')?.trim(),
        sizes: formData.get('newSizes')?.split(',').map(s => s.trim()).filter(Boolean) || [],
        category: formData.get('newCategory')?.trim(),
        image: up.url,
      };

      const data = await fetchJson(`${API_BASE}/api/admin/store/products`, {
        method: 'POST',
        body: JSON.stringify(newProduct),
        headers: authHeaders(),
      });

      // Add to local data
      products.unshift(data);

      // Re-render
      renderProducts();

      // Reset form
      form.reset();
      document.getElementById('newImagePreview').hidden = true;

      setNotice(elNotice, { message: 'Product added successfully!', isSuccess: true });
    } catch (err) {
      setNotice(elNotice, { message: err.message || 'Failed to add product.', isError: true });
    } finally {
      setButtonBusy(elAddBtn, false);
    }
  };

  // Add form handler
  elAddForm.addEventListener('submit', handleAdd);

  // New image preview
  document.getElementById('newImage').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    const preview = document.getElementById('newImagePreview');
    if (!file) {
      preview.hidden = true;
      return;
    }

    const url = URL.createObjectURL(file);
    renderThumb(preview, url);
    preview.hidden = false;

    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }, 30000);
  });

  // Load products on page load
  loadProducts();

  console.log('Store admin loaded');
})();