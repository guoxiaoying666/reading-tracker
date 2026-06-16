// ============================================================
// ISBN 书籍查询引擎
// Google Books API（Key 通过 VITE_ 环境变量在构建时注入）
// ============================================================

import { getAllLevel2Options } from '../data/framework';

function hasChinese(text) { return /[一-鿿]/.test(text); }

const DIM_KEYWORDS = [
  { dim: 'self', keywords: ['psychology', 'emotion', 'body', 'health', 'death', 'grief'],
    l2: { psychology: ['psychology', 'emotion'], body: ['health', 'body'], life_death: ['death'] } },
  { dim: 'society', keywords: ['society', 'politics', 'economics', 'money', 'law', 'friendship', 'communication'],
    l2: { interpersonal: ['friendship', 'communication'], economy: ['economics', 'money'], politics: ['politics', 'government'], law: ['law'] } },
  { dim: 'nature', keywords: ['mathematics', 'math', 'physics', 'chemistry', 'biology', 'geography', 'astronomy', 'nature', 'animal', 'plant', 'dinosaur', 'insect'],
    l2: { math: ['math'], physics: ['physics'], chemistry: ['chemistry'], biology: ['biology', 'animal', 'plant', 'dinosaur', 'insect', 'nature'], geography: ['geography', 'earth'], astronomy: ['astronomy', 'space'] } },
  { dim: 'history', keywords: ['history', 'ancient', 'civilization', 'mythology', 'religion', 'china', 'dynasty', 'war'],
    l2: { chinese_history: ['china', 'chinese', 'dynasty'], world_history: ['history', 'ancient', 'civilization', 'war'], religion_myth: ['mythology', 'religion'] } },
  { dim: 'literature', keywords: ['fiction', 'novel', 'story', 'poetry', 'drama', 'biography', 'fairy', 'folklore', 'legend', 'fantasy', 'mystery'],
    l2: { novel: ['fiction', 'novel', 'story', 'fantasy', 'mystery'], poetry: ['poetry', 'poem'], fable_myth: ['fairy', 'folklore', 'legend', 'fable'], biography: ['biography'], drama: ['drama', 'play'] } },
  { dim: 'art', keywords: ['art', 'music', 'painting', 'photography', 'design', 'architecture', 'language', 'writing', 'drawing'],
    l2: { visual_art: ['art', 'painting', 'photography', 'design', 'drawing'], music: ['music', 'song'], language: ['language', 'writing'] } },
  { dim: 'future', keywords: ['technology', 'engineering', 'computer', 'programming', 'coding', 'ai', 'robot', 'invention'],
    l2: { engineering: ['technology', 'engineering', 'invention'], coding: ['computer', 'programming', 'coding'], ai: ['ai', 'robot'] } },
];

