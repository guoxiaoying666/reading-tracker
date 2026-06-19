import { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReadingProvider, useReading } from './context/ReadingContext';
import Header from './components/layout/Header';
import TabNav from './components/layout/TabNav';
import Bookshelf from './components/bookshelf/Bookshelf';
import Record from './components/record/Record';
import Discovery from './components/discovery/Discovery';
import Plan from './components/plan/Plan';
import LoginPage from './components/auth/LoginPage';
import BindPhoneModal from './components/auth/BindPhoneModal';
import './App.css';

function AppContent() {
  const { activeTab } = useReading();
  const { session } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showBindPhone, setShowBindPhone] = useState(false);

  const openBindPhone = useCallback(() => {
    setShowBindPhone(true);
  }, []);

  const closeBindPhone = useCallback(() => {
    setShowBindPhone(false);
  }, []);

  const closeLogin = useCallback(() => {
    setShowLogin(false);
  }, []);

  return (
    <div className="app">
      <Header
        onOpenLogin={() => setShowLogin(true)}
        onOpenBindPhone={openBindPhone}
      />
      <TabNav />
      {activeTab === 'bookshelf' && <Bookshelf />}
      {activeTab === 'record' && <Record />}
      {activeTab === 'discovery' && <Discovery />}
      {activeTab === 'plan' && <Plan />}

      {/* 登录/注册弹窗 */}
      {showLogin && (
        <div className="modal-overlay" onClick={closeLogin}>
          <div className="modal-content" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 400, margin: '0 auto', borderRadius: 20, overflow: 'hidden' }}>
            <LoginPage onClose={closeLogin} />
          </div>
        </div>
      )}

      {/* 绑定手机号弹窗（匿名用户升级） */}
      {showBindPhone && (
        <div className="modal-overlay" onClick={closeBindPhone}>
          <div className="modal-content" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 400, margin: '0 auto', borderRadius: 20, overflow: 'hidden' }}>
            <BindPhoneModal onClose={closeBindPhone} />
          </div>
        </div>
      )}
    </div>
  );
}

function Main() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9F7F4' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📚</div>
          <div style={{ fontSize: 14, color: '#9B9082' }}>加载中…</div>
        </div>
      </div>
    );
  }

  // 匿名/正式用户都能直接进入
  return (
    <ReadingProvider>
      <AppContent />
    </ReadingProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
}
