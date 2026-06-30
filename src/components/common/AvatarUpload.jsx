// ============================================================
// AvatarUpload — 头像上传组件（1:1 / JPG+PNG / ≤2MB）
// 在发现卡页面引导用户上传，不强制
// ============================================================
import { useState, useRef, useEffect } from 'react';

export default function AvatarUpload({ currentAvatar, onAvatarChange }) {
  const [preview, setPreview] = useState(currentAvatar);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // 当外部传入的 currentAvatar 变化时同步预览（例如从 IndexedDB 加载后）
  useEffect(() => {
    if (currentAvatar) setPreview(currentAvatar);
  }, [currentAvatar]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    // 格式校验
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setError('仅支持 JPG / PNG 格式');
      return;
    }
    // 大小校验
    if (file.size > 2 * 1024 * 1024) {
      setError('图片大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    // 直接传 File 对象，由父组件调用 saveAvatar 处理（含压缩和格式校验）
    setPreview(URL.createObjectURL(file));
    onAvatarChange?.(file);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* 头像预览 */}
      <div style={{
        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
        overflow: 'hidden', border: '2px solid var(--border)',
        background: '#F5F1EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {preview ? (
          <img src={preview} alt="头像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 22, opacity: 0.5 }}>📷</span>
        )}
      </div>

      {/* 上传按钮 */}
      <div>
        <button onClick={() => inputRef.current?.click()} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)',
          color: 'var(--ink2)',
        }}>
          {currentAvatar ? '更换头像' : '📷 设置头像'}
        </button>
        <div style={{ fontSize: 9, color: 'var(--ink4)', marginTop: 2 }}>
          正方形 · JPG/PNG · 不超过 2MB
        </div>
        {error && <div style={{ fontSize: 10, color: '#C47A6E', marginTop: 2 }}>{error}</div>}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png" onChange={handleFile}
        style={{ display: 'none' }} />
    </div>
  );
}
