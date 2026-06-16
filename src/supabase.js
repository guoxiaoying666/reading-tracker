import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const API_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Auth（通过服务端 API）----

export async function signIn(phone, pin) {
  const resp = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', phone, pin }) });
  const data = await resp.json();
  if (data.error) return { error: data.error };
  localStorage.setItem('session', JSON.stringify({ userId: data.id, phone: data.phone, name: data.name, avatar_url: data.avatar_url }));
  return { profile: data };
}

export async function signUp(phone, pin, name) {
  const resp = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'register', phone, pin, name }) });
  const data = await resp.json();
  if (data.error) return { error: data.error };
  localStorage.setItem('session', JSON.stringify({ userId: data.id, phone: data.phone, name: data.name, avatar_url: data.avatar_url }));
  return { profile: data };
}

export function getSession() {
  try { const s = localStorage.getItem('session'); return s ? JSON.parse(s) : null; } catch { return null; }
}

export function signOut() {
  localStorage.removeItem('session');
  window.location.reload();
}

// ---- Data Sync ----

export async function syncBooks(userId, localBooks) {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/books?user_id=eq.' + userId + '&select=*', { headers: API_HEADERS });
  const cloud = await resp.json();
  const cloudMap = {};
  (cloud || []).forEach(b => cloudMap[b.id] = b);
  for (const local of localBooks) {
    if (local.id && !cloudMap[local.id]) {
      await fetch(SUPABASE_URL + '/rest/v1/books', { method: 'POST', headers: API_HEADERS, body: JSON.stringify({ id: local.id, user_id: userId, title: local.title, author: local.author, translator: local.translator || '', month: local.month, source: local.source, language: local.language, classic: local.classic, fiction: local.fiction, dimension: local.dimension, level2: local.level2, level3: local.level3 || '', childStar: local.childStar || 0, note: local.note || '', isbn: local.isbn || '' }) });
    }
  }
  return cloud || [];
}

export async function syncDiscoveries(userId, localDiscoveries) {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/discoveries?user_id=eq.' + userId + '&select=*', { headers: API_HEADERS });
  const cloud = await resp.json();
  const cloudIds = new Set((cloud || []).map(d => d.id));
  for (const local of localDiscoveries || []) {
    if (!cloudIds.has(local.id)) {
      await fetch(SUPABASE_URL + '/rest/v1/discoveries', { method: 'POST', headers: API_HEADERS, body: JSON.stringify({ id: local.id, user_id: userId, book_id: local.bookId || null, book_title: local.bookTitle || '', discovery: local.discovery || '', question: local.question || '', quote: local.quote || '', original: local.original || '', date: local.date || '' }) });
    }
  }
  return cloud || [];
}
