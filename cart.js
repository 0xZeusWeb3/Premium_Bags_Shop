import './style.css';
import { supabase } from './supabase.js';
import { showToast, formatPrice, requireAuth } from './utils.js';

const PLATFORM_FEE = 20;
let cartItems = [];
let session = null;

async function init() {
  session = await requireAuth(supabase);
  if (!session) return;

  await loadCart();
  setupPlaceOrder();
}

async function loadCart() {
  const col = document.getElementById('cart-items-col');

  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      products (
        id, name, price, discount_price,
        image_url, bg_color, panel_color, text_color
      )
    `)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true });

  if (error) {
    col.innerHTML = '<div class="cart-empty"><h3>Failed to load cart.</h3></div>';
    return;
  }

  cartItems = (data || []).filter(item => item.products);
  renderCart();
  updateSummary();
}

function renderCart() {
  const col = document.getElementById('cart-items-col');
  const placeBtn = document.getElementById('place-order-btn');

  if (!cartItems.length) {
    col.innerHTML = `
      <div class="cart-empty">
        <h3>Your cart is empty</h3>
        <a href="/shop.html" class="btn btn-primary" style="margin-top:16px;">Continue Shopping</a>
      </div>`;
    placeBtn.disabled = true;
    return;
  }

  placeBtn.disabled = false;

  col.innerHTML = cartItems.map(item => {
    const p = item.products;
    const displayPrice = p.discount_price || p.price;
    const lineTotal = displayPrice * item.quantity;

    return `
      <div class="cart-card" style="background:${p.bg_color};" data-cart-id="${item.id}">
        <div class="cart-card-top">
          <img
            src="${p.image_url || 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=600'}"
            alt="${p.name}"
            loading="lazy"
          />
        </div>
        <div class="cart-card-bottom" style="background:${p.panel_color}; color:${p.text_color};">
          <div>
            <div class="cart-card-name">${p.name}</div>
            <div class="cart-card-net">Net Total &nbsp; ${formatPrice(lineTotal)}</div>
          </div>
          <div class="qty-controls">
            <button class="qty-btn qty-plus" data-id="${item.id}" style="color:${p.text_color}; border-color:${p.text_color};">+</button>
            <span class="qty-num">${String(item.quantity).padStart(2, '0')}</span>
            <button class="qty-btn qty-minus" data-id="${item.id}" style="color:${p.text_color}; border-color:${p.text_color};">−</button>
          </div>
        </div>
      </div>`;
  }).join('');

  col.querySelectorAll('.qty-plus').forEach(btn => {
    btn.addEventListener('click', () => changeQty(btn.dataset.id, 1));
  });

  col.querySelectorAll('.qty-minus').forEach(btn => {
    btn.addEventListener('click', () => changeQty(btn.dataset.id, -1));
  });
}

async function changeQty(cartItemId, delta) {
  const item = cartItems.find(i => i.id === cartItemId);
  if (!item) return;

  const newQty = item.quantity + delta;

  if (newQty <= 0) {
    const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
    if (error) { showToast('Could not remove item.', 'error'); return; }
    cartItems = cartItems.filter(i => i.id !== cartItemId);
  } else {
    const { error } = await supabase.from('cart_items').update({ quantity: newQty }).eq('id', cartItemId);
    if (error) { showToast('Could not update quantity.', 'error'); return; }
    item.quantity = newQty;
  }

  renderCart();
  updateSummary();
}

function updateSummary() {
  let mrp = 0;
  let discount = 0;

  cartItems.forEach(item => {
    const p = item.products;
    mrp += p.price * item.quantity;
    if (p.discount_price) {
      discount += (p.price - p.discount_price) * item.quantity;
    }
  });

  const total = mrp - discount + (cartItems.length > 0 ? PLATFORM_FEE : 0);

  document.getElementById('summary-mrp').textContent = formatPrice(mrp);
  document.getElementById('summary-discount').textContent = formatPrice(discount);
  document.getElementById('summary-platform').textContent = cartItems.length > 0 ? formatPrice(PLATFORM_FEE) : formatPrice(0);
  document.getElementById('summary-total').textContent = formatPrice(Math.max(0, total));
}

function setupPlaceOrder() {
  document.getElementById('place-order-btn').addEventListener('click', async () => {
    if (!cartItems.length) return;

    const btn = document.getElementById('place-order-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Placing...';

    let mrp = 0;
    let discount = 0;

    const orderItems = cartItems.map(item => {
      const p = item.products;
      const displayPrice = p.discount_price || p.price;
      mrp += p.price * item.quantity;
      if (p.discount_price) discount += (p.price - p.discount_price) * item.quantity;
      return { product_id: p.id, name: p.name, price: displayPrice, quantity: item.quantity };
    });

    const total = mrp - discount + PLATFORM_FEE;

    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        items: orderItems,
        subtotal: mrp - discount,
        platform_fee: PLATFORM_FEE,
        total,
        status: 'confirmed',
      });

    if (orderError) {
      showToast('Could not place order. Try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Place Order';
      return;
    }

    // Clear cart
    await supabase.from('cart_items').delete().eq('user_id', session.user.id);

    document.getElementById('order-modal').classList.add('open');
  });
}

init();
