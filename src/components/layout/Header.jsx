import { useAuth } from '../../context/AuthContext';

export default function Header({ onOpenLogin, onOpenBindPhone }) {
  const { session, logout } = useAuth();
  const isAnonymous = session?.is_anonymous !== false;

  return (
    <header className="header" style={{ padding: '20px 20px 12px', position: 'relative' }}>
      {/* 访客标识：右上角 */}
      {isAnonymous && (
        <span style={{
          position: 'absolute', top: 12, right: 16,
          fontSize: 10, color: '#9B9082',
          fontFamily: 'var(--font)',
        }}>访客模式 · 数据存于本地</span>
      )}

      {/* 标题：居中 */}
      <div style={{ textAlign: 'center' }}>
        <h1 className="header-title" style={{ fontSize: 20, margin: 0, letterSpacing: 4 }}>
          📖 好读
        </h1>
        <p className="header-subtitle" style={{ fontSize: 11, margin: '4px 0 0', opacity: 0.7 }}>
          陪孩子读出复利
        </p>
      </div>

      {/* 操作按钮：居中 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
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
