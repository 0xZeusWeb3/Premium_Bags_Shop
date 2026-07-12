import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ showCart = true, showAccount = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (!session) return;
    let mounted = true;
    supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', session.user.id)
      .then(({ data }) => {
        if (mounted && data) setCartCount(data.reduce((s, i) => s + i.quantity, 0));
      });
  }, [session, location.pathname]);

  async function handleSignOut() {
    await signOut();
    setShowLogoutModal(false);
    navigate('/');
  }

  return (
    <>
      <nav className="nav">
        <Link to="/shop" className="nav-brand">LuxeCarry</Link>
        <ul className="nav-links">
          <li><Link to="/shop" className={location.pathname === '/shop' ? 'active' : ''}>Home</Link></li>
          <li><Link to="/shop" className={location.pathname === '/shop' ? 'active' : ''}>Products</Link></li>
          {showCart && (
            <li>
              <Link to="/cart" className="nav-cart-wrap">
                Cart
                {cartCount > 0 && <span className="cart-count-badge show">{cartCount}</span>}
              </Link>
            </li>
          )}
          {showAccount && (
            <li><a href="#" onClick={(e) => { e.preventDefault(); setShowLogoutModal(true); }}>My account</a></li>
          )}
          {session && (
            <li><Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>Admin</Link></li>
          )}
        </ul>
      </nav>

      {showLogoutModal && (
        <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && setShowLogoutModal(false)}>
          <div className="modal">
            <p className="modal-title">Sign out</p>
            <p className="modal-body">Are you sure you want to sign out of your account?</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button className="btn btn-dark" onClick={handleSignOut}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
