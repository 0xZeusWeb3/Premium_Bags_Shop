import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatPrice, CATEGORIES } from '../lib/utils';
import Navbar from '../components/Navbar';

export default function AdminPage() {
  const { showToast } = useToast();
  const [section, setSection] = useState('all-products');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [category, setCategory] = useState('all');
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [bgColor, setBgColor] = useState('#f5d5c0');
  const [panelColor, setPanelColor] = useState('#e8c4a8');
  const [textColor, setTextColor] = useState('#1a1a1a');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formMsg, setFormMsg] = useState({ text: '', type: '' });
  const [creating, setCreating] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { showToast('Failed to load products.', 'error'); return; }
    setProducts(data || []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  async function toggleAvailability(id, current) {
    const { error } = await supabase.from('products').update({ is_available: !current }).eq('id', id);
    if (error) { showToast('Could not update product.', 'error'); return; }
    showToast(`Product ${!current ? 'enabled' : 'disabled'}.`, 'info');
    loadProducts();
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { showToast('Could not delete product.', 'error'); return; }
    showToast('Product deleted.', 'success');
    loadProducts();
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormMsg({ text: '', type: '' });

    if (!name.trim()) return setFormMsg({ text: 'Product name is required.', type: 'error' });
    const priceNum = parseFloat(price);
    if (!priceNum || isNaN(priceNum) || priceNum <= 0) return setFormMsg({ text: 'Valid price is required.', type: 'error' });
    const discountNum = discount.trim() ? parseFloat(discount) : null;
    if (discountNum !== null && discountNum >= priceNum) return setFormMsg({ text: 'Discount price must be less than the regular price.', type: 'error' });

    setCreating(true);
    let finalImageUrl = imageUrl.trim() || null;

    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `products/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, imageFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
        finalImageUrl = urlData?.publicUrl || finalImageUrl;
      }
    }

    const { error } = await supabase.from('products').insert({
      name: name.trim(), price: priceNum, discount_price: discountNum, category,
      is_best_seller: isBestSeller, bg_color: bgColor, panel_color: panelColor,
      text_color: textColor, image_url: finalImageUrl, is_available: true,
    });

    setCreating(false);

    if (error) return setFormMsg({ text: error.message, type: 'error' });

    setFormMsg({ text: 'Product created successfully!', type: 'success' });
    setName(''); setPrice(''); setDiscount(''); setCategory('all'); setIsBestSeller(false);
    setImageUrl(''); setImageFile(null); setImagePreview('');

    setTimeout(() => setSection('all-products'), 1000);
    loadProducts();
  }

  return (
    <>
      <Navbar showAccount={false} />
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <button className={`admin-nav-btn ${section === 'all-products' ? 'active' : ''}`} onClick={() => setSection('all-products')}>All Products</button>
          <button className={`admin-nav-btn ${section === 'create-product' ? 'active' : ''}`} onClick={() => setSection('create-product')}>Create New Product</button>
        </aside>

        <main className="admin-main">
          {section === 'all-products' && (
            <section className="admin-section active">
              <h2 className="admin-section-title">All Products</h2>
              {loading ? (
                <div className="loading-grid" style={{ display: 'flex', padding: '60px 0' }}>
                  <span></span><span></span><span></span>
                </div>
              ) : products.length === 0 ? (
                <p style={{ color: 'var(--neutral-400)' }}>No products yet. Create one!</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th></th><th>Name</th><th>Price</th><th>Category</th><th>Status</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td>
                            <img
                              className="product-thumb"
                              src={p.image_url || 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=400'}
                              alt={p.name}
                            />
                          </td>
                          <td><strong>{p.name}</strong>{p.is_best_seller && <span className="bs-tag">Best Seller</span>}</td>
                          <td>
                            {formatPrice(p.price)}
                            {p.discount_price && <><br /><span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{formatPrice(p.discount_price)}</span></>}
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>{p.category}</td>
                          <td>
                            <span className={`avail-badge ${p.is_available ? 'yes' : 'no'}`}>
                              {p.is_available ? 'Available' : 'Out of stock'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="tbl-btn tbl-btn-toggle" onClick={() => toggleAvailability(p.id, p.is_available)}>
                                {p.is_available ? 'Disable' : 'Enable'}
                              </button>
                              <button className="tbl-btn tbl-btn-danger" onClick={() => deleteProduct(p.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {section === 'create-product' && (
            <section className="admin-section active">
              <h2 className="admin-section-title">Create New Product</h2>
              <form onSubmit={handleCreate} noValidate style={{ maxWidth: '600px' }}>
                {formMsg.text && <div className={`auth-msg show ${formMsg.type}`} style={{ marginBottom: '16px' }}>{formMsg.text}</div>}

                <p className="section-sub-title">Product Details</p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <label className="file-btn-label">
                    Select File
                    <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                  </label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>{imageFile ? imageFile.name : 'No file chosen'}</span>
                </div>
                {imagePreview && <img className="img-preview show" src={imagePreview} alt="Preview" />}

                <div className="form-group" style={{ marginBottom: '14px', marginTop: '16px' }}>
                  <label className="form-label">Product Name</label>
                  <input className="form-input" type="text" placeholder="e.g. Clinge Bag" value={name} onChange={e => setName(e.target.value)} required />
                </div>

                <div className="form-grid-2" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Product Price (&#8377;)</label>
                    <input className="form-input" type="number" placeholder="1200" min="0" value={price} onChange={e => setPrice(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discount Price (&#8377;)</label>
                    <input className="form-input" type="number" placeholder="Optional" min="0" value={discount} onChange={e => setDiscount(e.target.value)} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Category</label>
                  <select className="form-input select-pill" value={category} onChange={e => setCategory(e.target.value)} style={{ background: 'var(--neutral-50)' }}>
                    <option value="all">All Products</option>
                    {CATEGORIES.map(g => (
                      <optgroup label={g.label} key={g.label}>
                        {g.sub.map(s => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                    ))}
                    <option value="new">New Collection</option>
                    <option value="discounted">Discounted</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="filter-check" style={{ fontSize: '0.875rem', color: 'var(--neutral-700)' }}>
                    <input type="checkbox" checked={isBestSeller} onChange={e => setIsBestSeller(e.target.checked)} />
                    Mark as Best Seller
                  </label>
                </div>

                <p className="section-sub-title">Panel Details</p>

                <div className="form-grid-2" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Background Color</label>
                    <div className="color-row">
                      <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
                      <input className="form-input" type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ flex: 1 }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Panel Color</label>
                    <div className="color-row">
                      <input type="color" value={panelColor} onChange={e => setPanelColor(e.target.value)} />
                      <input className="form-input" type="text" value={panelColor} onChange={e => setPanelColor(e.target.value)} style={{ flex: 1 }} />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Text Color</label>
                  <div className="color-row">
                    <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
                    <input className="form-input" type="text" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ flex: 1, maxWidth: '200px' }} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Image URL <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(Pexels link — used if no file selected)</span></label>
                  <input className="form-input" type="url" placeholder="https://images.pexels.com/..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                </div>

                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <><span className="spinner"></span> Creating...</> : 'Create Product'}
                </button>
              </form>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
