import { useState, useRef, useEffect } from 'react';
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
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input key={i} ref={el => refs.current[i] = el} type="tel" maxLength={1}
          value={value[i] || ''}
          onChange={e => handleDigit(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          autoFocus={autoFocus && i === 0}
          style={{
            width: 42, height: 48, textAlign: 'center', fontSize: 22, fontWeight: 700,
            border: value[i] ? '2px solid #C8815C' : '1px solid #E8E2D8',
            borderRadius: 8, outline: 'none',
          }} />
      ))}
    </div>
  );
}

export default function BindPhoneModal({ onClose }) {
  const { upgrade } = useAuth();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const phoneRef = useRef(null);
  const pinRefs = useRef([]);
  const pinConfirmRefs = useRef([]);

  useEffect(() => { phoneRef.current?.focus(); }, []);

  const handleSubmit = async () => {
    const p = phone.trim();
    if (p.length < 11) { setError('请输入11位手机号'); return; }
    if (pin.length < 6) { setError('请设置6位数字密码'); return; }
    if (pin !== pinConfirm) { setError('两次密码不一致'); return; }
    setError(''); setLoading(true);
    const result = await upgrade(p, pin);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #F3EDE5, #EDE4D8)', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 360, background: 'white', borderRadius: 20, padding: '32px 24px', textAlign: 'center', boxShadow: '0 8px 40px rgba(44,36,22,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#A56545', marginBottom: 8 }}>绑定成功！</div>
          <div style={{ fontSize: 13, color: '#9B9082', marginBottom: 20 }}>你的阅读记录已关联到该手机号</div>
          <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15 }} onClick={onClose}>
            开始使用
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(160deg, #F3EDE5, #EDE4D8)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360, background: 'white', borderRadius: 20, padding: '32px 24px', boxShadow: '0 8px 40px rgba(44,36,22,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔗</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#A56545' }}>绑定手机号</div>
          <div style={{ fontSize: 12, color: '#9B9082', marginTop: 4 }}>绑定后数据不会丢失，可用手机号登录同步</div>
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, color: '#5C5244', marginBottom: 6, display: 'block' }}>手机号</label>
        <input ref={phoneRef} type="tel" value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder="输入手机号" onKeyDown={e => e.key === 'Enter' && pinRefs.current[0]?.focus()}
          style={{ width: '100%', padding: '14px', border: '1px solid #E8E2D8', borderRadius: 10, fontSize: 18, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />

        <div style={{ fontSize: 13, fontWeight: 600, color: '#5C5244', marginBottom: 6, textAlign: 'center' }}>设置6位数字密码</div>
        <PinInput value={pin} onChange={setPin} refs={pinRefs} autoFocus />

        <div style={{ fontSize: 12, color: '#5C5244', marginBottom: 4, textAlign: 'center' }}>再次输入确认</div>
        <PinInput value={pinConfirm} onChange={setPinConfirm} refs={pinConfirmRefs} />

        {error && <div style={{ color: '#C47A6E', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{error}</div>}

        <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 8 }}
          onClick={handleSubmit} disabled={loading}>{loading ? '绑定中…' : '确认绑定'}</button>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <span style={{ fontSize: 12, color: '#9B9082', cursor: 'pointer' }} onClick={onClose}>稍后再说</span>
        </div>
      </div>
    </div>
  );
}
