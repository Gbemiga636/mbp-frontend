'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { resolveMediaUrl } from '@/lib/media';
import { formatNaira } from '@/lib/format';

type Product = Record<string, any>;

const EMPTY_FORM = {
  name: '',
  price: '',
  salePrice: '',
  category: 'lingerie',
  sizes: 'S, M, L, XL',
  colors: '',
  image: '',
  imageBack: '',
  desc: '',
  sku: '',
  stock: '',
  badges: '',
  materials: '',
  care: '',
};

function productImage(p: Product) {
  return resolveMediaUrl(p.image || p.imageBack || p.images?.[0] || '');
}

function sizesText(p: Product) {
  return Array.isArray(p.sizes) ? p.sizes.join(', ') : String(p.sizes || '');
}

export default function AdminProductsPage() {
  const { authFetch, user } = useAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [msg, setMsg] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [edit, setEdit] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    const r = await authFetch('/api/admin/store/products');
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Failed');
    setProducts(j.products || []);
  };

  useEffect(() => {
    if (!user) return;
    load().catch((e) => setMsg(e.message));
  }, [user]);

  useEffect(() => {
    if (!selected) {
      setEdit(null);
      return;
    }
    setEdit({
      ...selected,
      sizes: sizesText(selected),
      colors: Array.isArray(selected.colors) ? selected.colors.join(', ') : String(selected.colors || ''),
      badges: Array.isArray(selected.badges) ? selected.badges.join(', ') : String(selected.badges || ''),
      salePrice: selected.salePrice ?? '',
      stock: selected.stock ?? '',
    });
  }, [selected]);

  const upload = async (file: File, key: string) => {
    const fd = new FormData();
    fd.append('file', file);
    const r = await authFetch(`/api/admin/upload?key=${encodeURIComponent(key)}`, { method: 'POST', body: fd });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Upload failed');
    return j.url as string;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const catOk = category === 'all' || p.category === category;
      if (!catOk) return false;
      if (!q) return true;
      return [p.name, p.sku, p.category, p.desc, sizesText(p)].join(' ').toLowerCase().includes(q);
    });
  }, [products, query, category]);

  if (!user) return null;

  return (
    <div className="admin-page">
      <div className="admin-hero">
        <div>
          <p className="admin-kicker">Catalogue</p>
          <h1>Products</h1>
          <p className="admin-muted">{products.length} pieces in the house · {filtered.length} showing</p>
        </div>
        <button className="admin-btn" type="button" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Close form' : 'Add product'}
        </button>
      </div>
      {msg && <p className="admin-toast">{msg}</p>}

      {showAdd && (
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setMsg('Saving…');
            try {
              const payload = {
                name: form.name,
                price: Number(form.price || 0),
                salePrice: form.salePrice ? Number(form.salePrice) : null,
                category: form.category,
                sizes: form.sizes,
                colors: form.colors,
                image: form.image,
                imageBack: form.imageBack,
                desc: form.desc,
                sku: form.sku,
                stock: form.stock === '' ? null : Number(form.stock),
                badges: form.badges.split(',').map((s) => s.trim()).filter(Boolean),
                materials: form.materials,
                care: form.care,
              };
              const r = await authFetch('/api/admin/store/products', { method: 'POST', body: JSON.stringify(payload) });
              const j = await r.json();
              if (!r.ok) throw new Error(j.error || 'Create failed');
              setMsg('Product added');
              setForm(EMPTY_FORM);
              setShowAdd(false);
              await load();
            } catch (err) {
              setMsg(err instanceof Error ? err.message : 'Failed');
            }
          }}
        >
          <h2>Add product</h2>
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <div className="admin-two">
            <label>Price<input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label>
            <label>Sale price<input value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} /></label>
          </div>
          <label>Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="lingerie">Lingerie</option>
              <option value="underwear">Underwear</option>
              <option value="nightwear">Nightwear</option>
              <option value="pyjamas">Pyjamas</option>
            </select>
          </label>
          <label>Sizes<input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} /></label>
          <label>Colors<input value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} placeholder="Black, Nude" /></label>
          <label>Badges<input value={form.badges} onChange={(e) => setForm({ ...form, badges: e.target.value })} placeholder="new, bestseller, sale" /></label>
          <div className="admin-two">
            <label>SKU<input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
            <label>Stock<input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
          </div>
          <label>Description<textarea value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></label>
          <label>Materials<input value={form.materials} onChange={(e) => setForm({ ...form, materials: e.target.value })} /></label>
          <label>Care<input value={form.care} onChange={(e) => setForm({ ...form, care: e.target.value })} /></label>
          <label>Front image URL<input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></label>
          <label>Upload front
            <input type="file" accept="image/*" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setMsg('Uploading…');
                const url = await upload(f, `store-new-${Date.now()}`);
                setForm((prev) => ({ ...prev, image: url }));
                setMsg('Uploaded');
              } catch (err) {
                setMsg(err instanceof Error ? err.message : 'Upload failed');
              }
            }} />
          </label>
          {form.image && <img className="admin-preview" src={resolveMediaUrl(form.image)} alt="" />}
          <label>Back image URL<input value={form.imageBack} onChange={(e) => setForm({ ...form, imageBack: e.target.value })} /></label>
          <label>Upload back
            <input type="file" accept="image/*" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setMsg('Uploading back image…');
                const url = await upload(f, `store-new-back-${Date.now()}`);
                setForm((prev) => ({ ...prev, imageBack: url }));
                setMsg('Back image uploaded');
              } catch (err) {
                setMsg(err instanceof Error ? err.message : 'Upload failed');
              }
            }} />
          </label>
          {form.imageBack && <img className="admin-preview" src={resolveMediaUrl(form.imageBack)} alt="" />}
          <button className="admin-btn" type="submit">Save product</button>
        </form>
      )}

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Search name, SKU, size…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          <option value="lingerie">Lingerie</option>
          <option value="underwear">Underwear</option>
          <option value="nightwear">Nightwear</option>
          <option value="pyjamas">Pyjamas</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="admin-muted">No products match this view.</p>
      ) : (
        <div className="admin-catalog">
          {filtered.map((p) => {
            const src = productImage(p);
            return (
              <button key={p.id} type="button" className="admin-product" onClick={() => setSelected(p)}>
                <div className="admin-product-media">
                  {src ? <img src={src} alt={p.name} /> : <span>No image</span>}
                  {p.soldOut && <em>Sold out</em>}
                </div>
                <div className="admin-product-body">
                  <strong>{p.name}</strong>
                  <span className="admin-muted">{p.category}{p.sku ? ` · ${p.sku}` : ''}</span>
                  <b>{formatNaira(Number(p.salePrice || p.price || 0))}</b>
                  {p.salePrice ? <s className="admin-muted">{formatNaira(Number(p.price || 0))}</s> : null}
                  <p>{sizesText(p) || 'No sizes'} · Stock {p.stock ?? '—'}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && edit && (
        <div className="admin-drawer">
          <div className="admin-drawer-scrim" onClick={() => setSelected(null)} />
          <aside className="admin-drawer-panel">
            <div className="admin-drawer-top">
              <div>
                <p className="admin-kicker">{selected.category}</p>
                <h2>{selected.name}</h2>
              </div>
              <button type="button" className="admin-btn ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="admin-gallery">
              {[selected.image, selected.imageBack, ...(selected.images || [])]
                .filter(Boolean)
                .map((src: string) => (
                  <img key={src} src={resolveMediaUrl(src)} alt="" />
                ))}
              {!selected.image && !selected.imageBack && <p className="admin-muted">No images yet.</p>}
            </div>
            <dl className="admin-dl">
              <div><dt>Price</dt><dd>{formatNaira(Number(selected.price || 0))}</dd></div>
              <div><dt>Sale</dt><dd>{selected.salePrice ? formatNaira(Number(selected.salePrice)) : '—'}</dd></div>
              <div><dt>SKU</dt><dd>{selected.sku || '—'}</dd></div>
              <div><dt>Stock</dt><dd>{selected.soldOut ? 'Sold out' : (selected.stock ?? '—')}</dd></div>
              <div><dt>Sizes</dt><dd>{sizesText(selected) || '—'}</dd></div>
              <div><dt>Colors</dt><dd>{Array.isArray(selected.colors) ? selected.colors.join(', ') : selected.colors || '—'}</dd></div>
              <div><dt>Badges</dt><dd>{Array.isArray(selected.badges) ? selected.badges.join(', ') : selected.badges || '—'}</dd></div>
            </dl>
            {selected.desc && <p className="admin-muted">{selected.desc}</p>}
            {(selected.materials || selected.care) && (
              <p className="admin-muted">{[selected.materials, selected.care].filter(Boolean).join(' · ')}</p>
            )}

            <form
              className="admin-form compact"
              onSubmit={async (e) => {
                e.preventDefault();
                setMsg('Updating…');
                try {
                  const r = await authFetch(`/api/admin/store/products/${selected.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                      ...selected,
                      ...edit,
                      price: Number(edit.price || 0),
                      salePrice: edit.salePrice === '' ? null : Number(edit.salePrice),
                      stock: edit.stock === '' ? null : Number(edit.stock),
                      sizes: edit.sizes,
                      colors: edit.colors,
                      badges: String(edit.badges || '').split(',').map((s) => s.trim()).filter(Boolean),
                    }),
                  });
                  const j = await r.json();
                  if (!r.ok) throw new Error(j.error || 'Update failed');
                  setMsg('Product updated');
                  setSelected(j);
                  await load();
                } catch (err) {
                  setMsg(err instanceof Error ? err.message : 'Failed');
                }
              }}
            >
              <h3>Edit details</h3>
              <label>Name<input value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
              <div className="admin-two">
                <label>Price<input value={edit.price ?? ''} onChange={(e) => setEdit({ ...edit, price: e.target.value })} /></label>
                <label>Sale<input value={edit.salePrice ?? ''} onChange={(e) => setEdit({ ...edit, salePrice: e.target.value })} /></label>
              </div>
              <label>Sizes<input value={edit.sizes || ''} onChange={(e) => setEdit({ ...edit, sizes: e.target.value })} /></label>
              <label>Colors<input value={edit.colors || ''} onChange={(e) => setEdit({ ...edit, colors: e.target.value })} /></label>
              <div className="admin-two">
                <label>SKU<input value={edit.sku || ''} onChange={(e) => setEdit({ ...edit, sku: e.target.value })} /></label>
                <label>Stock<input value={edit.stock ?? ''} onChange={(e) => setEdit({ ...edit, stock: e.target.value })} /></label>
              </div>
              <label>Description<textarea value={edit.desc || ''} onChange={(e) => setEdit({ ...edit, desc: e.target.value })} /></label>
              <label>Front image URL<input value={edit.image || ''} onChange={(e) => setEdit({ ...edit, image: e.target.value })} /></label>
              <label>Upload / replace front
                <input type="file" accept="image/*" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const url = await upload(f, `store-${selected.id}-${Date.now()}`);
                  setEdit({ ...edit, image: url });
                }} />
              </label>
              <label>Back image URL<input value={edit.imageBack || ''} onChange={(e) => setEdit({ ...edit, imageBack: e.target.value })} /></label>
              <label>Upload / replace back
                <input type="file" accept="image/*" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const url = await upload(f, `store-${selected.id}-back-${Date.now()}`);
                  setEdit({ ...edit, imageBack: url });
                }} />
              </label>
              <div className="admin-actions">
                <button className="admin-btn" type="submit">Save changes</button>
                <button
                  type="button"
                  className="admin-btn ghost"
                  onClick={async () => {
                    await authFetch(`/api/admin/store/products/${selected.id}/soldout`, {
                      method: 'PUT',
                      body: JSON.stringify({ soldOut: !selected.soldOut }),
                    });
                    await load();
                    setSelected((s) => (s ? { ...s, soldOut: !s.soldOut } : s));
                  }}
                >
                  {selected.soldOut ? 'Mark in stock' : 'Mark sold out'}
                </button>
                <button
                  type="button"
                  className="admin-btn danger"
                  onClick={async () => {
                    if (!confirm('Delete this product?')) return;
                    await authFetch(`/api/admin/store/products/${selected.id}`, { method: 'DELETE' });
                    setSelected(null);
                    await load();
                  }}
                >
                  Delete
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
