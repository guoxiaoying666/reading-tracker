// ============================================================
// ReadingDiscoveryCard — 语音读书发现卡（v4.0）
// 好读品牌暖深色系 · 柔和米色文字 · 疏朗呼吸感排版
// 支持封面/头像点击上传 + 全局数据同步
// ============================================================
import { useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { useReading } from '../../context/ReadingContext';
import { useAuth } from '../../context/AuthContext';
import { saveImage, saveAvatar } from '../../utils/imageDB';
import { supabase } from '../../supabase';

// ====================================================================
// 内联 SVG 图标（极细纯线条，与卡片融合）
// ====================================================================

const BookOutlineSVG = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#A39C94" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>
);

const PersonSVG = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#A39C94" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/** 重录 SVG — 标准刷新图标（循环箭头） */
const ReRecordSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

/** 下载 SVG — 标准下载图标（向下箭头 + 底横线） */
const DownloadSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// ====================================================================
// 工具函数：图片压缩
// ====================================================================

/** 压缩图片为 data URL（书封用） */
function compressImageFile(file, maxW = 300, maxH = 400, quality = 0.65) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let w = img.width; let h = img.height;
      if (w > maxW) { h = h * maxW / w; w = maxW; }
      if (h > maxH) { w = w * maxH / h; h = maxH; }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

/** 压缩头像为 1:1 正方形 data URL */
function compressAvatarImage(file, size = 200) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('仅支持图片格式')); return; }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#3A3835';
      ctx.fillRect(0, 0, size, size);
      const crop = Math.min(img.width, img.height);
      const sx = (img.width - crop) / 2;
      const sy = (img.height - crop) / 2;
      ctx.drawImage(img, sx, sy, crop, crop, 0, 0, size, size);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

// ====================================================================
// 发现段格式化：统一字体 + 关键词暖金色高亮
// ====================================================================

function formatDiscovery(text, keyword) {
  if (!text) return null;

  if (keyword && text.includes(keyword)) {
    const parts = text.split(keyword);
    return (
      <span>
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && <span style={{ color: '#D1B88D', fontWeight: 700 }}>{keyword}</span>}
          </span>
        ))}
      </span>
    );
  }

  return <span>{text}</span>;
}

// ====================================================================
// 书籍封面（可点击上传）
// ====================================================================

