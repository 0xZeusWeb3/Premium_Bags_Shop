import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatPrice, getEffectivePrice, getDiscountPercent, CATEGORIES } from '../lib/utils';
import Navbar from '../components/Navbar';

export default function ShopPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('popular');
  const [filterAvailable, setFilterAvailable] = useState(true);
  const [filterDiscount, setFilterDiscount] = useState(false);
  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { showToast('Failed to load products.', 'error'); return; }
      setProducts(data || []);
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let result = [...products];

    if (category !== 'all') {
      if (category === 'best-sellers') result = result.filter(p => p.is_best_seller);
      else if (category === 'discounted') result = result.filter(p => p.discount_price != null);
      else result = result.filter(p => p.category === category);
    }

    if (filterAvailable) result = result.filter(p => p.is_available);
    if (filterDiscount) result = result.filter(p => p.discount_price != null);

    switch (sort) {
      case 'price-asc': result.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b)); break;
      case 'price-desc': result.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a)); break;
      case 'newest': result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
      default: break;
    }

    return result;
  }, [products, category, sort, filterAvailable, filterDiscount]);

  const addToCart = useCallback(async (productId) => {
    if (!session) return;
    const { data: existing, error: checkErr } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', session.user.id)
      .eq('product_id', productId)
      .maybeSingle();
    if (checkErr) { showToast('Could not add to cart.', 'error'); return; }

    if (existing) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + 1 })
        .eq('id', existing.id);
      if (error) { showToast('Could not update cart.', 'error'); return; }
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({ product_id: productId, quantity: 1 });
      if (error) { showToast('Could not add to cart.', 'error'); return; }
    }
    showToast('Added to cart!', 'success');
  }, [session, showToast]);

  function toggleGroup(key) {
    setOpenGroups(g => ({ ...g, [key]: !g[key] }));
  }

  function handleCategoryClick(e, cat) {
    e.preventDefault();
    setCategory(cat);
  }

  return (
    <>
      <Navbar />
      <div className="shop-layout">
        <aside className="shop-sidebar">
          <div className="sidebar-section">
            <p className="sidebar-label">Collection</p>
            <ul className="sidebar-nav">
              <li className={category === 'all' ? 'active-marker' : ''}>
                <a href="#" className={category === 'all' ? 'active' : ''} onClick={e => handleCategoryClick(e, 'all')}>All Products</a>
              </li>
              {CATEGORIES.map(group => {
                const key = group.label.split(' ')[0].toLowerCase();
                const isOpen = !!openGroups[key];
                return (
                  <li className={`cat-group ${isOpen ? 'open' : ''}`} key={group.label}>
                    <a
                      href="#"
                      className="cat-group-toggle"
                      onClick={e => { e.preventDefault(); toggleGroup(key); }}
                    >
                      {group.label}
                    </a>
                    <ul className="cat-sub">
                      {group.sub.map(sub => (
                        <li key={sub}>
                          <a
                            href="#"
                            className={category === sub ? 'active' : ''}
                            onClick={e => handleCategoryClick(e, sub)}
                          >{sub}</a>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
              <li className={category === 'new' ? 'active-marker' : ''}>
                <a href="#" className={category === 'new' ? 'active' : ''} onClick={e => handleCategoryClick(e, 'new')}>New Collection</a>
              </li>
              <li className={category === 'best-sellers' ? 'active-marker' : ''}>
                <a href="#" className={category === 'best-sellers' ? 'active' : ''} onClick={e => handleCategoryClick(e, 'best-sellers')}>Best Sellers</a>
              </li>
              <li className={category === 'discounted' ? 'active-marker' : ''}>
                <a href="#" className={category === 'discounted' ? 'active' : ''} onClick={e => handleCategoryClick(e, 'discounted')}>Discounted Products</a>
              </li>
            </ul>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">Filter by</p>
            <label className="filter-check">
              <input type="checkbox" checked={filterAvailable} onChange={e => setFilterAvailable(e.target.checked)} />
              Availability
            </label>
            <label className="filter-check" style={{ marginTop: '6px' }}>
              <input type="checkbox" checked={filterDiscount} onChange={e => setFilterDiscount(e.target.checked)} />
              Discount
            </label>
          </div>
        </aside>

        <main className="shop-main">
          <div className="shop-toolbar">
            <span className="shop-toolbar-label">sort by :</span>
            <select className="select-pill" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="popular">Popular</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {loading ? (
            <div className="loading-grid" style={{ padding: '80px 0', display: 'flex' }}>
              <span></span><span></span><span></span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <p>No products found</p>
            </div>
          ) : (
            <div className="products-grid">
              {filtered.map(product => {
                const hasDiscount = product.discount_price && product.discount_price < product.price;
                const discountPct = getDiscountPercent(product);
                return (
                  <div className="product-card" style={{ background: product.bg_color }} key={product.id}>
                    <img
                      className="product-card-img"
                      src={product.image_url || 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=600'}
                      alt={product.name}
                      loading="lazy"
                    />
                    {product.is_best_seller && <span className="best-seller-badge">Best Seller</span>}
                    <div className="product-card-panel" style={{ background: product.panel_color, color: product.text_color }}>
                      <div className="product-card-info">
                        <div className="product-card-name">{product.name}</div>
                        <div className="product-card-price">
                          {hasDiscount && <span className="price-strike">{formatPrice(product.price)}</span>}
                          {formatPrice(getEffectivePrice(product))}
                          {hasDiscount && <span className="discount-pill">-{discountPct}%</span>}
                        </div>
                      </div>
                      <button
                        className="btn-add"
                        onClick={() => addToCart(product.id)}
                        aria-label="Add to cart"
                        style={{ color: product.text_color, borderColor: product.text_color }}
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
