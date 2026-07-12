import './style.css';
import { supabase } from './supabase.js';
import { showToast, formatPrice, requireAuth, getCartCount, updateCartBadge, productImageUrl } from './utils.js';

function invalidateProductCache() {
  sessionStorage.removeItem('scatch_products_v1');
}

let session = null;

async function init() {
  session = await requireAuth(supabase);
  if (!session) return;

  setupSidebarNav();
  setupColorPickers();
  setupImagePreview();
  setupCreateForm();
  setupLogout();

  getCartCount(supabase, session).then(updateCartBadge);
}

function setupSidebarNav() {
  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.section;
      document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`section-${target}`).classList.add('active');

      if (target === 'all-products') loadAllProducts();
    });
  });
}

function setupColorPickers() {
  const pairs = [
    ['bg-color', 'bg-color-text'],
    ['panel-color', 'panel-color-text'],
    ['text-color', 'text-color-text'],
  ];

  pairs.forEach(([pickerId, textId]) => {
    const picker = document.getElementById(pickerId);
    const text = document.getElementById(textId);

    picker.addEventListener('input', () => { text.value = picker.value; });
    text.addEventListener('input', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(text.value)) picker.value = text.value;
    });
  });
}

function setupImagePreview() {
  const fileInput = document.getElementById('product-image-file');
  const preview = document.getElementById('img-preview');
  const fileNameDisplay = document.getElementById('file-name-display');

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;

    fileNameDisplay.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.add('show');
    };
    reader.readAsDataURL(file);
  });
}

async function loadAllProducts() {
  const wrap = document.getElementById('products-table-wrap');
  wrap.innerHTML = '<div class="loading-grid" style="display:flex;padding:60px 0;"><span></span><span></span><span></span></div>';

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    wrap.innerHTML = '<p style="color:var(--color-error);">Failed to load products.</p>';
    return;
  }

  if (!data || !data.length) {
    wrap.innerHTML = '<p style="color:var(--neutral-400);">No products yet. Create one!</p>';
    return;
  }

  wrap.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>Price</th>
          <th>Category</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(p => `
          <tr data-id="${p.id}">
            <td>
              <img
                class="product-thumb"
                src="${productImageUrl(p.image_url, 80)}"
                alt="${p.name}"
                width="80"
                height="80"
                decoding="async"
                loading="lazy"
              />
            </td>
            <td><strong>${p.name}</strong></td>
            <td>
              ${formatPrice(p.price)}
              ${p.discount_price ? `<br/><span style="font-size:0.75rem; color:var(--color-error);">${formatPrice(p.discount_price)}</span>` : ''}
            </td>
            <td style="text-transform:capitalize;">${p.category}</td>
            <td>
              <span class="avail-badge ${p.is_available ? 'yes' : 'no'}">
                ${p.is_available ? 'Available' : 'Out of stock'}
              </span>
            </td>
            <td>
              <div style="display:flex;gap:6px;">
                <button class="tbl-btn tbl-btn-toggle toggle-btn" data-id="${p.id}" data-available="${p.is_available}">
                  ${p.is_available ? 'Disable' : 'Enable'}
                </button>
                <button class="tbl-btn tbl-btn-danger delete-btn" data-id="${p.id}">Delete</button>
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  wrap.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleAvailability(btn.dataset.id, btn.dataset.available === 'true'));
  });

  wrap.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
}

async function toggleAvailability(id, current) {
  const { error } = await supabase
    .from('products')
    .update({ is_available: !current })
    .eq('id', id);

  if (error) { showToast('Could not update product.', 'error'); return; }
  invalidateProductCache();
  showToast(`Product ${!current ? 'enabled' : 'disabled'}.`, 'info');
  loadAllProducts();
}

async function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) { showToast('Could not delete product.', 'error'); return; }
  invalidateProductCache();
  showToast('Product deleted.', 'success');
  loadAllProducts();
}

function setupCreateForm() {
  const form = document.getElementById('create-form');
  const msg = document.getElementById('create-msg');
  const btn = document.getElementById('create-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('product-name').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const discountRaw = document.getElementById('product-discount').value.trim();
    const discount = discountRaw ? parseFloat(discountRaw) : null;
    const category = document.getElementById('product-category').value;
    const isBestSeller = document.getElementById('product-best-seller').checked;
    const bgColor = document.getElementById('bg-color').value;
    const panelColor = document.getElementById('panel-color').value;
    const textColor = document.getElementById('text-color').value;
    const imageUrl = document.getElementById('product-image-url').value.trim();
    const fileInput = document.getElementById('product-image-file');

    if (!name) { showFormMsg(msg, 'Product name is required.', 'error'); return; }
    if (!price || isNaN(price) || price <= 0) { showFormMsg(msg, 'Valid price is required.', 'error'); return; }
    if (discount !== null && discount >= price) { showFormMsg(msg, 'Discount price must be less than the regular price.', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating...';

    let finalImageUrl = imageUrl || null;

    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const ext = file.name.split('.').pop();
      const path = `products/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file);
      if (uploadError) {
        showFormMsg(msg, 'Image upload failed. Using URL instead.', 'error');
      } else {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
        finalImageUrl = urlData?.publicUrl || finalImageUrl;
      }
    }

    const { error } = await supabase.from('products').insert({
      name,
      price,
      discount_price: discount,
      category,
      is_best_seller: isBestSeller,
      bg_color: bgColor,
      panel_color: panelColor,
      text_color: textColor,
      image_url: finalImageUrl,
      is_available: true,
    });

    btn.disabled = false;
    btn.textContent = 'Create Product';

    if (error) {
      showFormMsg(msg, error.message, 'error');
      return;
    }

    invalidateProductCache();
    showFormMsg(msg, 'Product created successfully!', 'success');
    form.reset();
    document.getElementById('img-preview').classList.remove('show');
    document.getElementById('file-name-display').textContent = 'No file chosen';

    setTimeout(() => {
      document.querySelector('[data-section="all-products"]').click();
    }, 1000);
  });
}

function showFormMsg(el, text, type) {
  el.textContent = text;
  el.className = `auth-msg show ${type}`;
}

function setupLogout() {
  document.getElementById('logout-link').addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.replace('/');
  });
}

init();
