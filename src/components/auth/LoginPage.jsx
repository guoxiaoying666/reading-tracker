import { useState, useRef, useEffect, useCallback } from 'react';
import usePinAutoFocus from '../../hooks/usePinAutoFocus';
import { useAuth } from '../../context/AuthContext';

function PinInput({ value, onChange, onKeyDown, refs, autoFocus }) {
  const handleDigit = (i, val) => {
    if (val && !/^\d$/.test(val)) return;
    onChange(value.substring(0, i) + val + value.substring(i + 1));
    if (val && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'Enter') onKeyDown?.();
  };

  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', padding: '0 12px', boxSizing: 'border-box', width: '100%', marginBottom: 12 }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input key={i} ref={el => refs.current[i] = el} type="tel" maxLength={1}
          value={value[i] || ''}
          onChange={e => handleDigit(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          autoFocus={autoFocus && i === 0}
          style={{
            width: 40, height: 42, flexShrink: 0, textAlign: 'center', fontSize: 15, fontWeight: 700,
            border: value[i] ? '2px solid #C8815C' : '1px solid #E8E2D8',
            borderRadius: 10, outline: 'none', background: '#FAFAFA',
          }} />
      ))}
    </div>
  );
}

export default function LoginPage({ onClose }) {
  const { login, register } = useAuth();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('login');
  const [regStep, setRegStep] = useState('pin');
  const pinRefs = useRef([]);
  const pinConfirmRefs = useRef([]);
  const phoneRef = useRef(null);

  // 键盘弹出时将弹窗上推，防止输入框被键盘遮挡
  useEffect(() => { phoneRef.current?.focus(); }, []);

  useEffect(() => {
    if (pin.length === 6 && regStep === 'pin') setRegStep('confirm');
  }, [pin, regStep]);
  usePinAutoFocus(pin, regStep, pinConfirmRefs, 100);

  const switchTab = useCallback((t) => {
    setTab(t); setError(''); setPin(''); setPinConfirm(''); setName(''); setRegStep('pin');
    setTimeout(() => phoneRef.current?.focus(), 100);
  }, []);

  const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #E8E2D8', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box', background: '#FAFAFA' };

  const handleLogin = async () => {
    const p = phone.trim();
    if (p.length < 11) { setError('请输入11位手机号'); return; }
    if (pin.length < 6) { setError('请输入6位数字密码'); return; }
    setError(''); setLoading(true);
    const result = await login(p, pin);
    if (result?.error) setError(result.error);
    else onClose?.();
    setLoading(false);
  };

  const handleRegister = async () => {
    const p = phone.trim();
    if (p.length < 11) { setError('请输入11位手机号'); return; }
    if (pin.length < 6) { setError('请设置6位数字密码'); return; }
    if (pin !== pinConfirm) { setError('两次密码不一致'); return; }
    setError(''); setLoading(true);
    const result = await register(p, pin, name.trim() || '小读者');
    if (result?.error) setError(result.error);
    else onClose?.();
    setLoading(false);
  };

  return (
    <div style={{ background: '#FAFAFA', borderRadius: 24, padding: '24px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: 360, margin: '0 auto', position: 'relative' }}>
      {onClose && (
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 20, color: '#9B9082', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0, lineHeight: 1 }}>✕</button>
      )}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#A56545', letterSpacing: 2 }}>📚 好读 · WondeRead</div>
      </div>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', background: '#F3EDE5', borderRadius: 10, padding: 3, marginBottom: 20, position: 'relative' }}>
        {['login', 'register'].map(t => (
          <button key={t} onClick={() => switchTab(t)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? '#C8815C' : '#9B9082', fontWeight: 700, fontSize: 14,
            fontFamily: 'var(--font)',
            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s',
          }}>
            {t === 'login' ? '登录' : '注册'}
          </button>
        ))}
      </div>

      {tab === 'login' && (
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#5C5244', marginBottom: 4, display: 'block' }}>手机号</label>
          <input ref={phoneRef} type="tel" value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="输入手机号"
            onKeyDown={e => { if (e.key === 'Enter' && phone.length === 11) pinRefs.current[0]?.focus(); }}
            style={{ ...inputStyle, marginBottom: 14 }} />

          <label style={{ fontSize: 12, fontWeight: 600, color: '#5C5244', marginBottom: 6, display: 'block' }}>6位数字密码</label>
          <PinInput value={pin} onChange={setPin} onKeyDown={handleLogin} refs={pinRefs} autoFocus={false} />

          {error && <div style={{ color: '#C47A6E', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{error}</div>}

          <button style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: '#C8815C', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
            onClick={handleLogin} disabled={loading}>
            {loading ? '登录中…' : '登录'}
          </button>
        </div>
      )}

      {tab === 'register' && (
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#5C5244', marginBottom: 4, display: 'block' }}>手机号</label>
          <input ref={phoneRef} type="tel" value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="输入手机号"
            onKeyDown={e => { if (e.key === 'Enter' && phone.length === 11) pinRefs.current[0]?.focus(); }}
            style={{ ...inputStyle, marginBottom: 14 }} />

          {regStep === 'pin' && (
            <>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#5C5244', marginBottom: 6, display: 'block' }}>设置6位数字密码</label>
              <PinInput value={pin} onChange={setPin} refs={pinRefs} autoFocus={false} />
            </>
          )}

          {regStep === 'confirm' && (
            <>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#5C5244', marginBottom: 6, display: 'block' }}>再次输入确认</label>
              <PinInput value={pinConfirm} onChange={setPinConfirm} refs={pinConfirmRefs} autoFocus />
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#5C5244', marginBottom: 4, display: 'block' }}>孩子昵称（选填）</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="例如：伊伊"
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  style={inputStyle} />
              </div>
              {error && <div style={{ color: '#C47A6E', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{error}</div>}
              <button style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: '#C8815C', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                onClick={handleRegister} disabled={loading}>
                {loading ? '注册中…' : '✨ 注册 · 进入书房'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 12, color: '#9B9082', cursor: 'pointer' }}
                  onClick={() => { setPin(''); setPinConfirm(''); setRegStep('pin'); pinRefs.current[0]?.focus(); }}>
                  ← 重新设置密码
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, color: '#C4BBAE', lineHeight: 1.5 }}>
        数据加密传输 · 仅用于登录验证
      </div>
    </div>
  );
}
