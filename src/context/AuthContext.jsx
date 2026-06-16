import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, signIn, signUp, signOut, getSession } from '../supabase';

const AuthContext = createContext(null);

const STORAGE_KEY = 'reading-tracker-session';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { userId, phone, profile }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = getSession();
    if (saved?.userId) {
      // 验证 session 有效性
      supabase.from('profiles').select('id, phone, name, avatar_url').eq('id', saved.userId).single()
        .then(({ data }) => {
          if (data) setSession({ userId: data.id, phone: data.phone, profile: data });
          else localStorage.removeItem('session');
        })
        .catch(() => {});
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (phone, pin) => {
    const result = await signIn(phone, pin);
    if (result.profile) {
      setSession({ userId: result.profile.id, phone: result.profile.phone, profile: result.profile });
    }
    return result;
  }, []);

  const register = useCallback(async (phone, pin, name) => {
    const result = await signUp(phone, pin, name);
    if (result.profile) {
      setSession({ userId: result.profile.id, phone: result.profile.phone, profile: result.profile });
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    signOut();
    setSession(null);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!session?.userId) return;
    const { error } = await supabase.from('profiles').update(updates).eq('id', session.userId);
    if (!error) setSession(prev => ({ ...prev, profile: { ...prev.profile, ...updates } }));
  }, [session]);

  const value = { session, loading, login, register, logout, updateProfile };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
