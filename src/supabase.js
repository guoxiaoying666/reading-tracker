import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const API_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- 用户标识（user_uuid）统一管理 ----
const USER_KEY = 'reading-tracker-user';

export function getLocalUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalUser(data) {
  localStorage.setItem(USER_KEY, JSON.stringify(data));
}

export function clearLocalUser() {
  localStorage.removeItem(USER_KEY);
}

/** 解析 API 响应，统一处理 HTTP 状态码和数据中的 error 字段 */
async function apiFetch(url, options) {
  const resp = await fetch(url, options);
  const data = await resp.json();
  if (!resp.ok && !data.error) {
    return { error: '请求失败 (' + resp.status + ')' };
  }
  if (data.error) return { error: data.error };
  return data;
}

// ---- Auth API ----

/** 匿名登录 — 获取或创建匿名用户 */
export async function anonymousLogin() {
  let local = getLocalUser();
  const user_uuid = local?.user_uuid || uuidv4();

  const data = await apiFetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'anonymous', user_uuid }),
  });
  if (data.error) return { error: data.error };

  const session = {
    user_uuid: data.user_uuid,
    is_anonymous: data.is_anonymous !== false,
    phone: data.phone || null,
    name: data.name || '访客',
    avatar_url: data.avatar_url || '',
  };
  saveLocalUser(session);
  return { session };
}

/** 手机号+密码 登录（正式用户） */
export async function signIn(phone, pin) {
  const data = await apiFetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', phone, pin }),
  });
  if (data.error) return { error: data.error };

  const session = {
    user_uuid: data.user_uuid,
    is_anonymous: false,
    phone: data.phone || null,
    name: data.name || '',
    avatar_url: data.avatar_url || '',
  };
  saveLocalUser(session);
  return { session };
}

/** 手机号+密码 注册（创建新正式用户） */
export async function signUp(phone, pin, name) {
  const data = await apiFetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', phone, pin, name }),
  });
  if (data.error) return { error: data.error };

  const session = {
    user_uuid: data.user_uuid,
    is_anonymous: false,
    phone: data.phone || null,
    name: data.name || name || '',
    avatar_url: data.avatar_url || '',
  };
  saveLocalUser(session);
  return { session };
}

/** 匿名用户升级为正式用户（绑定手机号+密码） */
export async function upgradeAccount(user_uuid, phone, pin) {
  const data = await apiFetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'upgrade', user_uuid, phone, pin }),
  });
  if (data.error) return { error: data.error };

  const session = {
    user_uuid: data.user_uuid,
    is_anonymous: false,
    phone: data.phone || null,
    name: data.name || '',
    avatar_url: data.avatar_url || '',
  };
  saveLocalUser(session);
  return { session };
}

/** 登出 / 切换到匿名模式 */
export function signOut() {
  clearLocalUser();
  // ⚠️ 绝不在注销时调用删除数据库的接口。仅做前端视图数据清理。
  // 清除本地缓存的书目数据，使退出后看到空白空状态
  localStorage.removeItem('reading-tracker-books');
  localStorage.removeItem('reading-tracker-books-version');
  localStorage.removeItem('wonderead-cards');
  window.location.reload();
}

// ---- Data Sync（业务数据同步到 Supabase，走服务端 API）----

export async function syncBooks(user_uuid, localBooks) {
  // 通过服务端 API 同步，避免浏览器直连 Supabase 的权限问题
  const resp = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'sync_books',
      user_uuid,
      books: localBooks.map(b => ({
        id: b.id,
        title: b.title,
        author: b.author || '',
        translator: b.translator || '',
        month: b.month,
        source: b.source || '',
        language: b.language || '外文',
        classic: b.classic || false,
        fiction: b.fiction || '虚构',
        dimension: b.dimension || 'narrative',
        level2: b.level2 || '',
        level3: b.level3 || '',
        childStar: b.childStar || 0,
        note: b.note || '',
        isbn: b.isbn || '',
      })),
    }),
  });
  const data = await resp.json();
  if (data.error) {
    console.warn('[sync] 同步失败:', data.error);
    return [];
  }
  return data.books || [];
}

/** 从云端拉取书目（登录后首次加载用） */
export async function fetchCloudBooks(user_uuid) {
  if (!user_uuid) return [];
  try {
    const resp = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fetch_books', user_uuid }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data.books) ? data.books : [];
  } catch (e) {
    console.warn('[fetchCloudBooks] 失败:', e.message);
    return [];
  }
}

/** 从云端拉取发现卡（登录后每次进入发现卡Tab使用） */
export async function fetchDiscoveries(user_uuid) {
  if (!user_uuid) return [];
  try {
    const resp = await fetch(
      SUPABASE_URL + '/rest/v1/discoveries?user_id=eq.' + user_uuid + '&select=*&order=created_at.desc',
      { headers: API_HEADERS }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('[fetchDiscoveries] 失败:', e.message);
    return [];
  }
}
