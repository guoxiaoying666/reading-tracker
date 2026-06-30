import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useReading } from '../../context/ReadingContext';

const DIMENSION_LABELS = {
  narrative: '📖 文学叙事',
  science: '🌿 自然科学',
  humanity: '🏛️ 人文社会',
  art_create: '🎨 艺术创想',
  self_growth: '🧘 自我成长',
};

const DIM_COLORS = {
  narrative: '#C49A7E',
  science: '#7A9E8B',
  humanity: '#5B8B9A',
  art_create: '#A68A6A',
  self_growth: '#A68494',
};

export default function AdminDashboard() {
  const { session } = useAuth();
  const { setActiveTab } = useReading();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // 用户藏书详情
  const [detailUser, setDetailUser] = useState(null);
  const [userBooks, setUserBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);

  useEffect(() => {
    verifyAndLoad();
  }, []);

  async function verifyAndLoad() {
    if (!session?.user_uuid) {
      setError('请先登录后再访问管理后台');
      setLoading(false);
      return;
    }

    try {
      const checkResp = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', user_uuid: session.user_uuid }),
      });
      const checkData = await checkResp.json();

      if (checkData.isAdmin !== true) {
        setError('⚠️ 无管理权限，请联系管理员开通');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const [statsResp, usersResp] = await Promise.all([
        fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'stats', user_uuid: session.user_uuid }),
        }),
        fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'users', user_uuid: session.user_uuid }),
        }),
      ]);

      const statsData = statsResp.ok ? await statsResp.json() : null;
      if (!statsResp.ok || !statsData) throw new Error(statsData?.error || '加载统计失败');

      const usersData = usersResp.ok ? await usersResp.json() : null;
      if (!usersResp.ok || !usersData) throw new Error(usersData?.error || '加载用户列表失败');

      setStats(statsData);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (e) {
      setError('加载失败：' + e.message);
    } finally {
      setLoading(false);
    }
  }

  /** 查看某用户的藏书 */
  async function openUserBooks(u) {
    setDetailUser(u);
    setLoadingBooks(true);
    setUserBooks([]);
    try {
      const resp = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'user-books', user_uuid: session.user_uuid, target_user_id: u.id }),
      });
      if (!resp.ok) throw new Error((await resp.json()).error || '查询失败');
      const data = await resp.json();
      setUserBooks(Array.isArray(data) ? data : []);
    } catch (e) {
      setUserBooks([]);
      alert('加载藏书失败：' + e.message);
    } finally {
      setLoadingBooks(false);
    }
  }

  /** 返回用户列表 */
  function backToList() {
    setDetailUser(null);
    setUserBooks([]);
  }

  // ---- 加载中 ----
  if (loading) {
    return (
      <div style={{ paddingTop: 40, textAlign: 'center' }}>
        <div className="lookup-spinner" style={{ margin: '0 auto 14px' }} />
        <div style={{ fontSize: 14, color: 'var(--ink3)' }}>验证中…</div>
      </div>
    );
  }

  // ---- 错误/无权限 ----
  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔒</div>
        <div className="empty-title">访问受限</div>
        <div className="empty-desc">{error}</div>
        <button className="btn-ghost" onClick={() => setActiveTab('home')}>← 返回首页</button>
      </div>
    );
  }

  if (!isAdmin) return null;

  // ================================================================
  // 藏书详情视图
  // ================================================================
  if (detailUser) {
    const u = detailUser;
    const dimCounts = {};
    let total = userBooks.length;
    userBooks.forEach(b => {
      dimCounts[b.dimension] = (dimCounts[b.dimension] || 0) + 1;
    });

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button className="btn-ghost" onClick={backToList} style={{ fontSize: 11, padding: '4px 10px' }}>
            ← 返回
          </button>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            📚 {u.name || (u.is_anonymous ? '访客' : '未命名')} 的藏书
          </h2>
          <span style={{ fontSize: 12, color: 'var(--ink3)', flexShrink: 0 }}>{total} 本</span>
        </div>

        {/* 小统计 */}
        {total > 0 && (
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11 }}>
              {Object.entries(dimCounts).sort((a, b) => b[1] - a[1]).map(([dim, count]) => (
                <span key={dim} style={{
                  padding: '3px 10px', borderRadius: 6,
                  background: DIM_COLORS[dim] + '22',
                  color: DIM_COLORS[dim] || 'var(--ink2)',
                  fontWeight: 600,
                }}>
                  {DIMENSION_LABELS[dim] || dim} {count}本
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 书目列表 */}
        {loadingBooks ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>
            <div className="lookup-spinner" style={{ margin: '0 auto 12px', width: 28, height: 28 }} />
            加载中…
          </div>
        ) : total === 0 ? (
          <div className="empty-state" style={{ padding: '40px 16px' }}>
            <div className="empty-icon">📭</div>
            <div className="empty-title">暂无藏书</div>
            <div className="empty-desc">该用户还没有录入任何图书</div>
          </div>
        ) : (
          <div>
            {userBooks.map((b, i) => (
              <div key={b.id || i} className="book-card">
                <div className="book-card-header">
                  <div>
                    <div className="book-title" style={{ fontSize: 14 }}>{b.title}</div>
                    {b.author && <div className="book-author">{b.author}</div>}
                  </div>
                  {b.childStar > 0 && (
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{'⭐'.repeat(b.childStar)}</span>
                  )}
                </div>
                <div className="book-meta">
                  {b.dimension && (
                    <span className="book-tag dim">{DIMENSION_LABELS[b.dimension] || b.dimension}</span>
                  )}
                  {b.level2 && <span className="book-tag l2">{b.level2}</span>}
                  {b.month && <span className="book-tag source" style={{ background: '#F3EDE0', color: 'var(--yellow)' }}>{b.month}</span>}
                  {(b.fiction) && <span className="book-tag source">{b.fiction === '虚构' ? '📖 虚构' : '📗 非虚构'}</span>}
                  {b.isbn && <span className="book-tag source">ISBN {b.isbn}</span>}
                </div>
                {b.note && <div className="book-note">📝 {b.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ================================================================
  // 主面板：概览 + 用户列表
  // ================================================================
  const dimData = Array.isArray(stats?.dimension_breakdown) ? stats.dimension_breakdown : [];
  const totalDimBooks = dimData.reduce((sum, d) => sum + (d.count || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>🔧 管理后台</h2>
        <button className="btn-ghost" onClick={() => setActiveTab('home')} style={{ fontSize: 11, padding: '4px 10px' }}>
          ✕ 关闭
        </button>
      </div>

      {/* 统计概览 */}
      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-icon">👥</span>
          <div className="stat-value">{stats?.total_users ?? '-'}</div>
          <div className="stat-label">总用户</div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">📚</span>
          <div className="stat-value">{stats?.total_books ?? '-'}</div>
          <div className="stat-label">总藏书</div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">📱</span>
          <div className="stat-value">{stats?.registered_users ?? '-'}</div>
          <div className="stat-label">注册用户</div>
        </div>
      </div>

      <div className="stats-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="stat-item">
          <span className="stat-icon">🎭</span>
          <div className="stat-value">{stats?.anonymous_users ?? '-'}</div>
          <div className="stat-label">匿名用户</div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">📅</span>
          <div className="stat-value">{stats?.recent_registrations ?? '-'}</div>
          <div className="stat-label">本周新增</div>
        </div>
      </div>

      {/* 五维分布 */}
      {dimData.length > 0 && (
        <div className="card">
          <h3>📊 五维分布</h3>
          <div className="dim-bars">
            {dimData.map((d) => {
              const pct = totalDimBooks > 0 ? ((d.count / totalDimBooks) * 100).toFixed(0) : 0;
              return (
                <div className="dim-bar-row" key={d.dimension}>
                  <span className="dim-bar-label">{DIMENSION_LABELS[d.dimension] || d.dimension}</span>
                  <div className="dim-bar-track">
                    <div className="dim-bar-fill" style={{ width: pct + '%', background: DIM_COLORS[d.dimension] || 'var(--accent)' }}>
                      {pct > 15 ? pct + '%' : ''}
                    </div>
                  </div>
                  <span className="dim-bar-count">{d.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 用户列表 — 点击查看藏书 */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ marginBottom: 0 }}>👥 用户列表 <span style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 400 }}>（点击查看藏书）</span></h3>
          <span style={{ fontSize: 11, color: 'var(--ink3)' }}>共 {users.length} 人</span>
        </div>

        {users.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink3)', fontSize: 12 }}>暂无用户数据</div>
        ) : (
          <div>
            {users.map((u) => (
              <div
                key={u.id}
                onClick={() => openUserBooks(u)}
                style={{
                  padding: '10px 16px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8F3ED'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: u.is_anonymous ? '#EBE6DF' : 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: u.is_anonymous ? 'var(--ink3)' : 'white',
                  flexShrink: 0, fontWeight: 600,
                }}>
                  {u.is_anonymous ? '🎭' : (u.name?.[0] || '📱')}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>
                      {u.name || (u.is_anonymous ? '访客' : '未命名')}
                    </span>
                    {u.role === 'admin' && (
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F3EDE0', color: 'var(--yellow)' }}>
                        管理员
                      </span>
                    )}
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 4,
                      background: u.is_anonymous ? '#EBE6DF' : '#EAF1ED',
                      color: u.is_anonymous ? 'var(--ink3)' : 'var(--green)',
                    }}>
                      {u.is_anonymous ? '匿名' : '注册'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 2, color: 'var(--ink3)', fontSize: 11 }}>
                    {u.phone ? (
                      <span>📱 {u.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</span>
                    ) : (
                      <span style={{ color: '#CBC2B6' }}>未绑定手机</span>
                    )}
                    <span>📚 {u.book_count ?? 0} 本</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink3)', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '-'}
                  </span>
                  <span style={{ fontSize: 10 }}>›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 10, color: 'var(--ink3)' }}>
        好读 WondeRead 管理后台 · 点击用户查看藏书明细
      </div>
    </div>
  );
}
