/** 支持半星的评分组件 */
export default function StarPicker({ value = 0, onChange, size = 'normal' }) {
  const fontSize = size === 'large' ? '32px' : '26px';
  const stars = [1, 2, 3, 4, 5];

  const handleClick = (n, half) => {
    const newVal = half ? n - 0.5 : n;
    // 点击已选项则清零
    onChange(value === newVal ? 0 : newVal);
  };

  return (
    <div className="star-picker">
      {stars.map(n => {
        const full = value >= n;
        const half = !full && value >= n - 0.5;
        return (
          <span key={n} style={{ position: 'relative', display: 'inline-block', fontSize }}>
            {/* 左半：点击设半星 */}
            <button
              type="button"
              className="star-btn"
              style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', overflow: 'hidden', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              onClick={() => handleClick(n, true)}
              aria-label={`${n - 0.5}星`}
            >
              <span className={full || half ? 'star-on' : 'star-off'}>⭐</span>
            </button>
            {/* 右半：点击设整星 */}
            <button
              type="button"
              className="star-btn"
              style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', overflow: 'hidden', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, direction: 'rtl' }}
              onClick={() => handleClick(n, false)}
              aria-label={`${n}星`}
            >
              <span className={full ? 'star-on' : 'star-off'}>⭐</span>
            </button>
            {/* 底层占位 */}
            <span style={{ visibility: 'hidden' }}>⭐</span>
          </span>
        );
      })}
    </div>
  );
}

/** 只读展示星星 */
export function StarDisplay({ value }) {
  if (!value) return null;
  const full = Math.floor(value);
  const half = value % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span style={{ fontSize: 13, letterSpacing: 1 }}>
      {'⭐'.repeat(full)}
      {half && <span style={{ opacity: 0.8 }}>✨</span>}
      {'  '}
    </span>
  );
}
