import './style.css';
import { supabase } from './supabase.js';
import {
  showToast,
  formatPrice,
  requireAuth,
  getCartCount,
  updateCartBadge,
  getCachedProducts,
  setCachedProducts,
  productImageUrl,
  PRODUCT_FIELDS,
} from './utils.js';

let products = [];
let currentCategory = 'all';
let currentSort = 'popular';
let filterAvailable = true;
let filterDiscount = false;
let session = null;

async function init() {
  session = await requireAuth(supabase);
  if (!session) return;

  setupLogout();
  setupFilters();

  const cached = getCachedProducts();
  if (cached?.length) {
    products = cached;
    renderProducts();
  }

  await Promise.all([loadCartCount(), loadProducts(Boolean(cached?.length))]);
}

async function loadCartCount() {
  const count = await getCartCount(supabase, session);
  updateCartBadge(count);
}

async function fetchProductsFromDb() {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_FIELDS)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function loadProducts(hasCachedData = false) {
  const grid = document.getElementById('products-grid');

  if (!hasCachedData) {
    grid.innerHTML =
      '<div class="loading-grid" style="display:flex;padding:80px 0;"><span></span><span></span><span></span></div>';
  }

  try {
    const data = await fetchProductsFromDb();
    products = data;
    setCachedProducts(data);
    renderProducts();
  } catch {
    if (!hasCachedData) {
      grid.innerHTML = '<div class="empty-state"><p>Failed to load products.</p></div>';
    }
  }
}

function getFilteredSorted() {
  let result = [...products];

  if (currentCategory !== 'all') {
    if (currentCategory === 'best-sellers') {
      result = result.filter((p) => p.is_best_seller);
    } else if (currentCategory === 'discounted') {
      result = result.filter((p) => p.discount_price != null);
    } else {
      result = result.filter((p) => p.category === currentCategory);
    }
  }

  if (filterAvailable) {
    result = result.filter((p) => p.is_available);
  }

  if (filterDiscount) {
    result = result.filter((p) => p.discount_price != null);
  }

  switch (currentSort) {
    case 'price-asc':
      result.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price));
      break;
    case 'price-desc':
      result.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price));
      break;
    case 'newest':
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    default:
      break;
  }

  return result;
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  const filtered = getFilteredSorted();

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p>No products found</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered
    .map((product, index) => {
      const displayPrice = product.discount_price || product.price;
      const hasDiscount = product.discount_price && product.discount_price < product.price;
      const discountPct = hasDiscount
        ? Math.round((1 - product.discount_price / product.price) * 100)
        : 0;
      const imageAttrs =
        index < 4 ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"';

      return `
      <div class="product-card" style="background:${product.bg_color};" data-id="${product.id}">
        <img
          class="product-card-img"
          src="${productImageUrl(product.image_url, 400)}"
          alt="${product.name}"
          width="400"
          height="400"
          decoding="async"
          ${imageAttrs}
        />
        <div class="product-card-panel" style="background:${product.panel_color}; color:${product.text_color};">
          <div class="product-card-info">
            <div class="product-card-name">${product.name}</div>
            <div class="product-card-price">
              ${hasDiscount ? `<span class="price-strike">${formatPrice(product.price)}</span>` : ''}
              ${formatPrice(displayPrice)}
              ${hasDiscount ? `<span class="discount-pill">-${discountPct}%</span>` : ''}
            </div>
          </div>
          <button class="btn-add" data-id="${product.id}" aria-label="Add to cart" style="color:${product.text_color}; border-color:${product.text_color};">+</button>
        </div>
      </div>`;
    })
    .join('');

  grid.querySelectorAll('.btn-add').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(btn.dataset.id);
    });
  });
}

async function addToCart(productId) {
  if (!session) return;

  const { data: existing, error: checkErr } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', session.user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (checkErr) {
    showToast('Could not add to cart.', 'error');
    return;
  }

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + 1 })
      .eq('id', existing.id);

    if (error) {
      showToast('Could not update cart.', 'error');
      return;
    }
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert({ product_id: productId, quantity: 1 });

    if (error) {
      showToast('Could not add to cart.', 'error');
      return;
    }
  }

  showToast('Added to cart!', 'success');
  await loadCartCount();
}

function setupFilters() {
  document.querySelectorAll('#category-nav a[data-cat]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      currentCategory = link.dataset.cat;
      document.querySelectorAll('#category-nav a').forEach((l) => l.classList.remove('active'));
      document.querySelectorAll('#category-nav > li').forEach((l) => l.classList.remove('active-marker'));
      link.classList.add('active');
      const topLi = link.closest('#category-nav > li');
      if (topLi) topLi.classList.add('active-marker');
      renderProducts();
    });
  });

  document.querySelectorAll('.cat-group-toggle').forEach((toggle) => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      toggle.parentElement.classList.toggle('open');
    });
  });

  document.getElementById('sort-select').addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderProducts();
  });

  document.getElementById('filter-available').addEventListener('change', (e) => {
    filterAvailable = e.target.checked;
    renderProducts();
  });

  document.getElementById('filter-discount').addEventListener('change', (e) => {
    filterDiscount = e.target.checked;
    renderProducts();
  });
}

function setupLogout() {
  const modal = document.getElementById('logout-modal');
  const accountLink = document.getElementById('account-link');

  accountLink.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.add('open');
  });

  document.getElementById('logout-cancel').addEventListener('click', () => {
    modal.classList.remove('open');
  });

  document.getElementById('logout-confirm').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.replace('/');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
}

init();
