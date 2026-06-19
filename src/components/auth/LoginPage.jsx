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

export default function LoginPage({ onClose }) {
  const { login, register } = useAuth();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null); // null=phone, 'login', 'register', 'name'
  const pinRefs = useRef([]);
  const pinConfirmRefs = useRef([]);
  const phoneRef = useRef(null);

  useEffect(() => { phoneRef.current?.focus(); }, []);

  const handleNext = () => {
    const p = phone.trim();
    if (p.length < 11) { setError('请输入11位手机号'); return; }
    setError('');
    setMode('choose');
  };

  const handleLogin = async () => {
    if (pin.length < 6) { setError('请输入6位数字密码'); return; }
    setError(''); setLoading(true);
    const result = await login(phone.trim(), pin);
    if (result.error) setError(result.error);
    else onClose?.(); // 登录成功后关闭弹窗
    setLoading(false);
  };

  const handleRegisterPin = () => {
    if (pin.length < 6) { setError('请设置6位数字密码'); return; }
    if (pin !== pinConfirm) { setError('两次密码不一致'); return; }
    setError('');
    setMode('name');
    setTimeout(() => document.getElementById('reg-name-input')?.focus(), 100);
  };

  const handleRegister = async () => {
    setLoading(true);
    const result = await register(phone.trim(), pin, name.trim() || '小读者');
    if (result.error) setError(result.error);
    else onClose?.();
    setLoading(false);
  };

  const startOver = () => { setMode(null); setError(''); setPin(''); setPinConfirm(''); setName(''); };

  return (
    <div style={{ minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #F3EDE5, #EDE4D8)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360, background: 'white', borderRadius: 20,
        padding: '32px 24px', boxShadow: '0 8px 40px rgba(44,36,22,0.08)', position: 'relative' }}>
        {onClose && (
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 20, color: '#9B9082', cursor: 'pointer', fontFamily: 'var(--font)' }}>✕</button>
        )}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📚</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#A56545', letterSpacing: 2 }}>伊伊的书房</div>
          <div style={{ fontSize: 12, color: '#9B9082', marginTop: 4 }}>登录后可同步阅读记录到云端</div>
        </div>

        {/* 第1步：手机号 */}
        {!mode && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#5C5244', marginBottom: 6, display: 'block' }}>手机号</label>
            <input ref={phoneRef} type="tel" value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="输入手机号" autoFocus onKeyDown={e => e.key === 'Enter' && handleNext()}
              style={{ width: '100%', padding: '14px', border: '1px solid #E8E2D8', borderRadius: 10, fontSize: 18, outline: 'none', boxSizing: 'border-box' }} />
            {error && <div style={{ color: '#C47A6E', fontSize: 12, marginTop: 6 }}>{error}</div>}
            <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 16 }}
              onClick={handleNext}>下一步</button>
          </div>
        )}

        {/* 第2步：选择登录或注册 */}
        {mode === 'choose' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#C8815C', marginBottom: 20 }}>{phone}</div>
            <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, marginBottom: 12 }}
              onClick={() => { setMode('login'); setTimeout(() => pinRefs.current[0]?.focus(), 100); }}>
              🔑 已有账号，登录
            </button>
            <button style={{ width: '100%', padding: '14px', fontSize: 15, background: 'white', border: '1.5px solid #E8E2D8',
              borderRadius: 10, color: '#5C5244', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => { setMode('register'); setTimeout(() => pinRefs.current[0]?.focus(), 100); }}>
              ✨ 新账号，注册
            </button>
            <div style={{ marginTop: 16 }}>
              <span style={{ fontSize: 12, color: '#9B9082', cursor: 'pointer' }} onClick={startOver}>← 换一个号码</span>
            </div>
          </div>
        )}

        {/* 第3步-登录：输入密码 */}
        {mode === 'login' && (
          <div>
            <div style={{ fontSize: 13, color: '#5C5244', marginBottom: 4 }}>输入6位数字密码</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#C8815C', marginBottom: 16 }}>{phone}</div>
            <PinInput value={pin} onChange={setPin} onKeyDown={handleLogin} refs={pinRefs} autoFocus />
            {error && <div style={{ color: '#C47A6E', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{error}</div>}
            <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 4 }}
              onClick={handleLogin} disabled={loading}>{loading ? '登录中…' : '登录'}</button>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <span style={{ fontSize: 12, color: '#9B9082', cursor: 'pointer' }} onClick={startOver}>← 换一个号码</span>
            </div>
          </div>
        )}

        {/* 第3步-注册：设置密码 */}
        {mode === 'register' && (
          <div>
            <div style={{ fontSize: 13, color: '#5C5244', marginBottom: 4 }}>设置6位数字密码</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#C8815C', marginBottom: 16 }}>{phone}</div>
            <PinInput value={pin} onChange={setPin} refs={pinRefs} autoFocus />
            <div style={{ fontSize: 12, color: '#5C5244', marginBottom: 4, textAlign: 'center' }}>再次输入确认</div>
            <PinInput value={pinConfirm} onChange={setPinConfirm} refs={pinConfirmRefs} />
            {error && <div style={{ color: '#C47A6E', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{error}</div>}
            <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 4 }}
              onClick={handleRegisterPin}>下一步</button>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <span style={{ fontSize: 12, color: '#9B9082', cursor: 'pointer' }} onClick={startOver}>← 换一个号码</span>
            </div>
          </div>
        )}

        {/* 第4步-注册：填写名字 */}
        {mode === 'name' && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#5C5244', textAlign: 'center', marginBottom: 4 }}>给小书房取个名字</div>
            <div style={{ fontSize: 12, color: '#9B9082', textAlign: 'center', marginBottom: 16 }}>给孩子取个名字吧（选填）</div>
            <input id="reg-name-input" type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="例如：伊伊" onKeyDown={e => e.key === 'Enter' && handleRegister()}
              style={{ width: '100%', padding: '14px', border: '1px solid #E8E2D8', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            {error && <div style={{ color: '#C47A6E', fontSize: 12, marginTop: 6 }}>{error}</div>}
            <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 16 }}
              onClick={handleRegister} disabled={loading}>{loading ? '注册中…' : '✨ 进入书房'}</button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#C4BBAE' }}>数据加密传输，仅用于登录验证</div>
      </div>
    </div>
  );
}
