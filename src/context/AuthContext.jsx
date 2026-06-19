import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { anonymousLogin, signIn, signUp, upgradeAccount, signOut, getLocalUser, supabase } from '../supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { user_uuid, is_anonymous, phone, name, avatar_url }
  const [loading, setLoading] = useState(true);

  // 初始化：检查 localStorage，若无则自动创建匿名用户
  useEffect(() => {
    (async () => {
      const local = getLocalUser();
      if (local?.user_uuid) {
        // 已有本地用户标识，直接使用（无需服务端验证，提升首屏速度）
        setSession(local);
        setLoading(false);
      } else {
        // 首次访问，创建匿名用户
        const result = await anonymousLogin();
        if (result.session) {
          setSession(result.session);
        }
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (phone, pin) => {
    const result = await signIn(phone, pin);
    if (result.session) {
      setSession(result.session);
    }
    return result;
  }, []);

  const register = useCallback(async (phone, pin, name) => {
    const result = await signUp(phone, pin, name);
    if (result.session) {
      setSession(result.session);
    }
    return result;
  }, []);

  const upgrade = useCallback(async (phone, pin) => {
    if (!session?.user_uuid) return { error: '缺少用户标识' };
    const result = await upgradeAccount(session.user_uuid, phone, pin);
    if (result.session) {
      setSession(result.session);
    }
    return result;
  }, [session]);

  const logout = useCallback(() => {
    signOut();
    setSession(null);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!session?.user_uuid) return;
    const { error } = await supabase.from('profiles').update(updates).eq('id', session.user_uuid);
    if (!error) setSession(prev => ({ ...prev, ...updates }));
  }, [session]);

  const value = { session, loading, login, register, upgrade, logout, updateProfile };

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
