import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatPrice, getEffectivePrice, PLATFORM_FEE } from '../lib/utils';
import Navbar from '../components/Navbar';

export default function CartPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`id, quantity, products ( id, name, price, discount_price, image_url, bg_color, panel_color, text_color )`)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      if (error) { showToast('Failed to load cart.', 'error'); return; }
      setCartItems((data || []).filter(i => i.products));
      setLoading(false);
    }
    load();
  }, [session, showToast]);

  const summary = (() => {
    let mrp = 0, discount = 0;
    cartItems.forEach(item => {
      const p = item.products;
      mrp += p.price * item.quantity;
      if (p.discount_price) discount += (p.price - p.discount_price) * item.quantity;
    });
    const total = Math.max(0, mrp - discount + (cartItems.length > 0 ? PLATFORM_FEE : 0));
    return { mrp, discount, total };
  })();

  const changeQty = useCallback(async (cartItemId, delta) => {
    const item = cartItems.find(i => i.id === cartItemId);
    if (!item) return;
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
      if (error) { showToast('Could not remove item.', 'error'); return; }
      setCartItems(items => items.filter(i => i.id !== cartItemId));
    } else {
      const { error } = await supabase.from('cart_items').update({ quantity: newQty }).eq('id', cartItemId);
      if (error) { showToast('Could not update quantity.', 'error'); return; }
      setCartItems(items => items.map(i => i.id === cartItemId ? { ...i, quantity: newQty } : i));
    }
  }, [cartItems, showToast]);

  async function placeOrder() {
    if (!cartItems.length) return;
    setPlacing(true);

    let mrp = 0, discount = 0;
    const orderItems = cartItems.map(item => {
      const p = item.products;
      const displayPrice = getEffectivePrice(p);
      mrp += p.price * item.quantity;
      if (p.discount_price) discount += (p.price - p.discount_price) * item.quantity;
      return { product_id: p.id, name: p.name, price: displayPrice, quantity: item.quantity };
    });
    const total = mrp - discount + PLATFORM_FEE;

    const { error: orderError } = await supabase
      .from('orders')
      .insert({ items: orderItems, subtotal: mrp - discount, platform_fee: PLATFORM_FEE, total, status: 'confirmed' });

    if (orderError) {
      showToast('Could not place order. Try again.', 'error');
      setPlacing(false);
      return;
    }

    await supabase.from('cart_items').delete().eq('user_id', session.user.id);
    setCartItems([]);
    setPlacing(false);
    setShowOrderModal(true);
  }

  return (
    <>
      <Navbar showAccount={false} />
      <div className="cart-layout">
        <div className="cart-items-col">
          {loading ? (
            <div className="loading-grid" style={{ padding: '80px 0', display: 'flex' }}>
              <span></span><span></span><span></span>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="cart-empty">
              <h3>Your cart is empty</h3>
              <Link to="/shop" className="btn btn-primary" style={{ marginTop: '16px' }}>Continue Shopping</Link>
            </div>
          ) : (
            cartItems.map(item => {
              const p = item.products;
              const lineTotal = getEffectivePrice(p) * item.quantity;
              return (
                <div className="cart-card" style={{ background: p.bg_color }} key={item.id}>
                  <div className="cart-card-top">
                    <img src={p.image_url || 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=600'} alt={p.name} loading="lazy" />
                  </div>
                  <div className="cart-card-bottom" style={{ background: p.panel_color, color: p.text_color }}>
                    <div>
                      <div className="cart-card-name">{p.name}</div>
                      <div className="cart-card-net">Net Total &nbsp; {formatPrice(lineTotal)}</div>
                    </div>
                    <div className="qty-controls">
                      <button className="qty-btn qty-plus" onClick={() => changeQty(item.id, 1)} style={{ color: p.text_color, borderColor: p.text_color }}>+</button>
                      <span className="qty-num">{String(item.quantity).padStart(2, '0')}</span>
                      <button className="qty-btn qty-minus" onClick={() => changeQty(item.id, -1)} style={{ color: p.text_color, borderColor: p.text_color }}>&minus;</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="cart-summary-col">
          <div className="price-section">
            <p className="price-section-title">Price Breakdown</p>
            <div className="price-row"><span>Total MRP</span><span className="val">{formatPrice(summary.mrp)}</span></div>
            <div className="price-row"><span>Discount on MRP</span><span className="val">{formatPrice(summary.discount)}</span></div>
            <div className="price-row"><span>Platform Fee</span><span className="val">{cartItems.length > 0 ? formatPrice(PLATFORM_FEE) : formatPrice(0)}</span></div>
            <div className="price-row"><span>Shipping Fee</span><span className="val">FREE</span></div>
          </div>
          <hr className="price-divider" />
          <div className="price-total"><span>Total Amount</span><span className="total-val">{formatPrice(summary.total)}</span></div>
          <button className="btn btn-dark" style={{ width: '100%' }} onClick={placeOrder} disabled={!cartItems.length || placing}>
            {placing ? <><span className="spinner"></span> Placing...</> : 'Place Order'}
          </button>
        </div>
      </div>

      {showOrderModal && (
        <div className="modal-overlay open" onClick={e => e.target.classList.contains('modal-overlay') && setShowOrderModal(false)}>
          <div className="modal">
            <div className="order-success-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="modal-title">Order Placed!</p>
            <p className="modal-body">Your order has been placed successfully. We'll process and ship it within 3-5 business days.</p>
            <div className="modal-actions">
              <Link to="/shop" className="btn btn-dark">Continue Shopping</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
