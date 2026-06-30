// ============================================================
// TalentCard — 天赋小卡片（v2.0）
// 录入第1本书后弹窗：标注"细腻的观察家/探索家"等
// 建立情感信任 + 成就感
// ============================================================
import { useState, useEffect } from 'react';

const TALENTS = [
  { label: '细腻的观察家', icon: '🔍', desc: '你注意到了书里很多细节，说明你有一双善于发现的眼睛。' },
  { label: '勇敢的探索家', icon: '🧭', desc: '你对未知充满好奇，愿意跟随故事去冒险和发现。' },
  { label: '温暖的小诗人', icon: '🌱', desc: '你能感受到文字里的情感，有一颗柔软善良的心。' },
  { label: '聪明的小侦探', icon: '🕵️', desc: '你喜欢思考因果和逻辑，擅长从线索中推理出答案。' },
  { label: '创意梦想家', icon: '✨', desc: '你的想象力很丰富，能在阅读中看到别人看不到的世界。' },
];

export default function TalentCard({ bookTitle, onDismiss, onGoToBookshelf }) {
  const [talent] = useState(() => TALENTS[Math.floor(Math.random() * TALENTS.length)]);

  return (
    <div className="modal-overlay" onClick={onDismiss}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(160deg, #FFF8F0, #FDF0E0)',
        borderRadius: 24, padding: '32px 28px', maxWidth: 340, width: '90%',
        boxShadow: '0 20px 60px rgba(44,36,22,0.15)',
        textAlign: 'center', position: 'relative',
        border: '1px solid rgba(200,129,92,0.2)',
      }}>
        {/* 装饰 */}
        <div style={{ fontSize: 48, marginBottom: 8 }}>{talent.icon}</div>
        <div style={{ fontSize: 10, color: '#C8815C', letterSpacing: 2, marginBottom: 8 }}>🎉 天赋解锁</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#5C5244', marginBottom: 4 }}>
          {talent.label}
        </div>
        <div style={{ fontSize: 12, color: '#9B9082', lineHeight: 1.7, marginBottom: 16 }}>
          {talent.desc}
        </div>

        {/* 分隔线 */}
        <div style={{ height: 1, background: 'rgba(200,129,92,0.15)', margin: '0 0 14px' }} />

        {/* 最近录入 */}
        <div style={{ fontSize: 11, color: '#9B9082', marginBottom: 4 }}>来自</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#5C5244' }}>
          📖 《{bookTitle}》
        </div>

        {/* 按钮组 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onDismiss} style={{
            flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(200,129,92,0.25)',
            background: 'white', color: '#C8815C', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font)', letterSpacing: 0.5,
          }}>
            📝 继续录入
          </button>
          {onGoToBookshelf && (
            <button onClick={onGoToBookshelf} style={{
              flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
              background: '#C8815C', color: 'white', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font)', letterSpacing: 0.5,
              boxShadow: '0 4px 16px rgba(200,129,92,0.25)',
            }}>
              📚 去书架
            </button>
          )}
        </div>

        <div style={{ fontSize: 10, color: '#C4BBAE', marginTop: 12 }}>
          因好奇多读，因思考深读
        </div>
      </div>
    </div>
  );
}
