// 管理后台 API
// 功能：验证管理员身份、返回统计数据、用户列表
// 通过 Supabase security definer RPC 查询

/** 获取 Supabase 配置 */
function getSupabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_ANON_KEY || '';
  return {
    url,
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
    },
  };
}

/** 调用 Supabase RPC 函数 */
async function callRPC(name, params) {
  const { url, headers } = getSupabaseConfig();
  const resp = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST', headers,
    body: JSON.stringify(params || {}),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || err.details || `RPC ${name} 失败 (${resp.status})`);
  }
  return resp.json();
}

/** 检查用户是否是管理员 */
async function checkAdmin(userUuid) {
  return await callRPC('check_is_admin', { p_user_uuid: userUuid });
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, user_uuid } = req.body || {};

  if (!user_uuid) {
    return res.status(400).json({ error: '缺少用户标识' });
  }

  try {
    // ---- 权限验证 ----
    if (action === 'check') {
      const isAdmin = await checkAdmin(user_uuid);
      return res.status(200).json({ isAdmin: isAdmin === true });
    }

    // ---- 以下操作需要管理员权限 ----
    const isAdmin = await checkAdmin(user_uuid);
    if (isAdmin !== true) {
      return res.status(403).json({ error: '无管理权限' });
    }

    // ---- 获取统计概览 ----
    if (action === 'stats') {
      const stats = await callRPC('get_admin_stats');
      return res.status(200).json(stats);
    }

    // ---- 获取用户列表 ----
    if (action === 'users') {
      const users = await callRPC('get_admin_users');
      return res.status(200).json(users);
    }

    // ---- 获取指定用户的藏书 ----
    if (action === 'user-books') {
      const { target_user_id } = req.body || {};
      if (!target_user_id) return res.status(400).json({ error: '缺少用户ID' });
      const books = await callRPC('get_admin_user_books', { p_user_id: target_user_id });
      return res.status(200).json(books);
    }

    return res.status(400).json({ error: '未知操作' });
  } catch (e) {
    console.error('[admin] 错误:', e);
    return res.status(500).json({ error: e.message });
  }
}
