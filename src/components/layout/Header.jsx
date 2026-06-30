import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useReading } from '../../context/ReadingContext';
import { getAvatar } from '../../utils/imageDB';
import AccountSettings from '../auth/AccountSettings';

export default function Header({ onOpenLogin, onLogout }) {
  const { session, isAdmin } = useAuth();
  const { childSettings, setActiveTab } = useReading();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showAccount, setShowAccount] = useState(false);
  const dropdownRef = useRef(null);

  const isAnonymous = session?.is_anonymous !== false;
  const childName = session?.name || childSettings?.name || '';
  const userInitial = childName ? childName[0] : '小';

  // 加载头像（优先 IndexedDB，其次 session.avatar_url）
  useEffect(() => {
    getAvatar().then(url => {
      if (url) setAvatarUrl(url);
      else if (session?.avatar_url) setAvatarUrl(session.avatar_url);
    });
  }, [session?.avatar_url]);

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    if (onLogout) onLogout();
  };

  const closeAccount = () => setShowAccount(false);

  return (
    <header className="header">
      <div className="header-inner">
        {/* 左侧品牌 */}
        <div className="header-brand">
          <div>
            <span className="header-logo">好读</span>
            <span className="header-logo-sub">WondeRead</span>
          </div>
          <div className="header-slogan">因好奇多读，因思考深读</div>
        </div>

        {/* 右侧用户 */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          {isAnonymous ? (
            /* ---- 未登录：只有登录/注册一个按钮 ---- */
            <button onClick={onOpenLogin} style={{
              background: 'rgba(255,255,255,0.55)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '4px 12px',
              fontSize: 11, color: '#8F6B51', cursor: 'pointer',
              fontFamily: 'var(--font)', fontWeight: 500,
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = '#BA7A5A'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              登录 / 注册
            </button>
          ) : (
            /* ---- 已登录：头像 + 同步状态 + 下拉菜单 ---- */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                onClick={() => setDropdownOpen(!dropdownOpen)}>
                {/* 头像圆形 */}
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{
                    width: 28, height: 28, borderRadius: '50%',
                    objectFit: 'cover', flexShrink: 0,
                    border: '1.5px solid var(--border)',
                  }} />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #C8815C, #A56545)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600, color: 'white',
                    flexShrink: 0,
                  }}>
                    {userInitial}
                  </div>
                )}
                {/* 静默同步状态（小圆点） */}
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#7A9E8B',
                  flexShrink: 0, marginLeft: 1,
                }} title="数据已同步" />
              </div>

              {/* 下拉菜单 */}
              {dropdownOpen && (
                <>
                  <div className="header-dropdown-overlay" onClick={() => setDropdownOpen(false)} />
                  <div className="header-dropdown" style={{ minWidth: 130 }}>
                    <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--ink3)', borderBottom: '1px solid var(--border)' }}>
                      {childName || '小读者'}
                      <span style={{ marginLeft: 4, fontSize: 9, color: '#7A9E8B' }}>☁️ 已同步</span>
                    </div>
                    <button className="header-dropdown-item" onClick={() => { setDropdownOpen(false); setShowAccount(true); }}>
                      👤 账号设置
                    </button>
                    {isAdmin && (
                      <button className="header-dropdown-item" onClick={() => { setDropdownOpen(false); setActiveTab('admin'); }}>
                        🔧 管理后台
                      </button>
                    )}
                    <div className="header-dropdown-divider" />
                    <button className="header-dropdown-item danger" onClick={handleLogout}>
                      🚪 退出登录
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {showAccount && <AccountSettings onClose={closeAccount} />}
    </header>
  );
}
