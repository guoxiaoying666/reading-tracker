import { createClient } from '@supabase/supabase-js';

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

// ---- Auth API ----

/**
 * 匿名登录 — 获取或创建匿名用户
 * 前端本地生成 user_uuid（crypto.randomUUID()），存 localStorage
 * 调用后端 API 确认该 uuid 在数据库中存在
 */
export async function anonymousLogin() {
  let local = getLocalUser();
  const user_uuid = local?.user_uuid || crypto.randomUUID();

  const resp = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'anonymous', user_uuid }),
  });
  const data = await resp.json();
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
  const resp = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', phone, pin }),
  });
  const data = await resp.json();
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
  const resp = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', phone, pin, name }),
  });
  const data = await resp.json();
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
  const resp = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'upgrade', user_uuid, phone, pin }),
  });
  const data = await resp.json();
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
  window.location.reload();
}

// ---- Data Sync（业务数据同步到 Supabase）----

export async function syncBooks(user_uuid, localBooks) {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/books?user_id=eq.' + user_uuid + '&select=*', { headers: API_HEADERS });
  const cloud = await resp.json();
  const cloudMap = {};
  (cloud || []).forEach(b => cloudMap[b.id] = b);
  for (const local of localBooks) {
    if (local.id && !cloudMap[local.id]) {
      await fetch(SUPABASE_URL + '/rest/v1/books', {
        method: 'POST', headers: API_HEADERS,
        body: JSON.stringify({ id: local.id, user_id: user_uuid, title: local.title, author: local.author, translator: local.translator || '', month: local.month, source: local.source, language: local.language, classic: local.classic, fiction: local.fiction, dimension: local.dimension, level2: local.level2, level3: local.level3 || '', childStar: local.childStar || 0, note: local.note || '', isbn: local.isbn || '' }),
      });
    }
  }
  return cloud || [];
}

export async function syncDiscoveries(user_uuid, localDiscoveries) {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/discoveries?user_id=eq.' + user_uuid + '&select=*', { headers: API_HEADERS });
  const cloud = await resp.json();
  const cloudIds = new Set((cloud || []).map(d => d.id));
  for (const local of localDiscoveries || []) {
    if (!cloudIds.has(local.id)) {
      await fetch(SUPABASE_URL + '/rest/v1/discoveries', {
        method: 'POST', headers: API_HEADERS,
        body: JSON.stringify({ id: local.id, user_id: user_uuid, book_id: local.bookId || null, book_title: local.bookTitle || '', discovery: local.discovery || '', question: local.question || '', quote: local.quote || '', original: local.original || '', date: local.date || '' }),
      });
    }
  }
  return cloud || [];
}
