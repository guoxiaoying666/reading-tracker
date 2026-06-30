// ============================================================
// TranslationCompare — 译本推荐插件（v2.0）
// 推荐外国经典名著时触发 DeepSeek 译本查询
// 显示多个译本的对比卡片
// ============================================================
import { useState } from 'react';
import { lookupTranslation } from '../../utils/deepseek';

const FAKE_TRANSLATIONS = {
  '小王子': {
    top3: [
      { translator: '李继宏', publish_year: 2013, recommend_reason: '语言流畅，适合青少年阅读', publisher: '天津人民出版社' },
      { translator: '周克希', publish_year: 2015, recommend_reason: '经典译本，文学性强', publisher: '上海译文出版社' },
      { translator: '柳鸣九', publish_year: 2011, recommend_reason: '忠实原著，注释详尽', publisher: '中央编译出版社' },
    ],
  },
};

export default function TranslationCompare({ title, author }) {
  const [translations, setTranslations] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    try {
      // 先查本地缓存
      const cached = FAKE_TRANSLATIONS[title];
      if (cached) {
        setTranslations(cached.top3);
        setLoading(false);
        return;
      }
      // 无缓存则调 DeepSeek API
      const result = await lookupTranslation({ originalTitle: title, author });
      setTranslations(result.top3 || []);
    } catch {
      setTranslations([]);
    }
    setLoading(false);
  };

  if (!translations) {
    return (
      <button onClick={handleFetch} disabled={loading} style={{
        background: 'none', border: '1px dashed var(--border2)', borderRadius: 8,
        padding: '8px 14px', fontSize: 11, color: 'var(--ink3)', cursor: 'pointer',
        fontFamily: 'var(--font)', width: '100%', marginTop: 8,
      }}>
        {loading ? '⏳ 查询译本…' : '📖 查看译本对比'}
      </button>
    );
  }

  return (
    <div style={{ marginTop: 8, padding: '10px 14px', background: '#F9F7F4', borderRadius: 10, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#5C5244', marginBottom: 8 }}>
        📖 《{title}》推荐译本
      </div>
      {translations.map((t, i) => (
        <div key={i} style={{
          display: 'flex', gap: 8, padding: '6px 0',
          borderBottom: i < translations.length - 1 ? '1px solid var(--border)' : 'none',
        }}>
          <span style={{ fontSize: 10, color: '#C8815C', fontWeight: 700, width: 16, textAlign: 'right' }}>
            {i + 1}.
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
              {t.translator} 译
              <span style={{ fontSize: 10, color: 'var(--ink3)', fontWeight: 400, marginLeft: 6 }}>
                {t.publish_year} · {t.publisher}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 1 }}>{t.recommend_reason}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
