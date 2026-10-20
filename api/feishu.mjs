// 飞书阅读机器人 — 事件回调入口
// 孩子在飞书单聊里和机器人聊正在读或读完的书，聊完整理成阅读卡写进飞书多维表格。
// 环境变量见 .env.example 的“飞书阅读机器人”一节。所有配置运行时读取。

import crypto from 'crypto';
import { chatRules, cardPrompt } from './feishu-prompts.mjs';

const env = (k, d = '') => process.env[k] || d;
const FEISHU = () => env('FEISHU_BASE', 'https://open.feishu.cn');
const DEEPSEEK = () => env('DEEPSEEK_BASE', 'https://api.deepseek.com');

const MAX_TURNS = 30;            // 单次对话最多保留的消息条数
const STALE_MS = 12 * 3600e3;    // 超过 12 小时没动静的对话，下次开口时先收尾

// ---------- 去重：飞书 3 秒内没收到 200 会重推 ----------
const seen = new Map();
function isDuplicate(id) {
  if (!id) return false;
  const now = Date.now();
  for (const [k, t] of seen) if (now - t > 3600e3) seen.delete(k);
  if (seen.has(id)) return true;
  seen.set(id, now);
  return false;
}

// ---------- 解密 ----------
export function decrypt(encrypt, key) {
  const buf = Buffer.from(encrypt, 'base64');
  const aesKey = crypto.createHash('sha256').update(key).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, buf.subarray(0, 16));
  return JSON.parse(Buffer.concat([decipher.update(buf.subarray(16)), decipher.final()]).toString('utf8'));
}

// ---------- 飞书接口 ----------
let tokenCache = { value: '', exp: 0 };
async function tenantToken() {
  if (tokenCache.value && Date.now() < tokenCache.exp) return tokenCache.value;
  const r = await fetch(FEISHU() + '/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: env('FEISHU_APP_ID'), app_secret: env('FEISHU_APP_SECRET') }),
  });
  const d = await r.json();
  if (d.code !== 0) throw new Error('飞书 token 获取失败: ' + d.msg);
  tokenCache = { value: d.tenant_access_token, exp: Date.now() + (d.expire - 300) * 1000 };
  return tokenCache.value;
}

async function feishu(path, body) {
  const r = await fetch(FEISHU() + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: 'Bearer ' + (await tenantToken()) },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (d.code !== 0) throw new Error(`飞书接口 ${path} 失败: ${d.code} ${d.msg}`);
  return d.data;
}

function sendText(receiveId, text, idType = 'chat_id') {
  return feishu('/open-apis/im/v1/messages?receive_id_type=' + idType, {
    receive_id: receiveId, msg_type: 'text', content: JSON.stringify({ text }),
  });
}

// ---------- DeepSeek ----------
async function deepseek(messages, { json = false, maxTokens = 400, temperature = 0.7 } = {}) {
  const key = env('DEEPSEEK_KEY') || env('VITE_DEEPSEEK_KEY');
  const r = await fetch(DEEPSEEK() + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model: 'deepseek-chat', messages, max_tokens: maxTokens, temperature,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  const d = await r.json();
  const text = d.choices?.[0]?.message?.content;
  if (!text) throw new Error('DeepSeek 无返回: ' + JSON.stringify(d).slice(0, 200));
  return text;
}

// ---------- 会话存储（Supabase，service role，表开 RLS 不对外开放） ----------
function sb(path, init = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return fetch(env('VITE_SUPABASE_URL') + '/rest/v1/' + path, {
    ...init,
    headers: {
      apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal', ...(init.headers || {}),
    },
  });
}
async function loadSession(chatId) {
  const r = await sb('feishu_sessions?chat_id=eq.' + encodeURIComponent(chatId) + '&select=*');
  if (!r.ok) throw new Error('读取会话失败: ' + (await r.text()));
  return (await r.json())[0] || null;
}
async function saveSession(s) {
  s.updated_at = new Date().toISOString();
  const r = await sb('feishu_sessions', { method: 'POST', body: JSON.stringify(s) });
  if (!r.ok) throw new Error('保存会话失败: ' + (await r.text()));
}
async function clearSession(chatId) {
  await sb('feishu_sessions?chat_id=eq.' + encodeURIComponent(chatId), { method: 'DELETE' });
}

// ---------- 工具 ----------
const extractTitle = (t) => (t.match(/《([^》]+)》/) || [])[1]?.trim() || '';
const wantsEnd = (t) => /^(聊完了|不想聊了|就这样|结束|没了|拜拜)[！!。.~～\s]*$/.test(t.trim());
const transcriptOf = (msgs, childName) =>
  msgs.map((m) => (m.role === 'user' ? (childName || '孩子') : 'AI') + '：' + m.content).join('\n');

export function ageOn(birth, date = new Date()) {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b)) return null;
  let a = date.getFullYear() - b.getFullYear();
  if (date.getMonth() < b.getMonth() || (date.getMonth() === b.getMonth() && date.getDate() < b.getDate())) a--;
  return a;
}