function BookCover({ coverUrl, uploading, onClick }) {
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', flexShrink: 0, position: 'relative', transition: 'opacity 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {coverUrl ? (
        <img src={coverUrl} alt="封面" style={{
          width: 56, height: 78, borderRadius: 10, objectFit: 'cover',
          flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }} />
      ) : (
        <div style={{
          width: 56, height: 78, borderRadius: 10, flexShrink: 0,
          background: '#2C2A28',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <BookOutlineSVG />
        </div>
      )}
    </div>
  );
}

// ====================================================================
// 用户头像（可点击上传，无头像时显示 SVG 线条人物）
// ====================================================================

function AvatarPerson({ avatarUrl, onClick }) {
  if (avatarUrl) {
    return (
      <div onClick={onClick} style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        overflow: 'hidden', cursor: 'pointer',
        boxShadow: '0 0 0 1.5px rgba(255,255,255,0.12)',
        transition: 'opacity 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
      >
        <img src={avatarUrl} alt="头像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  return (
    <div onClick={onClick} style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: '#3A3835', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 0 1.5px rgba(255,255,255,0.08)',
      transition: 'opacity 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      <PersonSVG />
    </div>
  );
}

// ====================================================================
// 主组件
// ====================================================================

export default function ReadingDiscoveryCard({
  bookTitle = '当怪物来敲门',
  discovery = '整本书藏着一个词——谈一谈。妈妈、外婆、连怪物巨人都说过。大人说谈一谈都不是什么好事情。',
  quote = '',
  thinking = '为什么大人要说"谈一谈"，而不是直接说？',
  userVoice = '大人说谈一谈都不是什么好事情。',
  avatarUrl,
  userName,
  keyword = '谈一谈',
  saved = false,
  coverUrl,
  author = '',
  month = '',
  bookId,
  onAvatarUpdate,
  onReRecord,       // () => void  重录/重新生成回调
}) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [localCoverUrl, setLocalCoverUrl] = useState(null);
  const coverInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const { updateBook } = useReading();
  const { session, updateProfile } = useAuth();
  const userUuid = session?.user_uuid;

  // ── 保存为图片 ──
  const handleDownload = useCallback(async () => {
    if (downloading || !cardRef.current) return;
    setDownloading(true);
    try {
      const dpr = window.devicePixelRatio || 2;
      const el = cardRef.current;
      // 高分辨率渲染：按设备像素比缩放，确保文字清晰锐利
      const canvas = await html2canvas(el, {
        backgroundColor: '#2C2A28',
        scale: dpr,
        useCORS: true,
        logging: false,
        // 锁定容器尺寸，避免滚动截断
        width: el.scrollWidth,
        height: el.scrollHeight,
        onclone: (clonedDoc) => {
          // 隐藏底部交互按钮（重录/下载），不出现在截图中
          const toolbar = clonedDoc.getElementById('card-toolbar');
          if (toolbar) toolbar.style.display = 'none';
          // 确保卡片容器溢出可见
          const root = clonedDoc.querySelector('[data-card-root]');
          if (root) {
            root.style.overflow = 'visible';
            root.style.maxHeight = 'none';
          }
        },
      });

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

      // 保护：画布被污染或尺寸异常时 toBlob 会返回 null
      if (!blob) { throw new Error('图片生成失败，可能因跨域资源限制'); }

      // 优先使用 navigator.share（iOS 支持分享到相册）
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([], '')] })) {
        const file = new File([blob], `${bookTitle}_读书说说.png`, { type: 'image/png' });
        await navigator.share({ files: [file], title: bookTitle });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${bookTitle}_读书说说.png`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (e) {
      console.warn('[Card] 截图/下载失败:', e);
    } finally {
      setDownloading(false);
    }
  }, [downloading, bookTitle]);

  // ── 封面上传 ──
  const handleCoverUpload = useCallback(async (file) => {
    if (!file || !bookId) return;
    try {
      const dataUrl = await compressImageFile(file);
      if (!dataUrl) return;
      setLocalCoverUrl(dataUrl);
      const imageId = await saveImage(file);
      updateBook(bookId, { imageId, coverUrl: dataUrl });
      if (userUuid) {
        await supabase.from('books').update({ cover_data: dataUrl }).eq('id', bookId);
      }
    } catch (e) { console.warn('[Card] 封面上传失败:', e); }
  }, [bookId, userUuid, updateBook]);

  // ── 头像上传 ──
  const handleAvatarUpload = useCallback(async (file) => {
    if (!file) return;
    try {
      const dataUrl = await compressAvatarImage(file);
      if (!dataUrl) return;
      await saveAvatar(file);
      if (userUuid) {
        await updateProfile({ avatar_url: dataUrl });
      }
      if (onAvatarUpdate) onAvatarUpdate(dataUrl);
    } catch (e) { console.warn('[Card] 头像上传失败:', e); }
  }, [userUuid, updateProfile, onAvatarUpdate]);

  const authorYear = [author, month].filter(Boolean).join(' · ');
  const displayCover = localCoverUrl || coverUrl;

  return (
    <div ref={cardRef} data-card-root style={{
      width: '100%', maxWidth: 320, margin: '0 auto',
      padding: '24px 22px 0',
      borderRadius: 20, position: 'relative',
      background: '#2C2A28',
      backgroundImage: 'linear-gradient(145deg, rgba(170, 140, 110, 0.08) 0%, rgba(44, 42, 40, 0.95) 60%)',
      boxShadow: '0 12px 40px rgba(44, 36, 22, 0.2), 0 3px 12px rgba(44, 36, 22, 0.1)',
      border: '1px solid rgba(200, 190, 175, 0.08)',
      textAlign: 'left',
      color: '#E8E2D7',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font, system-ui, -apple-system, sans-serif)',
      animation: saved ? 'savedPulse 0.4s ease-in-out' : 'none',
    }}>
      {/* ========== 隐藏文件输入 ========== */}
      <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handleCoverUpload(e.target.files[0]); e.target.value = ''; }} />
      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handleAvatarUpload(e.target.files[0]); e.target.value = ''; }} />

      {/* ========== 已保存角标 ========== */}
      {saved && (
        <div style={{
          position: 'absolute', top: -6, right: -6,
          background: '#3D7A4F', color: 'white', fontSize: 9, fontWeight: 700,
          padding: '3px 8px', borderRadius: 12,
          boxShadow: '0 2px 8px rgba(61,122,79,0.3)',
          letterSpacing: 0.5,
        }}>
          ✔️ 已保存
        </div>
      )}

      {/* ========== 顶部：封面双栏 ========== */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <BookCover
          coverUrl={displayCover}
          onClick={() => { if (bookId) coverInputRef.current?.click(); }}
        />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 9, color: '#A39C94', letterSpacing: 0.5, marginBottom: 4 }}>
            读书说说
          </div>
          <div style={{
            fontSize: 17, fontWeight: 700, color: '#E8E2D7',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 3,
          }}>
            {bookTitle}
          </div>
          <div style={{ fontSize: 10, color: '#A39C94', letterSpacing: 0.2, marginBottom: 4 }}>
            {authorYear || '·'}
          </div>
        </div>
      </div>

      {/* ========== 内容区 ========== */}
      <div style={{ flex: 1 }}>
        {/* 发现 */}
        <div>
          <div style={{ fontSize: 12, color: '#A39C94', fontWeight: 500, marginBottom: 4, letterSpacing: 0.5 }}>
            发现
          </div>
          <div style={{ fontSize: 13, lineHeight: 2, color: '#E8E2D7' }}>
            {discovery ? formatDiscovery(discovery, keyword) : discovery}
          </div>
        </div>

        {/* 原文 */}
        {quote && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: '#A39C94', fontWeight: 500, marginBottom: 4, letterSpacing: 0.5 }}>
            原文
          </div>
          <div style={{ paddingLeft: 12, borderLeft: '2.5px solid #A39C94', fontSize: 13, lineHeight: 2, color: '#E8E2D7', fontStyle: 'italic' }}>
            {quote}
          </div>
        </div>)}

        {/* 值得思考 */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: '#A39C94', fontWeight: 500, marginBottom: 4, letterSpacing: 0.5 }}>
            值得思考
          </div>
          <div style={{ fontSize: 13, lineHeight: 2, color: '#E8E2D7' }}>
            {thinking}
          </div>
        </div>
      </div>

      {/* ========== 底部：对话式金句 + 可点击头像 ========== */}
      <div style={{
        margin: '24px -22px 0',
        padding: '16px 22px',
        borderTop: '1px solid rgba(200, 190, 175, 0.08)',
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <AvatarPerson
            avatarUrl={avatarUrl}
            onClick={() => avatarInputRef.current?.click()}
          />
          <div style={{
            flex: 1,
          }}>
            <div style={{
              fontSize: 12, lineHeight: 1.7,
              fontStyle: 'italic', color: '#B5B0A8',
              letterSpacing: 0.3,
            }}>
              {userVoice}
            </div>
          </div>
        </div>
      </div>

      {/* ========== 分隔线 ========== */}
      <div style={{ height: 0, borderTop: '1px solid rgba(200, 190, 175, 0.06)', margin: '0 -22px' }} />

      {/* ========== 底部操作栏（极简细线图标 + 文字） ========== */}
      <div id="card-toolbar" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        height: 44, padding: '0 22px',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
      }}>
        {/* 重录（左侧） */}
        {onReRecord && (
          <div
            onClick={onReRecord}
            title="重新记录"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: 'pointer', lineHeight: 0,
              transition: 'opacity 0.2s',
              background: 'transparent',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.6'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <ReRecordSVG />
            <span style={{ fontSize: 12, fontWeight: 300, color: '#999999', lineHeight: 1 }}>重录</span>
          </div>
        )}
        {/* 下载（右侧） */}
        <div
          onClick={downloading ? undefined : handleDownload}
          title="保存为图片"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: downloading ? 'not-allowed' : 'pointer', lineHeight: 0,
            transition: 'opacity 0.2s',
            opacity: downloading ? 0.7 : 1,
            background: 'transparent',
          }}
          onMouseEnter={e => { if (!downloading) e.currentTarget.style.opacity = '0.6'; }}
          onMouseLeave={e => { if (!downloading) e.currentTarget.style.opacity = '1'; }}
        >
          {downloading ? (
            <span style={{
              display: 'inline-block', width: 14, height: 14,
              border: '1.5px solid rgba(255,255,255,0.15)',
              borderTopColor: '#D1B88D',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
          ) : (
            <DownloadSVG />
          )}
          <span style={{ fontSize: 12, fontWeight: 300, color: '#999999', lineHeight: 1 }}>
            {downloading ? '生成中…' : '下载'}
          </span>
        </div>
      </div>
    </div>
  );
}
