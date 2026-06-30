import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoginPage from '../auth/LoginPage';
import Screen1ProblemHook from './Screen1ProblemHook';
import Screen2FullPicture from './Screen2FullPicture';
import Screen3DiagnosisPreview from './Screen3DiagnosisPreview';
import Screen4CTA from './Screen4CTA';

// 着陆页：4 屏滚动体验
export default function LandingPage() {
  const screen2Ref = useRef(null);
  const [showLogin, setShowLogin] = useState(false);
  const { session, loading } = useAuth();

  const scrollToScreen2 = useCallback(() => {
    screen2Ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const openLogin = useCallback(() => {
    setShowLogin(true);
  }, []);

  const closeLogin = useCallback(() => {
    setShowLogin(false);
  }, []);

  // 如果用户刚刚注册成功，session 会变化，App.jsx 中的 !session 检查会让 LandingPage 消失
  // 但这里还需要处理关闭弹窗的场景

  return (
    <div style={{
      scrollSnapType: 'y proximity',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      position: 'relative',
    }}>
      {/* Screen 1: 案例引入 — 建立兴趣、信任、价值认知 */}
      <Screen1ProblemHook onScrollToScreen2={scrollToScreen2} />

      {/* Screen 2: 成长空间 — 能力 → 来源内容 → 成长建议 */}
      <div ref={screen2Ref}>
        <Screen2FullPicture />
      </div>

      {/* Screen 3: 成长画像 — 价值高潮，输出能力评估和成长方向 */}
      <Screen3DiagnosisPreview />

      {/* Screen 4: 注册转化 — 把价值转化为行动 */}
      <Screen4CTA
        onRegister={openLogin}
        onLogin={openLogin}
      />

      {/* 登录/注册弹窗 */}
      {showLogin && (
        <div className="modal-overlay" onClick={closeLogin}>
          <div className="modal-content" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 400, margin: '0 auto', borderRadius: 20, overflow: 'hidden' }}>
            <LoginPage onClose={closeLogin} />
          </div>
        </div>
      )}
    </div>
  );
}
