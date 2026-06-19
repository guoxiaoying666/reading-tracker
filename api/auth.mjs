// 用户认证 API — 支持匿名用户 / 手机号登录 / 注册 / 升级绑定
// 通过 Supabase security definer RPC 绕过 RLS 限制

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
};

/** 调用 Supabase RPC 函数 */
async function callRPC(name, params) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: HEADERS,
    body: JSON.stringify(params || {}),
  });
  return resp.json();
}

/** 从 [{...}] 数组中提取第一个用户 profile */
function pickProfile(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const p = arr[0];
  if (!p || !p.id) return null;
  return {
    user_uuid: p.id,
    phone: p.phone || null,
    name: p.name || '',
    avatar_url: p.avatar_url || '',
    is_anonymous: p.is_anonymous !== false, // true 除非明确设为 false
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(200).end();
  }

  const { action, user_uuid, phone, pin, name } = req.body || {};
  const cleanPhone = (phone || '').trim();
  const cleanPin = (pin || '').trim();
  const cleanName = (name || '').trim();

  try {
    // =========================================
    // 1. 匿名登录 / 获取匿名用户
    //    前端传 user_uuid（localStorage 中的），若不存在则自动创建
    // =========================================
    if (action === 'anonymous') {
      if (user_uuid) {
        // 检查是否已存在
        const existing = await callRPC('get_user_by_uuid', { p_user_uuid: user_uuid });
        if (existing && Array.isArray(existing) && existing.length > 0) {
          return res.status(200).json(pickProfile(existing));
        }
      }

      // 不存在则创建新匿名用户
      const newUuid = user_uuid || crypto.randomUUID();
      const result = await callRPC('create_anonymous_user', { p_user_uuid: newUuid });
      const profile = pickProfile(result);
      if (!profile) {
        return res.status(200).json({ error: '创建匿名用户失败' });
      }
      return res.status(200).json(profile);
    }

    // =========================================
    // 2. 手机号+密码 登录
    // =========================================
    if (action === 'login') {
      if (!cleanPhone) return res.status(200).json({ error: '请输入手机号' });
      if (!cleanPin) return res.status(200).json({ error: '请输入密码' });
      const data = await callRPC('verify_pin', { p_phone: cleanPhone, p_pin: cleanPin });
      const profile = pickProfile(data);
      if (!profile) return res.status(200).json({ error: '手机号或密码错误' });
      return res.status(200).json(profile);
    }

    // =========================================
    // 3. 手机号+密码 注册（新建正式用户）
    // =========================================
    if (action === 'register') {
      if (!cleanPhone) return res.status(200).json({ error: '请输入手机号' });
      if (!cleanPin) return res.status(200).json({ error: '请输入密码' });

      // 检查手机号是否已被绑定
      const bound = await callRPC('check_phone_bound', { p_phone: cleanPhone });
      if (bound === true) {
        return res.status(200).json({ error: '该手机号已被注册，请直接登录' });
      }

      const data = await callRPC('register_user', {
        p_phone: cleanPhone,
        p_pin: cleanPin,
        p_name: cleanName || '小读者',
      });

      // 处理唯一约束冲突（并发注册）
      if (data && data.code === '23505') {
        return res.status(200).json({ error: '该手机号已被注册' });
      }

      const profile = pickProfile(data);
      if (!profile) return res.status(200).json({ error: '注册失败：' + JSON.stringify(data) });
      return res.status(200).json(profile);
    }

    // =========================================
    // 4. 匿名用户升级为正式用户（绑定手机号+密码）
    // =========================================
    if (action === 'upgrade') {
      if (!user_uuid) return res.status(200).json({ error: '缺少用户标识' });
      if (!cleanPhone) return res.status(200).json({ error: '请输入手机号' });
      if (!cleanPin) return res.status(200).json({ error: '请输入密码' });

      const data = await callRPC('upgrade_user', {
        p_user_uuid: user_uuid,
        p_phone: cleanPhone,
        p_pin: cleanPin,
      });

      const profile = pickProfile(data);
      if (!profile) {
        // 手机号已被占用
        return res.status(200).json({ error: '该手机号已被其他账号绑定' });
      }
      return res.status(200).json(profile);
    }

    return res.status(200).json({ error: '未知操作' });
  } catch (e) {
    return res.status(200).json({ error: '服务器错误：' + e.message });
  }
}
