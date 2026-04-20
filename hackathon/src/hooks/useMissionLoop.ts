import { useEffect, useRef } from 'react';
import { useMissionStore } from '@/store/mission-store';

export function useMissionLoop(): void {
  const tick = useMissionStore((s) => s.tick);
  const last = useRef(performance.now());

  useEffect(() => {
    let id = 0;
    const loop = (t: number) => {
      const dt = Math.min(0.05, Math.max(0, (t - last.current) / 1000));
      last.current = t;
      tick(dt);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [tick]);
}
