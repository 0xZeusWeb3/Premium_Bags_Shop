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

export async function requireAuth(supabase) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace('/');
    return null;
  }
  return session;
}

export async function getCartCount(supabase) {
  const { data: { session } } = await supabase.auth.getSession();
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
