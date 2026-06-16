import { useState, useRef, useEffect, useCallback } from 'react';

/** 条形码扫描组件 — 支持 iOS 自签名证书环境 */
export default function BarcodeScanner({ onScan, isOpen, onClose }) {
  const [status, setStatus] = useState('idle'); // idle | scanning | found | error
  const [errorMsg, setErrorMsg] = useState('');
  const [useFrontCam, setUseFrontCam] = useState(false);
  const [localIsbn, setLocalIsbn] = useState('');
  const [closed, setClosed] = useState(false); // 强制关闭标志
  const scannerRef = useRef(null);
  const readerId = 'barcode-reader';

  // 检测摄像头可用性
  const camera = typeof navigator !== 'undefined' && (
    navigator?.mediaDevices?.getUserMedia || navigator?.getUserMedia
  );

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().catch(() => {});
      } catch (_) {}
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    setStatus('scanning');
    setErrorMsg('');

    // 先检查摄像头是否可用
    if (!camera) {
      setStatus('error');
      setErrorMsg('浏览器不支持摄像头访问');
      return;
    }

    // 动态导入 html5-qrcode（确保 DOM 就绪）
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const el = document.getElementById(readerId);
      if (!el || !isOpen || closed) return;

      const scanner = new Html5Qrcode(readerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: useFrontCam ? 'user' : 'environment' },
        {
          fps: 8,
          qrbox: { width: 260, height: 90 },
          formatsToSupport: [
            Html5Qrcode.SupportedFormats.EAN_13,
            Html5Qrcode.SupportedFormats.EAN_8,
            Html5Qrcode.SupportedFormats.UPC_A,
            Html5Qrcode.SupportedFormats.UPC_E,
            Html5Qrcode.SupportedFormats.CODE_128,
            Html5Qrcode.SupportedFormats.CODE_39,
            Html5Qrcode.SupportedFormats.ITF,
            Html5Qrcode.SupportedFormats.CODABAR,
          ],
        },
        (decodedText) => {
          setStatus('found');
          stopScanner();
          setTimeout(() => { if (onScan) onScan(decodedText); }, 500);
        },
        () => {}
      );
    } catch (err) {
      console.error('Scanner error:', err);
      setStatus('error');
      setErrorMsg(err?.message || String(err));
    }
  }, [isOpen, useFrontCam, onScan, stopScanner]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(startScanner, 500);
    return () => { clearTimeout(timer); stopScanner(); };
  }, [isOpen, startScanner, stopScanner]);

  // 组件卸载时清理
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  if (!isOpen || closed) return null;

  const handleClose = () => {
    setClosed(true);  // 立即标记关闭，无视其他状态
    stopScanner();
    if (onClose) setTimeout(onClose, 10);  // 异步调用，不影响当前渲染
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 2000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: 16, width: '100%', maxWidth: 400,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>
            {status === 'scanning' ? '📷 扫描条形码' :
             status === 'found' ? '✅ 已识别！' :
             status === 'error' ? '❌ 无法打开摄像头' : '准备扫描'}
          </h3>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
            color: '#9B9082', padding: '4px 8px', borderRadius: 6,
          }}>✕</button>
        </div>

        {/* 扫描区域 */}
        <div id={readerId} style={{ width: '100%', aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', background: '#000' }} />

        {/* 找到 */}
        {status === 'found' && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#6F9177', textAlign: 'center', fontWeight: 600 }}>
            正在查询书籍信息…
          </div>
        )}

        {/* 扫描中提示 */}
        {status === 'scanning' && (
          <div style={{ marginTop: 12, fontSize: 11, color: '#9B9082', textAlign: 'center' }}>
            将书籍背面条形码对准屏幕中央
          </div>
        )}

        {/* 错误状态 */}
        {status === 'error' && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, color: '#C47A6E', textAlign: 'center', marginBottom: 10 }}>
              iPhone 需要 HTTPS 或 localhost 才能调用摄像头。
              {errorMsg.includes('NotAllowed') && <><br/>请在「设置 → Safari → 相机」中允许访问。</>}
            </div>

            {/* 重试 + 切换摄像头 */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
              <button className="btn-primary" style={{ padding: '8px 18px', fontSize: 12 }}
                onClick={startScanner}>
                🔄 重试
              </button>
              <button className="btn-ghost" style={{ padding: '8px 14px', fontSize: 11 }}
                onClick={() => setUseFrontCam(f => !f)}>
                {useFrontCam ? '📱 后置' : '📱 前置'}摄像头
              </button>
            </div>

            {/* 直接输入 ISBN */}
            <div style={{ borderTop: '1px solid #E8E2D8', paddingTop: 10 }}>
              <div style={{ fontSize: 12, color: '#5C5244', fontWeight: 600, marginBottom: 6 }}>
                或直接输入 ISBN 条形码号：
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" value={localIsbn}
                  onChange={e => setLocalIsbn(e.target.value.replace(/[^0-9X]/gi, ''))}
                  placeholder="9787544291170" style={{ flex: 1, fontSize: 14, padding: '10px 12px', border: '1px solid #D6CFC4', borderRadius: 8, outline: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && (() => {
                    if (localIsbn.length >= 8) { handleClose(); if (onScan) onScan(localIsbn); }
                  })()} />
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 12, whiteSpace: 'nowrap' }}
                  onClick={() => { if (localIsbn.length >= 8) { handleClose(); if (onScan) onScan(localIsbn); } }}>
                  确定
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
