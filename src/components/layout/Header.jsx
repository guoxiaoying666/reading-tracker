import { useAuth } from '../../context/AuthContext';

export default function Header({ onOpenLogin, onOpenBindPhone }) {
  const { session, logout } = useAuth();
  const isAnonymous = session?.is_anonymous !== false;
  const displayName = session?.name || (isAnonymous ? '访客' : '');
  const avatarUrl = session?.avatar_url || '/avatar.jpg';

  return (
    <header className="header" style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', padding: '16px 20px' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
        border: '2px solid rgba(255,255,255,0.15)',
        clipPath: 'circle(46%)',
      }}>
        <img src={avatarUrl} alt="头像" style={{ width: '140%', height: '140%', objectFit: 'cover', display: 'block', margin: '-20% 0 0 -20%' }} />
      </div>
      <div style={{ flex: 1 }}>
        <h1 className="header-title" style={{ fontSize: 18, margin: 0 }}>好读</h1>
        <p className="header-subtitle" style={{ fontSize: 11, margin: '2px 0 0' }}>
          {isAnonymous ? '访客模式 · ' : ''}陪孩子读出复利
        </p>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {isAnonymous ? (
          <>
            <button onClick={onOpenBindPhone} style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
              padding: '4px 8px', fontSize: 10, color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
              fontFamily: 'var(--font)', whiteSpace: 'nowrap',
            }}>🔗 绑定手机</button>
            <button onClick={onOpenLogin} style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
              padding: '4px 8px', fontSize: 10, color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              fontFamily: 'var(--font)', whiteSpace: 'nowrap',
            }}>登录</button>
          </>
        ) : (
          <button onClick={logout} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
            padding: '4px 8px', fontSize: 10, color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
            fontFamily: 'var(--font)', whiteSpace: 'nowrap',
          }}>退出</button>
        )}
      </div>
    </header>
  );
}
