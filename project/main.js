import './style.css';
import { showToast } from './utils.js';

setupSignup();
setupLogin();

let supabasePromise;

function getSupabase() {
  if (!supabasePromise) {
    supabasePromise = import('./supabase.js').then((mod) => mod.supabase);
  }
  return supabasePromise;
}

getSupabase().then(async (supabase) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) window.location.replace('/shop.html');
});

function setupSignup() {
  const form = document.getElementById('signup-form');
  const msg = document.getElementById('signup-msg');
  const btn = document.getElementById('signup-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    if (!name || !email || !password) {
      showMsg(msg, 'Please fill in all fields.', 'error');
      return;
    }

    if (password.length < 6) {
      showMsg(msg, 'Password must be at least 6 characters.', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating...';

    const supabase = await getSupabase();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) {
      showMsg(msg, error.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Create My Account';
      return;
    }

    showMsg(msg, 'Account created! Redirecting...', 'success');
    setTimeout(() => window.location.replace('/shop.html'), 800);
  });
}

function setupLogin() {
  const form = document.getElementById('login-form');
  const msg = document.getElementById('login-msg');
  const btn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      showMsg(msg, 'Please enter email and password.', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Logging in...';

    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showMsg(msg, error.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Login';
      return;
    }

    window.location.replace('/shop.html');
  });
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = `auth-msg show ${type}`;
}
