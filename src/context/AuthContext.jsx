import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { anonymousLogin, signIn, signUp, upgradeAccount, signOut, getLocalUser, supabase, syncBooks, syncCards } from '../supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 初始化
  useEffect(() => {
    (async () => {
      try {
        const local = getLocalUser();
        if (local?.user_uuid) {
          setSession(local);
        } else {
          const result = await anonymousLogin();
          if (result.session) {
            setSession(result.session);
          }
        }
      } catch (e) {
        console.warn('Auth init error, falling back to guest mode:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** 登录/注册前：将访客本地数据同步到服务端 */
  const syncAndClearLocalData = useCallback(async (user_uuid) => {
    try {
      // 同步书目
      const raw = localStorage.getItem('reading-tracker-books');
      if (raw) {
        const localBooks = JSON.parse(raw);
        if (Array.isArray(localBooks) && localBooks.length > 0) {
          await syncBooks(user_uuid, localBooks);
          localStorage.removeItem('reading-tracker-books');
          localStorage.removeItem('reading-tracker-books-version');
          console.log(`[Auth] 已同步 ${localBooks.length} 本书到云端`);
        }
      }
      // 同步说说卡片
      await syncCards(user_uuid);
    } catch (e) {
      console.warn('[Auth] 同步访客数据失败，继续执行:', e.message);
    }
  }, []);

  const login = useCallback(async (phone, pin) => {
    const result = await signIn(phone, pin);
    if (result.session) {
      await syncAndClearLocalData(result.session.user_uuid);
      setSession(result.session);
    }
    return result;
  }, [syncAndClearLocalData]);

  const register = useCallback(async (phone, pin, name) => {
    const result = await signUp(phone, pin, name);
    if (result.session) {
      await syncAndClearLocalData(result.session.user_uuid);
      setSession(result.session);
    }
    return result;
  }, [syncAndClearLocalData]);

  const upgrade = useCallback(async (phone, pin) => {
    if (!session?.user_uuid) return { error: '缺少用户标识' };
    const result = await upgradeAccount(session.user_uuid, phone, pin);
    if (result.session) {
      // 同步本地数据到云端后再设置 session
      await syncAndClearLocalData(result.session.user_uuid);
      setSession(result.session);
    }
    return result;
  }, [session, syncAndClearLocalData]);

  const logout = useCallback(() => {
    signOut();
    setSession(null);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!session?.user_uuid) return;
    const { error } = await supabase.from('profiles').update(updates).eq('id', session.user_uuid);
    if (!error) setSession(prev => ({ ...prev, ...updates }));
  }, [session]);

  // 检查管理员权限
  useEffect(() => {
    if (session?.user_uuid && !session.is_anonymous) {
      fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', user_uuid: session.user_uuid }),
      })
        .then(r => r.json())
        .then(data => setIsAdmin(data.isAdmin === true))
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
  }, [session]);

  const value = { session, loading, isAdmin, login, register, upgrade, logout, updateProfile };

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
