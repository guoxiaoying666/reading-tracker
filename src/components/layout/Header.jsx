import { useAuth } from '../../context/AuthContext';

export default function Header({ onOpenLogin, onOpenBindPhone }) {
  const { session, logout } = useAuth();
  const isAnonymous = session?.is_anonymous !== false;

  return (
    <header className="header" style={{ padding: '20px 20px 12px', position: 'relative' }}>
      {/* 标题 + slogan 同行 */}
      <div style={{ textAlign: 'center' }}>
        <h1 className="header-title" style={{ fontSize: 20, margin: 0, letterSpacing: 4 }}>
          📖 好读 · <span className="header-subtitle">陪孩子读出复利</span>
        </h1>
      </div>

      {/* 访客标识 + 操作按钮：第二行居中 */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 }}>
        {isAnonymous && (
          <span style={{ fontSize: 10, color: '#A69B8E', fontFamily: 'var(--font)' }}>访客模式 · 数据存于本地</span>
        )}
        {isAnonymous ? (
          <>
            <button onClick={onOpenBindPhone} style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
              padding: '4px 10px', fontSize: 10, color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
              fontFamily: 'var(--font)', whiteSpace: 'nowrap',
            }}>🔗 绑定手机</button>
            <button onClick={onOpenLogin} style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
              padding: '4px 10px', fontSize: 10, color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              fontFamily: 'var(--font)', whiteSpace: 'nowrap',
            }}>登录</button>
          </>
        ) : (
          <button onClick={logout} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
            padding: '4px 10px', fontSize: 10, color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
            fontFamily: 'var(--font)', whiteSpace: 'nowrap',
          }}>退出</button>
        )}
      </div>
    </header>
  );
}
