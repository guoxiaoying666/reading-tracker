// ============================================================
// AdminBatchTag — 后台批量打标工具（v2.0）
// 功能：输入书名 → 调用 API 自动写入五维分类
// 状态：demo 阶段先手动写死，预留 DeepSeek API 接口
// ============================================================
import { useState } from 'react';
import { useReading } from '../../context/ReadingContext';

const DIMENSION_OPTIONS = [
  { key: 'narrative', label: '📖 文学叙事' },
  { key: 'science', label: '🌿 自然科学' },
  { key: 'humanity', label: '🏛️ 人文社会' },
  { key: 'art_create', label: '🎨 艺术创想' },
  { key: 'self_growth', label: '🧘 自我成长' },
];

export default function AdminBatchTag() {
  const { addBook } = useReading();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [dimension, setDimension] = useState('narrative');
  const [level2, setLevel2] = useState('');
  const [status, setStatus] = useState('idle'); // idle | classifying | done | error
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState([]);

  // ---- demo 阶段：手动选择维度 + 预留 DeepSeek 接口 ----
  const handleClassify = async () => {
    if (!title.trim()) { setMsg('请输入书名'); return; }
    setStatus('classifying');
    setMsg('正在分类…');

    try {
      // 预留接口：替换为真实 DeepSeek API 调用
      // const result = await callDeepSeek('classify_book', { title: title.trim(), author: author.trim() });
      // setDimension(result.dimension);

      // demo 阶段：保留手动选择，模拟 1 秒延迟
      await new Promise(r => setTimeout(r, 800));

      // 构造二级分类默认值
      const dimDefaults = {
        narrative: 'novel',
        science: 'biology',
        humanity: 'chinese_history',
        art_create: 'visual_art',
        self_growth: 'psychology',
      };
      const l2 = dimDefaults[dimension] || 'novel';
      setLevel2(l2);

      // 添加到书架
      addBook({
        title: title.trim(),
        author: author.trim(),
        dimension,
        level2: l2,
        level3: '',
        month: new Date().toISOString().slice(0, 7),
        source: '批量录入',
        language: '中文',
        fiction: '虚构',
        classic: false,
        childStar: 0,
        note: '',
      });

      setStatus('done');
      setMsg(`✅ 已添加《${title.trim()}》→ ${DIMENSION_OPTIONS.find(d => d.key === dimension)?.label}`);
      setHistory(prev => [{ title: title.trim(), dimension, time: new Date().toLocaleTimeString() }, ...prev]);
      setTitle('');
      setAuthor('');
    } catch (e) {
      setStatus('error');
      setMsg('分类失败：' + e.message);
    }
  };

  return (
    <div style={{ padding: '0 4px' }}>
      <div className="card" style={{ padding: 18 }}>
        <h2 className="section-title">📋 批量录入</h2>
        <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 16, lineHeight: 1.6 }}>
          手动输入书名和作者，选择五维分类后一键入库。<br />
          <em style={{ fontSize: 10 }}>（Demo 阶段：手动选择维度，预留 DeepSeek API 自动分类接口）</em>
        </p>

        {/* 书名输入 */}
        <div className="form-group">
          <label>书名 *</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="输入书名" onKeyDown={e => e.key === 'Enter' && handleClassify()} />
        </div>

        {/* 作者输入 */}
        <div className="form-group">
          <label>作者</label>
          <input type="text" value={author} onChange={e => setAuthor(e.target.value)}
            placeholder="作者（选填）" />
        </div>

        {/* 五维分类选择 */}
        <div className="form-group">
          <label>五维分类</label>
          <select value={dimension} onChange={e => setDimension(e.target.value)}>
            {DIMENSION_OPTIONS.map(d => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* 状态提示 */}
        {msg && (
          <div style={{
            padding: '8px 12px', borderRadius: 8, marginTop: 8, fontSize: 12,
            background: status === 'done' ? '#E8F5E9' : status === 'error' ? '#FFEBEE' : '#FFF8E1',
            color: status === 'done' ? '#2E7D32' : status === 'error' ? '#C62828' : '#F57F17',
          }}>
            {status === 'classifying' && '⏳ '}
            {msg}
          </div>
        )}

        {/* 提交按钮 */}
        <button className="btn-primary" style={{ width: '100%', padding: 13, fontSize: 15, marginTop: 12 }}
          onClick={handleClassify} disabled={status === 'classifying'}>
          {status === 'classifying' ? '⏳ 分类中…' : '📥 录入书架'}
        </button>
      </div>

      {/* 录入历史 */}
      {history.length > 0 && (
        <div className="card" style={{ padding: 14, marginTop: 8 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>录入记录</h3>
          {history.map((h, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', fontSize: 11,
              padding: '4px 0', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{h.title}</span>
              <span style={{ color: 'var(--ink3)' }}>
                {DIMENSION_OPTIONS.find(d => d.key === h.dimension)?.label.replace(/^.. /, '')} · {h.time}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
