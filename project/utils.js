export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

export function formatPrice(price) {
  return `\u20B9 ${Number(price).toLocaleString('en-IN')}`;
}

export const DEFAULT_PRODUCT_IMAGE =
  'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=400';

export function productImageUrl(url, width = 400) {
  if (!url) return DEFAULT_PRODUCT_IMAGE.replace('w=400', `w=${width}`);
  if (url.includes('pexels.com') && url.includes('w=')) {
    return url.replace(/w=\d+/, `w=${width}`);
  }
  return url;
}

export async function requireAuth(supabase) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace('/');
    return null;
  }
  return session;
}

export async function getCartCount(supabase, session) {
  if (!session) return 0;

  const { data } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('user_id', session.user.id);

  if (!data) return 0;
  return data.reduce((sum, item) => sum + item.quantity, 0);
}

export function updateCartBadge(count) {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  badge.textContent = count;
  count > 0 ? badge.classList.add('show') : badge.classList.remove('show');
}

const PRODUCTS_CACHE_KEY = 'scatch_products_v1';
const PRODUCTS_CACHE_TTL = 5 * 60 * 1000;

export function getCachedProducts() {
  try {
    const raw = sessionStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return null;

    const { data, savedAt } = JSON.parse(raw);
    if (!data || Date.now() - savedAt > PRODUCTS_CACHE_TTL) {
      sessionStorage.removeItem(PRODUCTS_CACHE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function setCachedProducts(products) {
  try {
    sessionStorage.setItem(
      PRODUCTS_CACHE_KEY,
      JSON.stringify({ data: products, savedAt: Date.now() }),
    );
  } catch {
    // ignore quota errors
  }
}

export const PRODUCT_FIELDS =
  'id, name, price, discount_price, category, image_url, bg_color, panel_color, text_color, is_available, is_best_seller, created_at';
