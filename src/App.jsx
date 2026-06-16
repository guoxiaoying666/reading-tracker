import { AuthProvider, useAuth } from './context/AuthContext';
import { ReadingProvider, useReading } from './context/ReadingContext';
import Header from './components/layout/Header';
import TabNav from './components/layout/TabNav';
import Bookshelf from './components/bookshelf/Bookshelf';
import Record from './components/record/Record';
import Discovery from './components/discovery/Discovery';
import Plan from './components/plan/Plan';
import LoginPage from './components/auth/LoginPage';
import './App.css';

function AppContent() {
  const { activeTab } = useReading();

  return (
    <div className="app">
      <Header />
      <TabNav />
      {activeTab === 'bookshelf' && <Bookshelf />}
      {activeTab === 'record' && <Record />}
      {activeTab === 'discovery' && <Discovery />}
      {activeTab === 'plan' && <Plan />}
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

  if (!session) return <LoginPage />;

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