function classify(subjectList) {
  const text = subjectList.join(' ').toLowerCase();
  if (!text) return { dim: 'literature', l2: 'novel', l2Label: '小说', confidence: 'low' };
  let best = { dim: 'literature', l2: 'novel', score: 0 };
  for (const entry of DIM_KEYWORDS) {
    let score = 0;
    for (const kw of entry.keywords) { if (text.includes(kw)) score++; }
    if (score > best.score) {
      let l2 = 'novel', bestL2Score = 0;
      for (const [k, v] of Object.entries(entry.l2)) {
        let s = 0;
        for (const kw of v) { if (text.includes(kw)) s++; }
        if (s > bestL2Score) { bestL2Score = s; l2 = k; }
      }
      best = { dim: entry.dim, l2, score };
    }
  }
  const opts = getAllLevel2Options(best.dim);
  const found = opts.find(o => o.key === best.l2);
  const confidence = best.score >= 2 ? 'high' : best.score >= 1 ? 'medium' : 'low';
  return { dim: best.dim, l2: best.l2, l2Label: found ? found.label : '小说', confidence };
}
export async function lookupBook(isbn) {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
  const isChineseIsbn = cleanIsbn.startsWith('9787');

  // ---- API 代理查询（OpenLibrary + DeepSeek AI 后备） ----
  try {
    const resp = await fetch('/api/lookup?isbn=' + cleanIsbn);
    if (resp.ok) {
      const data = await resp.json();
      if (data.title) {
        const opts = getAllLevel2Options(data.dimension || 'literature');
        const found = opts.find(o => o.key === (data.level2 || 'novel'));
        return {
          title: data.title, author: data.author || '', publisher: data.publisher || '',
          publishYear: data.publishYear || '', language: data.language || '外文',
          fiction: '虚构', classic: false,
          dimension: data.dimension || 'literature',
          level2: data.level2 || 'novel',
          level2Label: found ? found.label : '小说',
          level3: '',
          coverUrl: data.coverUrl || null, subjects: data.subjects || [],
          confidence: data.confidence || 'high',
          isbn: cleanIsbn,
        };
      }
      // 查不到但返回了默认分类
      if (data.error === 'not_found') {
        const opts = getAllLevel2Options(data.dimension || 'literature');
        const found = opts.find(o => o.key === (data.level2 || 'novel'));
        return {
          title: '', author: '', publisher: '', publishYear: '',
          language: data.language || '外文',
          fiction: '虚构', classic: false,
          dimension: data.dimension || 'literature',
          level2: data.level2 || 'novel',
          level2Label: found ? found.label : '小说',
          level3: '', coverUrl: null, subjects: [],
          confidence: data.confidence || 'low',
          isbn: cleanIsbn,
        };
      }
    }
  } catch (_) {}

  // ---- OpenLibrary 直达 ----
  try {
    const resp = await fetch('https://openlibrary.org/isbn/' + cleanIsbn + '.json');
    if (resp.ok) {
      const data = await resp.json();
      if (data.title) {
        let author = '';
        for (const a of (data.authors || []).slice(0, 2)) {
          try {
            const aResp = await fetch('https://openlibrary.org' + a.key + '.json');
            if (aResp.ok) { const aD = await aResp.json(); if (aD.name) author += (author ? '、' : '') + aD.name; }
          } catch (_) {}
        }
        const pubYear = (data.publish_date || '').match(/\d{4}/)?.[0] || '';
        const publisher = (data.publishers || []).join('、');
        const coverUrl = data.covers?.[0] ? 'https://covers.openlibrary.org/b/id/' + data.covers[0] + '-M.jpg' : null;
        const isCn = hasChinese(data.title);
        let subjects = [];
        try {
          const sResp = await fetch('https://openlibrary.org/search.json?title=' + encodeURIComponent(data.title) + '&limit=1');
          if (sResp.ok) { const sD = await sResp.json(); if (sD.docs?.[0]?.subject) subjects = sD.docs[0].subject; }
        } catch (_) {}
        const { dim, l2, l2Label, confidence } = classify(subjects);
        return { title: data.title, author, publisher, publishYear, language: isCn ? '中文' : '外文', fiction: '虚构', classic: false, dimension: dim, level2: l2, level2Label: l2Label, level3: '', coverUrl, subjects, confidence: (!isCn && isChineseIsbn) ? 'low' : confidence, isbn: cleanIsbn };
      }
    }
  } catch (_) {}

  // ---- OpenLibrary search ----
  for (const q of ['isbn:' + cleanIsbn, cleanIsbn]) {
    try {
      const sResp = await fetch('https://openlibrary.org/search.json?q=' + q);
      if (sResp.ok) {
        const sData = await sResp.json();
        if (sData.docs && sData.docs.length > 0) {
          const doc = sData.docs[0];
          if (doc.title) {
            const author = doc.author_name?.join('、') || '';
            const subjects = (doc.subject || []);
            const isCn = hasChinese(doc.title);
            const { dim, l2, l2Label, confidence } = classify(subjects);
            return { title: doc.title, author, publisher: doc.publisher?.[0] || '', publishYear: String(doc.first_publish_year || ''), language: isCn ? '中文' : '外文', fiction: '虚构', classic: false, dimension: dim, level2: l2, level2Label: l2Label, level3: '', coverUrl: doc.cover_i ? 'https://covers.openlibrary.org/b/id/' + doc.cover_i + '-M.jpg' : null, subjects, confidence: (!isCn && isChineseIsbn) ? 'low' : confidence, isbn: cleanIsbn };
          }
        }
      }
    } catch (_) {}
  }

  if (isChineseIsbn) {
    return { title: '', author: '', publisher: '', publishYear: '', language: '中文', fiction: '虚构', classic: false, dimension: 'literature', level2: 'novel', level2Label: '小说', level3: '', coverUrl: null, subjects: [], confidence: 'low', isbn: cleanIsbn };
  }
  return { title: '', author: '', publisher: '', publishYear: '', language: '外文', fiction: '虚构', classic: false, dimension: 'literature', level2: 'novel', level2Label: '小说', level3: '', coverUrl: null, subjects: [], confidence: 'low', isbn: cleanIsbn };
}

// ---- AI 分类（DeepSeek 后端代理） ----
export async function aiClassify(title, author, subjects) {
  try {
    const resp = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, author, subjects: subjects || [] }),
    });
    const data = await resp.json();
    if (data.error || !data.dimension) return null;
    const l2opts = getAllLevel2Options(data.dimension);
    const found = l2opts.find(o => o.key === data.level2);
    return { dimension: data.dimension, level2: data.level2, level2Label: found ? found.label : '小说', confidence: data.confidence || 'low' };
  } catch (_) { return null; }
}

// ---- 手动输入书名时的简单分类 ----
export function classifyByTitle(title) {
  const text = title;
  const rules = [
    { dim: 'literature', kws: ['故事', '童话', '小说', '寓言', '诗歌', '散文', '传记', '戏剧'] },
    { dim: 'nature', kws: ['科学', '自然', '动物', '植物', '宇宙', '地理', '数学', '物理', '化学', '生物'] },
    { dim: 'history', kws: ['历史', '神话', '中国', '世界', '文明', '古代'] },
    { dim: 'self', kws: ['情绪', '心理', '身体', '健康', '死亡', '成长', '自信'] },
    { dim: 'society', kws: ['社会', '朋友', '经济', '法律', '政治', '哲学', '沟通'] },
    { dim: 'art', kws: ['艺术', '音乐', '绘画', '语言', '文字', '设计'] },
    { dim: 'future', kws: ['科技', '工程', '编程', '机器人', '发明', '未来'] },
  ];
  let best = { dim: 'literature', score: 0 };
  for (const r of rules) {
    let s = 0;
    for (const kw of r.kws) { if (text.includes(kw)) s++; }
    if (s > best.score) best = { dim: r.dim, score: s };
  }
  const l2opts = getAllLevel2Options(best.dim);
  return { dimension: best.dim, level2: l2opts[0]?.key || 'novel', level2Label: l2opts[0]?.label || '小说', level3: '', language: hasChinese(title) ? '中文' : '外文' };
}
