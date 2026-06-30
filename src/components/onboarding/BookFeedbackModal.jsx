// ============================================================
// BookFeedbackModal — 录入图书后的客观反馈弹窗
// 基于已录入的数量和书名，给出温和、事实性的鼓励
// 绝对禁止调用任何 AI Prompt 生成"天赋细节"
// ============================================================
export default function BookFeedbackModal({
  title,
  booksCount,
  newDimension,   // string | null — 如果是第一次录入该维度，传中文名
  onDismiss,
  onGoToBookshelf,
}) {
  // 确定场景
  let sceneTitle, sceneBody, sceneIcon;

  if (booksCount === 1) {
    sceneIcon = '📚';
    sceneTitle = '第一步，出发！';
    sceneBody = `《${title}》已收录进你的书房。好的开始，就是成功的一半。`;
  } else if (booksCount === 5) {
    sceneIcon = '🗺️';
    sceneTitle = '里程碑解锁！';
    sceneBody = '恭喜！已成功解锁 5 本书。你的专属阅读地图，即将点亮。';
  } else if (newDimension) {
    sceneIcon = '🧭';
    sceneTitle = '新地图板块';
    sceneBody = `通过《${title}》，你拓展了「${newDimension}」的阅读版图。保持探索！`;
  } else {
    sceneIcon = '✨';
    sceneTitle = '积累中';
    sceneBody = `《${title}》也进来了。你的书架正在变满，阅读地图正在拼合。`;
  }

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
        {/* 图标 */}
        <div style={{ fontSize: 40, marginBottom: 10, animation: 'float 2.5s ease-in-out infinite', display: 'inline-block' }}>
          {sceneIcon}
        </div>

        {/* 标题 */}
        <div style={{ fontSize: 20, fontWeight: 800, color: '#5C5244', marginBottom: 10, fontFamily: 'var(--font-title)' }}>
          {sceneTitle}
        </div>

        {/* 正文 */}
        <div style={{ fontSize: 13, color: '#9B9082', lineHeight: 1.8, marginBottom: 18, padding: '0 4px' }}>
          {sceneBody}
        </div>

        {/* 分隔线 */}
        <div style={{ height: 1, background: 'rgba(200,129,92,0.15)', margin: '0 0 14px' }} />

        {/* 进度指示 */}
        {booksCount < 5 && (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i <= booksCount ? '#C8815C' : '#E3DDD5',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
            <div style={{ fontSize: 10, color: '#C4BBAE' }}>
              已录入 {booksCount} / 5 本
            </div>
          </div>
        )}

        {/* 按钮组 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
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
