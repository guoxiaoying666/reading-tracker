// ============================================================
// EmojiPicker — 通用表情反馈选择器（P2-9）
// ============================================================
export default function EmojiPicker({ value, onChange }) {
  const EMOJIS = ['😄', '😊', '🤔', '😖'];
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
      {EMOJIS.map(e => (
        <span key={e} onClick={() => onChange(value === e ? '' : e)}
          style={{
            fontSize: 28, cursor: 'pointer', opacity: value === e ? 1 : 0.3,
            transition: 'all 0.15s', transform: value === e ? 'scale(1.2)' : 'scale(1)',
            filter: value === e ? 'none' : 'grayscale(0.5)',
          }}>{e}</span>
      ))}
    </div>
  );
}
