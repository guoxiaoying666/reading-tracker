// ============================================================
// AccountSettings — 账号设置弹窗
// 已登录用户可修改昵称、头像、密码
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAvatar, saveAvatar, getImage } from '../../utils/imageDB';
import AvatarUpload from '../common/AvatarUpload';

export default function AccountSettings({ onClose }) {
  const { session, updateProfile } = useAuth();

  const [name, setName] = useState(session?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('profile'); // 'profile' | 'password'

  const isAnonymous = session?.is_anonymous !== false;
  const phone = session?.phone || '';

  // 加载头像（优先 IndexedDB，其次 session）
  useEffect(() => {
    getAvatar().then(url => {
      if (url) setAvatarUrl(url);
      else if (session?.avatar_url) setAvatarUrl(session.avatar_url);
    });
  }, [session?.avatar_url]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // ---- 保存昵称 ----
  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) { showToast('昵称不能为空'); return; }
    setSaving(true);
    try {
      await updateProfile({ name: trimmed });
      showToast('✅ 昵称已更新');
    } catch (e) {
      showToast('保存失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ---- 头像上传 ----
  const handleAvatarChange = async (file) => {
    try {
      const compressedUrl = await saveAvatar(file);
      setAvatarUrl(compressedUrl);
      // 同步到 Supabase profile，确保 Header / 其他页面也能看到
      await updateProfile({ avatar_url: compressedUrl });
      showToast('✅ 头像已更新');
    } catch (e) {
      showToast(e.message || '头像上传失败');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="modal-content" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 400, margin: '0 auto', borderRadius: 20, padding: 24 }}>

        {/* 头部 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-title)' }}>
            👤 账号设置
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 8,
            padding: '4px 10px', fontSize: 12, color: 'var(--ink3)', cursor: 'pointer',
            fontFamily: 'var(--font)',
          }}>✕ 关闭</button>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: '#F3EDE5', borderRadius: 10, padding: 3 }}>
          <button onClick={() => setTab('profile')} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === 'profile' ? 'white' : 'transparent',
            color: tab === 'profile' ? '#C8815C' : '#9B9082',
            fontWeight: 600, fontSize: 13, fontFamily: 'var(--font)',
            transition: 'all 0.15s',
          }}>个人资料</button>
          <button onClick={() => setTab('password')} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === 'password' ? 'white' : 'transparent',
            color: tab === 'password' ? '#C8815C' : '#9B9082',
            fontWeight: 600, fontSize: 13, fontFamily: 'var(--font)',
            transition: 'all 0.15s',
          }}>修改密码</button>
        </div>

        {toast && (
          <div style={{
            textAlign: 'center', padding: '8px 12px', borderRadius: 8,
            background: '#F5FAF5', border: '1px solid #D4E4D6',
            fontSize: 12, color: '#3D7A4F', marginBottom: 14,
          }}>{toast}</div>
        )}

        {/* ===== 个人资料 ===== */}
        {tab === 'profile' && (
          <div>
            {/* 手机号（只读） */}
            {phone && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', marginBottom: 4, display: 'block' }}>手机号</label>
                <div style={{
                  padding: '10px 12px', background: '#F5F3F0', borderRadius: 8,
                  fontSize: 14, color: 'var(--ink3)', border: '1px solid var(--border)',
                }}>
                  {phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                  <span style={{ fontSize: 10, marginLeft: 6, color: '#9B9082' }}>（已绑定）</span>
                </div>
              </div>
            )}

            {/* 头像上传 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', marginBottom: 8, display: 'block' }}>头像</label>
              <AvatarUpload currentAvatar={avatarUrl} onAvatarChange={handleAvatarChange} />
            </div>

            {/* 昵称 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', marginBottom: 4, display: 'block' }}>昵称</label>
              <input type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="输入孩子昵称"
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'var(--font)',
                  color: 'var(--ink)', boxSizing: 'border-box',
                }} />
            </div>

            <button onClick={handleSaveName} disabled={saving} style={{
              width: '100%', padding: 12, borderRadius: 10, border: 'none',
              background: saving ? '#D6CFC4' : '#C8815C', color: 'white',
              fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font)', transition: 'all 0.15s',
            }}>
              {saving ? '⏳ 保存中...' : '💾 保存修改'}
            </button>
          </div>
        )}

        {/* ===== 修改密码 ===== */}
        {tab === 'password' && (
          <PasswordChangeForm session={session} onToast={showToast} />
        )}
      </div>
    </div>
  );
}

function PasswordChangeForm({ session, onToast }) {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      onToast('新密码必须为6位数字'); return;
    }
    if (newPin !== confirmPin) {
      onToast('两次密码不一致'); return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          user_uuid: session?.user_uuid,
          old_pin: oldPin,
          new_pin: newPin,
        }),
      });
      const data = await resp.json();
      if (data.error) {
        onToast(data.error);
      } else {
        onToast('✅ 密码已修改');
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
      }
    } catch (e) {
      onToast('修改失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', marginBottom: 4, display: 'block' }}>当前密码</label>
        <input type="password" value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="输入6位数字密码" maxLength={6}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'var(--font)', color: 'var(--ink)', boxSizing: 'border-box' }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', marginBottom: 4, display: 'block' }}>新密码</label>
        <input type="password" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="设置新的6位数字密码" maxLength={6}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'var(--font)', color: 'var(--ink)', boxSizing: 'border-box' }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', marginBottom: 4, display: 'block' }}>确认新密码</label>
        <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="再次输入新密码" maxLength={6}
          onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'var(--font)', color: 'var(--ink)', boxSizing: 'border-box' }} />
      </div>
      <button onClick={handleChangePassword} disabled={loading} style={{
        width: '100%', padding: 12, borderRadius: 10, border: 'none',
        background: loading ? '#D6CFC4' : '#C8815C', color: 'white',
        fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font)', transition: 'all 0.15s',
      }}>
        {loading ? '⏳ 修改中...' : '🔑 修改密码'}
      </button>
    </div>
  );
}
