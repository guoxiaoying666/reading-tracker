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
  // 【已修复】说说卡现在已经做到"保存时立刻同步云端"（不管是否匿名），
  // 云端才是可靠的数据来源，本地缓存只是临时镜像。退出登录时一并清空，
  // 避免上一个账号的说说卡内容残留在新的匿名身份下被继续看到。
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

/** 【新增】真正从数据库删除一本书（而不是靠重新同步剩余列表） */
export async function deleteBookRemote(user_uuid, book_id) {
  if (!user_uuid || !book_id) return false;
  try {
    const resp = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_book', user_uuid, book_id }),
    });
    const data = await resp.json();
    if (data.error) {
      console.warn('[deleteBookRemote] 失败:', data.error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[deleteBookRemote] 异常:', e.message);
    return false;
  }
}

/** 从云端拉取发现卡（登录后每次进入发现卡Tab使用）
 *  【已修复】原来是前端直接查 Supabase REST 接口，用的是权限较低的公共密钥，
 *  如果表开了行级安全（RLS），会被静默拦截、返回空结果（不报错，查不到任何数据）。
 *  改成跟书籍一样，走服务端 /api/auth 接口，由数据库的安全函数处理，绕开这个限制。
 */
export async function fetchDiscoveries(user_uuid) {
  if (!user_uuid) return [];
  try {
    const resp = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fetch_discoveries', user_uuid }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data.discoveries) ? data.discoveries : [];
  } catch (e) {
    console.warn('[fetchDiscoveries] 失败:', e.message);
    return [];
  }
}

/** 【新增】保存/更新一张说说卡到云端 —— 走服务端安全接口，替代前端直连数据库 */
export async function saveDiscoveryRemote(user_uuid, card) {
  if (!user_uuid) return false;
  try {
    const resp = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_discovery',
        user_uuid,
        id: card.id,
        book_id: card.book_id || null,
        book_title: card.book_title || '',
        discovery: card.discovery || '',
        question: card.question || '',
        quote: card.quote || '',
        original: card.original || '',
        feedback_emoji: card.feedback_emoji || '',
        user_voice: card.user_voice || '',
        date: card.date || new Date().toISOString().slice(0, 10),
      }),
    });
    const data = await resp.json();
    if (data.error) {
      console.warn('[saveDiscoveryRemote] 失败:', data.error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[saveDiscoveryRemote] 异常:', e.message);
    return false;
  }
}

/** 将本地未同步的说说卡推送到云端（登录/注册/升级时调用） */
export async function syncCards(user_uuid) {
  if (!user_uuid) return;
  try {
    const raw = localStorage.getItem('wonderead-cards');
    if (!raw) return;
    const localCards = JSON.parse(raw);
    if (!Array.isArray(localCards) || localCards.length === 0) return;
    const cardsToSync = localCards.filter(c => !c._synced);
    if (cardsToSync.length === 0) return;

    for (const card of cardsToSync) {
      // 【已修复】改用走服务端安全接口的 saveDiscoveryRemote，
      // 不再前端直连数据库，避免被 RLS 静默拦截导致数据表面"同步成功"、实际读不到。
      const ok = await saveDiscoveryRemote(user_uuid, {
        id: card._id,
        book_id: card.bookId || null,
        book_title: card.bookTitle || '',
        discovery: card.discovery || '',
        question: card.thinking || '',
        quote: card.quote || '',
        original: card.userVoice || '',
        feedback_emoji: card.feedbackEmoji || '',
        user_voice: card.userVoice || '',
        date: new Date(card.savedAt || Date.now()).toISOString().slice(0, 10),
      });
      if (ok) card._synced = true;
      else console.warn('[syncCards] 同步失败: id=', card._id);
    }
    localStorage.setItem('wonderead-cards', JSON.stringify(localCards));
    console.log(`[syncCards] 已同步 ${cardsToSync.length} 张卡片到云端`);
  } catch (e) {
    console.warn('[syncCards] 同步异常:', e.message);
  }
}
