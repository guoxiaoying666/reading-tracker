// ============================================================
// usePinAutoFocus — PIN 自动聚焦 Hook（P2-10）
// ============================================================
import { useEffect } from 'react';

export default function usePinAutoFocus(pin, step, nextRefs, delay) {
  useEffect(() => {
    if (pin.length === 6 && step === 'pin' && nextRefs?.current) {
      const fn = () => nextRefs.current[0]?.focus();
      if (delay) setTimeout(fn, delay);
      else fn();
    }
  }, [pin, step, nextRefs, delay]);
}
