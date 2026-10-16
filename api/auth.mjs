// 用户认证 API — 支持匿名用户 / 手机号登录 / 注册 / 升级绑定
// 通过 Supabase security definer RPC 绕过 RLS 限制

import bcrypt from 'bcryptjs';

/** 获取 Supabase 配置（运行时读取，避免模块加载时 process.env 尚未注入） */
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
  // 【已修复】有些函数（比如 delete_user_book）声明为 returns void，
  // 成功执行后 Supabase 会返回空内容，直接 resp.json() 解析空字符串会报错
  // "Unexpected end of JSON input"。这里先读文本，空的话直接当作成功处理。
  const text = await resp.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return { error: text };
  }
}

/** 调用 Supabase REST API 查询 */
async function restQuery(endpoint) {
  const { url, headers } = getSupabaseConfig();
  const resp = await fetch(url + endpoint, { headers });
  const data = await resp.json();
  if (!resp.ok) return { error: data.message || data.details || '查询失败' };
  return data;
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
    return res.status(204).end();
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
    console.log('✅ 收到 /api/auth 请求');

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
      console.log('🧐 [调试] 匿名用户 RPC 返回结果:', result); 
      const profile = pickProfile(result);
      if (!profile) {
        return res.status(500).json({ error: '创建匿名用户失败' });
      }
      return res.status(201).json(profile);
    }

    // =========================================
    // 2. 手机号+密码 登录
    //    通过 RPC 获取用户（绕过 RLS），Node.js 端用 bcrypt 比对
    // =========================================
    if (action === 'login') {
      if (!cleanPhone) return res.status(400).json({ error: '请输入手机号' });
      if (!cleanPin) return res.status(400).json({ error: '请输入密码' });

      let profile = null;
      let needsMigration = false;
      let user = null;

      // 方案A：通过 verify_pin RPC
      try {
        const data = await callRPC('verify_pin', { p_phone: cleanPhone, p_pin: cleanPin });
        if (Array.isArray(data) && data.length > 0) user = data[0];
      } catch (_) {}

      // 方案B：通过 get_user_by_phone RPC（推荐，更简洁）
      if (!user) {
        try {
          const data = await callRPC('get_user_by_phone', { p_phone: cleanPhone });
          if (Array.isArray(data) && data.length > 0) user = data[0];
        } catch (_) {}
      }

      if (!user) return res.status(401).json({ error: '手机号或密码错误' });

      const storedHash = user.pin_hash || '';
      let valid = false;
      if (storedHash.startsWith('$2')) {
        valid = bcrypt.compareSync(cleanPin, storedHash);
      } else {
        const { createHash } = await import('crypto');
        valid = createHash('sha256').update(cleanPin).digest('hex') === storedHash;
        if (valid) needsMigration = true;
      }

      if (!valid) return res.status(401).json({ error: '手机号或密码错误' });

      profile = pickProfile([user]);

      // 旧 SHA256 用户迁移到 bcrypt
      if (needsMigration) {
        try {
          const { url: su, headers: sh } = getSupabaseConfig();
          const bcryptHash = bcrypt.hashSync(cleanPin, 10);
          await fetch(su + '/rest/v1/profiles?id=eq.' + encodeURIComponent(profile.user_uuid), {
            method: 'PATCH', headers: sh,
            body: JSON.stringify({ pin_hash: bcryptHash }),
          });
          console.log('[auth] 已迁移用户 ' + cleanPhone + ' 到 bcrypt');
        } catch (e) {
          console.warn('[auth] bcrypt 迁移失败（不影响登录）:', e.message);
        }
      }

      return res.status(200).json(profile);
    }

    // =========================================
    // 3. 手机号+密码 注册（新建正式用户）
    // =========================================
    if (action === 'register') {
      if (!cleanPhone) return res.status(400).json({ error: '请输入手机号' });
      if (!cleanPin) return res.status(400).json({ error: '请输入密码' });

      // 检查手机号是否已被绑定
      const bound = await callRPC('check_phone_bound', { p_phone: cleanPhone });
      if (bound === true) {
        return res.status(409).json({ error: '该手机号已被注册，请直接登录' });
      }

      const data = await callRPC('register_user', {
        p_phone: cleanPhone,
        p_pin: cleanPin,
        p_name: cleanName || '小读者',
      });

      // 处理唯一约束冲突（并发注册）
      if (data && data.code === '23505') {
        return res.status(409).json({ error: '该手机号已被注册' });
      }

      const profile = pickProfile(data);
      if (!profile) return res.status(500).json({ error: '注册失败：' + JSON.stringify(data) });
      return res.status(201).json(profile);
    }

    // =========================================
    // 4. 匿名用户升级为正式用户（绑定手机号+密码）
    // =========================================
    if (action === 'upgrade') {
      if (!user_uuid) return res.status(400).json({ error: '缺少用户标识' });
      if (!cleanPhone) return res.status(400).json({ error: '请输入手机号' });
      if (!cleanPin) return res.status(400).json({ error: '请输入密码' });

      const data = await callRPC('upgrade_user', {
        p_user_uuid: user_uuid,
        p_phone: cleanPhone,
        p_pin: cleanPin,
      });

      const profile = pickProfile(data);
      if (!profile) {
        return res.status(409).json({ error: '该手机号已被其他账号绑定' });
      }
      return res.status(200).json(profile);
    }

    // =========================================
    // 5. 修改密码
    // =========================================
    if (action === 'change_password') {
      const { old_pin, new_pin } = req.body || {};
      if (!user_uuid) return res.status(401).json({ error: '未登录' });
      if (!old_pin || !new_pin) return res.status(400).json({ error: '请输入密码' });

      try {
        const check = await restQuery('/rest/v1/profiles?id=eq.' + encodeURIComponent(user_uuid) + '&select=id,pin_hash');
        if (!Array.isArray(check) || check.length === 0) {
          return res.status(404).json({ error: '用户不存在' });
        }

        const storedHash = check[0].pin_hash || '';

        let valid = false;
        if (storedHash.startsWith('$2')) {
          valid = bcrypt.compareSync(old_pin, storedHash);
        } else {
          // 旧式 SHA256 回退
          const { createHash } = await import('crypto');
          valid = createHash('sha256').update(old_pin).digest('hex') === storedHash;
        }

        if (!valid) return res.status(401).json({ error: '当前密码错误' });

        const { url: su2, headers: sh2 } = getSupabaseConfig();
        const newBcryptHash = bcrypt.hashSync(new_pin, 10);
        const resp = await fetch(su2 + '/rest/v1/profiles?id=eq.' + encodeURIComponent(user_uuid), {
          method: 'PATCH', headers: sh2,
          body: JSON.stringify({ pin_hash: newBcryptHash }),
        });
        if (!resp.ok) {
          const errData = await resp.json();
          return res.status(500).json({ error: '修改失败: ' + (errData.message || '') });
        }
        return res.status(200).json({ success: true });
      } catch (e) {
        return res.status(500).json({ error: '系统错误: ' + e.message });
      }
    }

    // =========================================
    // 6. 同步书目（注册时从 localStorage 推送到云端）
    // =========================================
    if (action === 'sync_books') {
      const { user_uuid: uid, books } = req.body || {};
      if (!uid) return res.status(400).json({ error: '缺少用户标识' });
      if (!Array.isArray(books) || books.length === 0) {
        return res.status(200).json({ books: [] });
      }

      const result = await callRPC('batch_sync_books', {
        p_books: books,
        p_user_id: uid,
      });

      return res.status(200).json({ books: result });
    }

    // =========================================
    // 7. 获取用户书目（登录后从云端拉取）
    // =========================================
    if (action === 'fetch_books') {
      const { user_uuid: uid } = req.body || {};
      if (!uid) return res.status(400).json({ error: '缺少用户标识' });

      // 通过 RPC 查询，避免浏览器直连 Supabase REST 的权限问题
      const result = await callRPC('get_user_books', { p_user_id: uid });
      return res.status(200).json({ books: Array.isArray(result) ? result : [] });
    }

    // =========================================
    // 8. 【新增】删除单本书 —— 真正从数据库删除该记录
    //    之前删除只靠 sync_books 重新同步"剩余列表"，
    //    如果 batch_sync_books 内部只做 upsert、不做反向删除，
    //    被删的书会一直留在数据库里，下次登录又被拉回来。
    //    这里加一个明确、独立的删除动作，直接执行 DELETE。
    // =========================================
    if (action === 'delete_book') {
      const { user_uuid: uid, book_id } = req.body || {};
      if (!uid) return res.status(400).json({ error: '缺少用户标识' });
      if (!book_id) return res.status(400).json({ error: '缺少书籍ID' });

      try {
        await callRPC('delete_user_book', { p_book_id: book_id, p_user_id: uid });
        return res.status(200).json({ success: true });
      } catch (e) {
        return res.status(500).json({ error: '删除失败：' + e.message });
      }
    }

    // =========================================
    // 9. 【新增】保存/更新一张说说卡到云端（绕过 RLS，替代前端直连 Supabase）
    // =========================================
    if (action === 'save_discovery') {
      const { user_uuid: uid, id, book_id, book_title, discovery, question, quote, original, feedback_emoji, user_voice, date } = req.body || {};
      if (!uid) return res.status(400).json({ error: '缺少用户标识' });
      if (!id) return res.status(400).json({ error: '缺少卡片ID' });
      try {
        await callRPC('save_discovery', {
          p_id: id,
          p_user_id: uid,
          p_book_id: book_id || null,
          p_book_title: book_title || '',
          p_discovery: discovery || '',
          p_question: question || '',
          p_quote: quote || '',
          p_original: original || '',
          p_feedback_emoji: feedback_emoji || '',
          p_user_voice: user_voice || '',
          p_date: date || new Date().toISOString().slice(0, 10),
        });
        return res.status(200).json({ success: true });
      } catch (e) {
        return res.status(500).json({ error: '保存说说卡失败：' + e.message });
      }
    }

    // =========================================
    // 10. 【新增】获取用户全部说说卡（绕过 RLS，替代前端直连 Supabase）
    // =========================================
    if (action === 'fetch_discoveries') {
      const { user_uuid: uid } = req.body || {};
      if (!uid) return res.status(400).json({ error: '缺少用户标识' });
      try {
        const result = await callRPC('get_user_discoveries', { p_user_id: uid });
        return res.status(200).json({ discoveries: Array.isArray(result) ? result : [] });
      } catch (e) {
        return res.status(500).json({ error: '获取说说卡失败：' + e.message });
      }
    }

    return res.status(400).json({ error: '未知操作' });
  } catch (e) {
    console.error('❌ 外层 /api/auth 发生严重错误:', e);
    return res.status(500).json({ error: '服务器错误：' + e.message });
  }
}
