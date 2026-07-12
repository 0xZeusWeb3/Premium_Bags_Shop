import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate('/shop', { replace: true });
  }, [session, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ text: '', type: '' });

    if (mode === 'signup') {
      if (!name.trim()) return setMsg({ text: 'Please enter your name.', type: 'error' });
      if (password.length < 6) return setMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
    }

    if (!email.trim() || !password) return setMsg({ text: 'Please fill in all fields.', type: 'error' });

    setLoading(true);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      });
      setLoading(false);
      if (error) return setMsg({ text: error.message, type: 'error' });
      setMsg({ text: 'Account created! Redirecting...', type: 'success' });
      setTimeout(() => navigate('/shop'), 800);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setMsg({ text: error.message, type: 'error' });
      navigate('/shop');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <h1 className="auth-visual-title">Scatch.</h1>
          <p className="auth-visual-tagline">Premium bags for every journey.</p>
          <div className="auth-visual-features">
            <div className="auth-feature"><span className="auth-feature-dot"></span> Handcrafted quality</div>
            <div className="auth-feature"><span className="auth-feature-dot"></span> Free shipping worldwide</div>
            <div className="auth-feature"><span className="auth-feature-dot"></span> 30-day returns</div>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setMsg({ text: '', type: '' }); }}
            >Login</button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => { setMode('signup'); setMsg({ text: '', type: '' }); }}
            >Sign Up</button>
          </div>

          <p className="auth-heading">{mode === 'login' ? 'Welcome back' : 'Create your account'}</p>
          <p className="auth-subheading">{mode === 'login' ? 'Sign in to continue shopping' : 'Join us today and start shopping'}</p>

          <form onSubmit={handleSubmit} className="auth-form" novalidate>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {msg.text && <div className={`auth-msg show ${msg.type}`}>{msg.text}</div>}

            <button type="submit" className="btn btn-dark auth-submit-btn" disabled={loading}>
              {loading ? <span className="spinner"></span> : (mode === 'login' ? 'Login' : 'Create My Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