function stripMarks(text) {
  return { text: text.replace(/\[(END|FLAG)\]/g, '').trim(), end: text.includes('[END]'), flag: text.includes('[FLAG]') };
}

// ---------- 卡片 ----------
async function makeCard(bookTitle, transcript, source) {
  const raw = await deepseek([{ role: 'user', content: cardPrompt(bookTitle, transcript) }],
    { json: true, maxTokens: 1200, temperature: 0.3 });
  const card = JSON.parse(raw);
  const list = (v) => (Array.isArray(v) ? v.filter(Boolean).join('\n') : v || '');
  const fields = {
    书名: bookTitle,
    读者: env('CHILD_NAME'),
    日期: Date.now(),
    来源: source,
    这次发现: card.discovery || '',
    值得继续想的问题: card.question || '',
    我的感受: card.feeling || '',
    原话摘录: list(card.quotes),
    最喜欢的人物或场景: card.favorite || '',
    推荐给谁: card.recommend_to || '',
    深度依据: card.depth_evidence || '',
    待核对: list(card.to_check),
    完整对话: transcript.slice(0, 50000),
  };
  const age = ageOn(env('CHILD_BIRTHDATE'));
  if (age !== null) fields['年龄'] = age;
  if (Number.isInteger(card.stars) && card.stars >= 1 && card.stars <= 5) fields['星级'] = card.stars;
  fields['阅读进度'] = card.progress === '读完' ? '读完' : '在读';
  if (['入门', '进阶', '鉴赏'].includes(card.depth)) fields['深度层级'] = card.depth;
  await feishu(`/open-apis/bitable/v1/apps/${env('FEISHU_BITABLE_APP_TOKEN')}/tables/${env('FEISHU_BITABLE_TABLE_ID')}/records`, { fields });
  return card;
}

async function finishSession(chatId, s, { quiet = false } = {}) {
  const userTurns = s.messages.filter((m) => m.role === 'user').length;
  await clearSession(chatId);
  if (!s.book_title || userTurns < 2) {
    if (!quiet) await sendText(chatId, '好的，下次读了新的再来找我聊！');
    return;
  }
  const card = await makeCard(s.book_title, transcriptOf(s.messages, env('CHILD_NAME')), 'AI 对话');
  if (!quiet) await sendText(chatId, `${card.summary_for_child || ''}\n\n《${s.book_title}》的阅读卡已经放进你的书架啦。`.trim());
}

async function alertParent(text) {
  const parent = env('FEISHU_PARENT_OPEN_ID');
  if (parent) await sendText(parent, text, 'open_id').catch((e) => console.error('[feishu] 家长提醒失败', e.message));
}

// 把一条孩子的话交给 AI，回复并按需收尾
async function converse(chatId, s, userText, { farewell = false } = {}) {
  const childName = env('CHILD_NAME');
  s.messages.push({ role: 'user', content: userText });
  s.messages = s.messages.slice(-MAX_TURNS);
  const system = chatRules(s.book_title, childName) +
    (farewell ? '\n\n【现在】她刚回答了收尾的问题。用一句话简短道别，不再提问。' : '');
  const raw = await deepseek([{ role: 'system', content: system }, ...s.messages]);
  const { text, end, flag } = stripMarks(raw);
  s.messages.push({ role: 'assistant', content: text });
  if (flag) {
    s.flagged = true;
    await alertParent(`【好读提醒】${childName || '孩子'}在聊《${s.book_title}》时说的话可能需要你留意：\n“${userText}”`);
  }
  if (end) s.closing = true;
  await saveSession(s);
  await sendText(chatId, text);
}

