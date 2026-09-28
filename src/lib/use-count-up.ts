/**
 * useCountUp — a number that rolls up to its target instead of
 * jumping there.
 *
 *   const shown = useCountUp(67);   // 0 → 67 over ~0.9s
 *
 * When the target changes later, it rolls from wherever it currently
 * is to the new value. The curve starts fast and settles gently
 * (an "ease out"), the same feel as Material's decelerate curve.
 */

import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const from = current.current;
    const start = Date.now();
    let frame = 0;

    const step = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const next = from + (target - from) * eased;
      current.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
