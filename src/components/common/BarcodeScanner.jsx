// ============================================================
// BarcodeScanner — ISBN 扫码/手动输入组件
// 优先使用 BarcodeDetector API（仅支持 HTTPS+部分浏览器）
// 降级方案：弹出手动输入 ISBN 框
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';

export default function BarcodeScanner({ isOpen, onClose, onScan }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualIsbn, setManualIsbn] = useState('');
  const scanningRef = useRef(false);

  // 启动后置摄像头
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch (e) {
      // 没有摄像头权限或设备不支持 → 降级到手动输入
      setError('无法访问摄像头，请手动输入 ISBN');
      setManualMode(true);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    let timer = null;

    const tryDetect = async () => {
      // 1. 检测浏览器是否支持 BarcodeDetector API
      if (!('BarcodeDetector' in window)) {
        setError('当前设备不支持自动扫码，请手动输入 ISBN');
        setManualMode(true);
        return;
      }

      // 2. 启动摄像头
      const cameraOk = await startCamera();
      if (!cameraOk || cancelled) return;

      // 3. 创建检测器（优先 ISBN/条码格式）
      let detector;
      try {
        detector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'isbn_13', 'isbn_10', 'code_39', 'code_128', 'qr_code'],
        });
      } catch (e) {
        setError('扫码初始化失败，请手动输入 ISBN');
        setManualMode(true);
        return;
      }

      scanningRef.current = true;

      const scan = async () => {
        if (!scanningRef.current || cancelled) return;
        try {
          if (videoRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const barcodes = await detector.detect(videoRef.current);
            for (const bc of barcodes) {
              const raw = bc.rawValue.replace(/[^0-9X]/gi, '');
              if (raw.length >= 10) {
                // 检测到有效条码 → 回调并关闭
                scanningRef.current = false;
                onScan(raw);
                return;
              }
            }
          }
        } catch (_) {
          // 单帧检测失败，继续下一帧
        }
        timer = setTimeout(scan, 400);
      };

      scan();
    };

    tryDetect();

    // 清理函数：停止摄像头 + 取消定时器
    return () => {
      cancelled = true;
      scanningRef.current = false;
      if (timer) clearTimeout(timer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, startCamera, onScan]);

  const handleManualSubmit = () => {
    const clean = manualIsbn.replace(/[^0-9X]/gi, '');
    if (clean.length < 10) {
      setError('ISBN 格式不正确（至少 10 位）');
      return;
    }
    onScan(clean);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}
      style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: 20, padding: 24, maxWidth: 380, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* 标题栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>📷 扫条形码</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            color: 'var(--ink3)', padding: 4, lineHeight: 1,
          }}>✕</button>
        </div>

        {/* ====== 摄像头扫码区域 ====== */}
        {!manualMode && (
          <div>
            <div style={{
              position: 'relative', width: '100%', aspectRatio: '2/3', maxHeight: 380,
              background: '#000', borderRadius: 12, overflow: 'hidden', marginBottom: 16,
            }}>
              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* 扫码框蒙层 — 长条形适配条形码 */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80%', height: '22%',
                border: '2px solid rgba(255,255,255,0.6)',
                borderRadius: 8,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)',
              }} />
              {/* 底部引导文字 */}
              <div style={{
                position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center',
              }}>
                <span style={{
                  color: 'white', fontSize: 11, background: 'rgba(0,0,0,0.5)',
                  padding: '4px 12px', borderRadius: 6,
                }}>
                  将条码对准框内，自动识别
                </span>
              </div>
            </div>
            {/* 摄像头模式下的按钮组 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" style={{ flex: 1, padding: '10px', fontSize: 12 }}
                onClick={() => { setManualMode(true); setError(''); }}>
                ⌨️ 手动输入 ISBN
              </button>
              <button onClick={onClose} style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: '#C8815C', color: 'white', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font)',
              }}>
                取消
              </button>
            </div>
          </div>
        )}

        {/* ====== 手动输入降级区域 ====== */}
        {manualMode && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 8, lineHeight: 1.6 }}>
              {error || '请在下方输入图书的 ISBN 号（通常印在封底条形码上方）'}
            </p>
            <input type="text" value={manualIsbn}
              onChange={e => setManualIsbn(e.target.value.replace(/[^0-9X]/gi, ''))}
              placeholder="输入 13 位 ISBN 号"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleManualSubmit(); }}
              style={{
                width: '100%', padding: '12px 14px', border: '1px solid #D6CFC4',
                borderRadius: 8, fontSize: 18, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'var(--font)',
              }} />
            {error && <div style={{ color: '#C47A6E', fontSize: 11, marginTop: 4 }}>{error}</div>}
            <button className="btn-primary" style={{ width: '100%', padding: 12, fontSize: 14, marginTop: 8 }}
              onClick={handleManualSubmit}>
              🔍 查询 ISBN
            </button>
            {/* 尝试切换回摄像头 */}
            <button className="btn-ghost" style={{ width: '100%', padding: 10, fontSize: 12, marginTop: 6 }}
              onClick={() => { setManualMode(false); setError(''); startCamera(); }}>
              📷 尝试使用摄像头
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