// ---------- 主流程 ----------
export async function handleMessage(event) {
  const msg = event.message;
  if (!msg || msg.chat_type !== 'p2p') return;
  const chatId = msg.chat_id;

  if (msg.message_type === 'audio') {
    await sendText(chatId, '我还听不了语音哦。可以点手机键盘上的话筒按钮，说完它会变成文字，再发给我。');
    return;
  }
  if (msg.message_type !== 'text') {
    await sendText(chatId, '我现在只看得懂文字，用文字跟我说吧。');
    return;
  }

  const text = (JSON.parse(msg.content || '{}').text || '').trim();
  if (!text) return;

  // 家长导入：第一行“导入：《书名》”，后面贴聊天转写，直接生成卡片
  const imp = text.match(/^导入[:：]\s*(.+)\n([\s\S]+)$/);
  if (imp) {
    const title = extractTitle(imp[1]) || imp[1].replace(/[《》]/g, '').trim();
    await sendText(chatId, `收到，正在整理《${title}》的阅读卡……`);
    const card = await makeCard(title, imp[2].trim(), '家长导入');
    await sendText(chatId, `《${title}》的阅读卡已经写进表格。\n\n${card.summary_for_child || ''}`.trim());
    return;
  }

  if (/^(重新开始|重来)$/.test(text)) {
    await clearSession(chatId);
    await sendText(chatId, '好，重新开始。最近在读什么书？');
    return;
  }

  let s = await loadSession(chatId);
  const newTitle = extractTitle(text);

  // 旧对话收尾：太久没动静，或者开口就是另一本书
  if (s && (Date.now() - new Date(s.updated_at).getTime() > STALE_MS ||
            (newTitle && s.book_title && newTitle !== s.book_title))) {
    await finishSession(chatId, s, { quiet: true }).catch((e) => console.error('[feishu] 旧对话收尾失败', e.message));
    s = null;
  }

  if (!s) {
    s = { chat_id: chatId, book_title: newTitle, messages: [], closing: false, flagged: false };
    if (!newTitle) {
      await saveSession(s);
      await sendText(chatId, '你好呀！最近在读什么书？读完没读完都可以，把书名告诉我吧。');
      return;
    }
    await converse(chatId, s, text);
    return;
  }

  if (!s.book_title) {
    s.book_title = newTitle ||
      text.replace(/[《》。！!，,~～]/g, '').replace(/^(我)?(刚|正在|在)?(读完了?|看完了?|读了|看了|读的是|看的是|在读|在看|读|看|是)/, '').replace(/^(了)?(一半|一点|一部分|几章)(的)?/, '').trim().slice(0, 50);
    await converse(chatId, s, text);
    return;
  }

  if (wantsEnd(text)) {
    s.messages.push({ role: 'user', content: text });
    await finishSession(chatId, s);
    return;
  }

  if (s.closing) {
    // 回答完星级和推荐后，让 AI 道个别（也照常检查需要提醒家长的内容），再生成卡片
    await converse(chatId, s, text, { farewell: true });
    await finishSession(chatId, s);
    return;
  }

  await converse(chatId, s, text);
}

// ---------- HTTP 入口 ----------
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body = req.body || {};
  try {
    if (body.encrypt) body = decrypt(body.encrypt, env('FEISHU_ENCRYPT_KEY'));
  } catch (e) {
    return res.status(400).json({ error: 'decrypt_failed' });
  }

  const token = body.header?.token ?? body.token;
  if (env('FEISHU_VERIFICATION_TOKEN') && token !== env('FEISHU_VERIFICATION_TOKEN')) {
    return res.status(403).json({ error: 'bad_token' });
  }

  if (body.type === 'url_verification') return res.status(200).json({ challenge: body.challenge });

  // 先回 200，再慢慢处理，避免飞书超时重推
  res.status(200).json({ ok: true });

  if (body.header?.event_type !== 'im.message.receive_v1') return;
  if (isDuplicate(body.header?.event_id) || isDuplicate(body.event?.message?.message_id)) return;

  const chatId = body.event?.message?.chat_id;
  handleMessage(body.event).catch(async (e) => {
    console.error('[feishu] 处理失败', e);
    if (chatId) await sendText(chatId, '我这边出了点小问题，等一会儿再跟我说吧。').catch(() => {});
  });
}
