import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, AuthContextType } from '../lib/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('pos_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data: userData, error: rpcError } = await supabase
      .rpc('authenticate_user', { user_email: email, user_password: password })
      .maybeSingle();

    if (rpcError || !userData) {
      throw new Error('Invalid credentials');
    }

    const authResult = await supabase.auth.signInWithPassword({ email, password });

    if (authResult.error) {
      throw new Error('Failed to authenticate with Supabase');
    }

    const user: User = {
      id: userData.id,
      email: userData.email,
      role: userData.role as 'manager' | 'cashier',
      branch_id: userData.branch_id,
      full_name: userData.full_name,
    };

    setUser(user);
    localStorage.setItem('pos_user', JSON.stringify(user));
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('pos_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
