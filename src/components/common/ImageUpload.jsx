import { useState, useRef, useEffect } from 'react';
import { saveImage, getImage, replaceImage } from '../../utils/imageDB';

/**
 * 图片上传组件
 * Props:
 *   imageId   - 已有图片 ID（编辑模式）
 *   onChange  - (newImageId) => void  图片变更回调
 *   size      - 'small' | 'large'  显示尺寸
 *
 * 【已修复】原来尺寸完全依赖外部 CSS 类（.image-placeholder.large 等），
 * 具体宽高是多少完全是"隐形"的，导致跟同一行里的兄弟模块（比如情绪选择、
 * 喜爱度评分）高度对不上，看起来错位。现在把尺寸直接写成明确的内联样式，
 * 不再依赖看不见的外部 CSS，尺寸多大一目了然、也方便按场景调整。
 */
export default function ImageUpload({ imageId, onChange, size = 'large' }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  // 加载已有图片
  useEffect(() => {
    let cancelled = false;
    if (imageId) {
      setLoading(true);
      getImage(imageId).then(data => {
        if (!cancelled) { setPreview(data); setLoading(false); }
      });
    } else {
      setPreview(null);
    }
    return () => { cancelled = true; };
  }, [imageId]);

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const newId = await replaceImage(imageId, file);
      if (onChange) onChange(newId);
      // 预览
      const data = await getImage(newId);
      setPreview(data);
    } catch (e) {
      console.error('图片保存失败', e);
    }
    setLoading(false);
  };

  const handleRemove = async () => {
    if (onChange) onChange(null);
    setPreview(null);
  };

  const isLarge = size === 'large';
  const isMedium = size === 'medium';
  // 明确的尺寸表：small 是跟输入框/评分组件差不多高的方形小图标；
  // medium 是"封面+字段并排"场景用的矮一点的竖版占位；
  // large 是独立场景下（比如单独一整行的"上传书封"）用的大号竖版占位
  const boxStyle = isLarge
    ? { width: 110, height: 154 }
    : isMedium
      ? { width: 84, height: 112 }
      : { width: 64, height: 64 };

  return (
    <div className={`image-upload ${isLarge ? 'large' : 'small'}`} style={{ display: 'inline-block' }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
      />

      {loading ? (
        <div style={{
          ...boxStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          borderRadius: 10, background: 'var(--card2)', border: '1px dashed var(--border)', boxSizing: 'border-box',
        }}>
          <span style={{ fontSize: isLarge ? 22 : isMedium ? 18 : 14 }}>⏳</span>
          {isLarge && <span style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 4 }}>处理中…</span>}
        </div>
      ) : preview ? (
        <div style={{ ...boxStyle, position: 'relative', borderRadius: 10, overflow: 'hidden', boxSizing: 'border-box' }}>
          <img src={preview} alt="书封" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
            <button type="button" onClick={() => fileRef.current?.click()} style={{
              width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)',
              color: 'white', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🔄</button>
            <button type="button" onClick={handleRemove} style={{
              width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)',
              color: 'white', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            ...boxStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, borderRadius: 10, background: 'var(--card2)', border: '1px dashed var(--border)',
            cursor: 'pointer', boxSizing: 'border-box', fontFamily: 'var(--font)',
          }}
        >
          <span style={{ fontSize: isLarge ? 24 : isMedium ? 19 : 15 }}>📷</span>
          {isLarge && <span style={{ fontSize: 11, color: 'var(--ink3)' }}>拍照或选择封面</span>}
        </button>
      )}
    </div>
  );
}
