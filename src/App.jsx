import { useState, useCallback, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReadingProvider, useReading } from './context/ReadingContext';
import Header from './components/layout/Header';
import TabNav from './components/layout/TabNav';
import LandingPage from './components/landing/LandingPage';
import HomePage from './components/home/HomePage';
import Bookshelf from './components/bookshelf/Bookshelf';
import Record from './components/record/Record';
import VoiceRecord from './components/record/VoiceRecord';
import DiagnosisPage from './components/diagnosis/DiagnosisPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import AdminDashboard from './components/admin/AdminDashboard';
import OnboardingCarousel from './components/onboarding/OnboardingCarousel';
import BookFeedbackModal from './components/onboarding/BookFeedbackModal';
import TalentCard from './components/onboarding/TalentCard';
import CelebrationModal from './components/onboarding/CelebrationModal';
import LoginPage from './components/auth/LoginPage';
import BindPhoneModal from './components/auth/BindPhoneModal';
import PreventLossModal from './components/common/PreventLossModal';
import './App.css';
import './styles/landing.css';
// 诊断页 CSS 在 DiagnosisPage 组件对应的 diagnosis.css 文件中导入

const CAROUSEL_KEY = 'wonderead-carousel-done';

export default function App() {
  const [carouselDone, setCarouselDone] = useState(() => {
    return localStorage.getItem(CAROUSEL_KEY) === 'true';
  });

  const finishCarousel = useCallback(() => {
    localStorage.setItem(CAROUSEL_KEY, 'true');
    // 引导结束后直接跳到录书页
    localStorage.setItem('reading-tracker-tab', 'record');
    setCarouselDone(true);
  }, []);

  if (!carouselDone) {
    return <OnboardingCarousel onComplete={finishCarousel} />;
  }

  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
}

function AppContent() {
  const {
    activeTab, showTalent, talentBook, dismissTalent,
    showCelebration, dismissCelebration, setActiveTab,
    showFeedback, feedbackBook, dismissFeedback,
    books,
  } = useReading();
  const { session, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showBindPhone, setShowBindPhone] = useState(false);
  const [showPreventLoss, setShowPreventLoss] = useState(false);
  const [toast, setToast] = useState(null); // { title: string } | null
  const preventLossSource = useRef(null); // 'beforeunload' | 'logout'
  const userAcknowledged = useRef(false); // 用户已被告知，下次不拦截

  const closeBindPhone = useCallback(() => { setShowBindPhone(false); }, []);
  const closeLogin = useCallback(() => { setShowLogin(false); }, []);

  const isAnonymous = session?.is_anonymous !== false;
  const hasBooks = books.length > 0;

  // ---- Toast 提示（监听 book-added 事件）----
  useEffect(() => {
    const handler = (e) => {
      setToast({ title: e.detail?.title || '' });
      setTimeout(() => setToast(null), 2500);
    };
    window.addEventListener('book-added', handler);
    return () => window.removeEventListener('book-added', handler);
  }, []);

  // ---- beforeunload 拦截页面关闭/刷新 ----
  useEffect(() => {
    const handler = (e) => {
      if (userAcknowledged.current) return; // 用户已确认离开
      if (isAnonymous && hasBooks) {
        preventLossSource.current = 'beforeunload';
        setShowPreventLoss(true);
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isAnonymous, hasBooks]);

  // ---- 防丢弹窗 ----
  // 绑定手机号
  const handlePreventLossBind = useCallback(() => {
    setShowPreventLoss(false);
    preventLossSource.current = null;
    // 弹出绑定手机号弹窗
    setShowBindPhone(true);
  }, []);

  // 继续离开
  const handlePreventLossLeave = useCallback(() => {
    setShowPreventLoss(false);
    if (preventLossSource.current === 'logout') {
      // 来源是退出按钮 -> 直接执行退出
      userAcknowledged.current = true;
      preventLossSource.current = null;
      logout();
    } else {
      // 来源是 beforeunload -> 标记已确认，下次不再拦截
      userAcknowledged.current = true;
      preventLossSource.current = null;
    }
  }, [logout]);

  // 关闭弹窗（X 按钮）
  const handlePreventLossClose = useCallback(() => {
    setShowPreventLoss(false);
    preventLossSource.current = null;
  }, []);

  // ---- Header 发起退出时检查 ----
  const handleHeaderLogout = useCallback(() => {
    if (isAnonymous && hasBooks) {
      preventLossSource.current = 'logout';
      setShowPreventLoss(true);
    } else {
      logout();
    }
  }, [isAnonymous, hasBooks, logout]);

  return (
    <div className="app">
      <Header
        onOpenLogin={() => setShowLogin(true)}
        onLogout={handleHeaderLogout}
      />
      <TabNav />
      {/* Record 页没有独立 Tab，通过首页/书架按钮跳入 */}
      {activeTab === 'home' && <HomePage />}
      {activeTab === 'bookshelf' && <Bookshelf />}
      {activeTab === 'record' && <Record />}
      {activeTab === 'voice_record' && <ErrorBoundary><VoiceRecord /></ErrorBoundary>}
      {activeTab === 'diagnosis' && <ErrorBoundary><DiagnosisPage /></ErrorBoundary>}
      {activeTab === 'admin' && <AdminDashboard />}
      {showLogin && (
        <div className="modal-overlay" onClick={closeLogin} style={{ alignItems: 'flex-start', paddingTop: 40, overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ maxWidth: 400, margin: '0 auto', borderRadius: 24, width: '100%' }}>
            <LoginPage onClose={closeLogin} />
          </div>
        </div>
      )}
      {showBindPhone && (
        <div className="modal-overlay" onClick={closeBindPhone} style={{ alignItems: 'flex-start', paddingTop: 40, overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ maxWidth: 400, margin: '0 auto', borderRadius: 24, width: '100%' }}>
            <BindPhoneModal onClose={closeBindPhone} />
          </div>
        </div>
      )}
      {showPreventLoss && (
        <PreventLossModal
          onClose={handlePreventLossClose}
          onBind={handlePreventLossBind}
          onLeave={handlePreventLossLeave}
        />
      )}
      {showTalent && talentBook && <TalentCard bookTitle={talentBook.title} onDismiss={dismissTalent} onGoToBookshelf={() => { dismissTalent(); setActiveTab('bookshelf'); }} />}
      {showCelebration && <CelebrationModal onDismiss={dismissCelebration} />}
      {showFeedback && feedbackBook && (
        <BookFeedbackModal
          title={feedbackBook.title}
          booksCount={feedbackBook.booksCount}
          newDimension={feedbackBook.newDimension}
          onDismiss={dismissFeedback}
          onGoToBookshelf={() => { dismissFeedback(); setActiveTab('bookshelf'); }}
        />
      )}

      {/* Toast 提示 */}
      {toast && (
        <div style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 2000, animation: 'slideDown 0.25s ease',
          background: '#2C2416', color: 'white', borderRadius: 12,
          padding: '12px 20px', fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 20px rgba(44,36,22,0.2)',
          whiteSpace: 'nowrap', maxWidth: '90vw', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          ✅ 已成功录入《{toast.title}》
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

  const isAnonymous = session?.is_anonymous !== false;
  if (!session || isAnonymous) {
    return (
      <ReadingProvider useSamples={false}>
        <AppContent />
      </ReadingProvider>
    );
  }

  return (
    <ReadingProvider useSamples={false} userUuid={session?.user_uuid}>
      <AppContent />
    </ReadingProvider>
  );
}
