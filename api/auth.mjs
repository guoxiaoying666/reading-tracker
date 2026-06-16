// Vercel Serverless Function — 用户注册/登录
// 用 Supabase RPC（security definer 函数）绕过 RLS 限制
// register_user / verify_pin 都是 setof profiles，返回 [{...}] 数组

const SUPABASE_URL = 'https://cdhlaquicakoafmkcbgv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xBuraajcUUz5nfq0EJ0JNA_Kq-X7fcX';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
};

function pickProfile(arr) {
  // 从 [{...}] 数组中提取有用的字段
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const p = arr[0];
  if (!p || !p.id) return null;
  return { id: p.id, phone: p.phone, name: p.name, avatar_url: p.avatar_url || '' };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(200).end();
  }

  const { action, phone, pin, name } = req.body || {};
  const cleanPhone = (phone || '').trim();
  const cleanPin = (pin || '').trim();
  const cleanName = (name || '').trim();

  if (!cleanPhone) {
    return res.status(200).json({ error: '手机号不能为空' });
  }

  try {
    // ---- 登录 ----
    if (action === 'login') {
      if (!cleanPin) return res.status(200).json({ error: '请输入密码' });
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_pin`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ p_phone: cleanPhone, p_pin: cleanPin }),
      });
      const data = await resp.json();
      const profile = pickProfile(data);
      if (!profile) return res.status(200).json({ error: '手机号或密码错误' });
      return res.status(200).json(profile);
    }

    // ---- 注册 ----
    if (action === 'register') {
      if (!cleanPin) return res.status(200).json({ error: '请输入密码' });
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/register_user`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({
          p_phone: cleanPhone, p_pin: cleanPin, p_name: cleanName || '小读者',
        }),
      });
      const data = await resp.json();
      // 检查是否返回了错误
      if (data && data.code) {
        if (data.code === '23505') return res.status(200).json({ error: '该手机号已注册，请直接登录' });
        return res.status(200).json({ error: '注册失败：' + (data.message || '服务器错误') });
      }
      const profile = pickProfile(data);
      if (!profile) return res.status(200).json({ error: '注册失败：' + JSON.stringify(data) });
      return res.status(200).json(profile);
    }

    return res.status(200).json({ error: '未知操作' });
  } catch (e) {
    return res.status(200).json({ error: '服务器错误：' + e.message });
  }
}
