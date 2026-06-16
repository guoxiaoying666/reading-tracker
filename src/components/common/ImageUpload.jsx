import { useState, useRef, useEffect } from 'react';
import { saveImage, getImage, replaceImage } from '../../utils/imageDB';

/**
 * 图片上传组件
 * Props:
 *   imageId   - 已有图片 ID（编辑模式）
 *   onChange  - (newImageId) => void  图片变更回调
 *   size      - 'small' | 'large'  显示尺寸
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

  return (
    <div className={`image-upload ${isLarge ? 'large' : 'small'}`}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
      />

      {loading ? (
        <div className="image-placeholder loading">
          <span className="placeholder-icon">⏳</span>
          <span className="placeholder-text">处理中…</span>
        </div>
      ) : preview ? (
        <div className="image-preview-wrap">
          <img src={preview} alt="书封" className="image-preview" />
          <div className="image-actions">
            <button type="button" className="img-btn" onClick={() => fileRef.current?.click()}>🔄</button>
            <button type="button" className="img-btn danger" onClick={handleRemove}>✕</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`image-placeholder ${isLarge ? 'large' : ''}`}
          onClick={() => fileRef.current?.click()}
        >
          <span className="placeholder-icon">📷</span>
          <span className="placeholder-text">{isLarge ? '拍照或选择封面' : '封'}</span>
        </button>
      )}
    </div>
  );
}
