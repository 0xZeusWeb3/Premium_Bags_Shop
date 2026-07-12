import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { getCartCount } from '../lib/utils';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { session } = useAuth();
  const [count, setCount] = useState(0);

  const refreshCount = useCallback(async () => {
    if (!session) {
      setCount(0);
      return;
    }
    const next = await getCartCount(supabase, session);
    setCount(next);
  }, [session]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const value = useMemo(() => ({ count, refreshCount }), [count, refreshCount]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
