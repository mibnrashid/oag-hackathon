import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/sim/types';

export default function EventLogPanel({ logs }: { logs: LogEntry[] }) {
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="hud-panel flex flex-col h-full min-h-0 max-h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="font-[family-name:var(--font-display)] text-[11px] tracking-[0.22em] text-cyan-200/80">
          EVENT LOG
        </div>
        <div className="text-[10px] text-white/40">Live</div>
      </div>
      <div className="flex-1 overflow-auto px-3 py-2 space-y-1.5 font-[family-name:var(--font-mono)] text-[11px] leading-snug">
        {logs.map((e) => (
          <div key={e.id} className="flex gap-2">
            <span className="text-white/35 shrink-0 w-14">{e.t.toFixed(1)}s</span>
            <span
              className={
                e.type === 'error'
                  ? 'text-rose-200/95'
                  : e.type === 'warning'
                    ? 'text-amber-200/90'
                    : e.type === 'success'
                      ? 'text-emerald-200/90'
                      : 'text-slate-200/90'
              }
            >
              {e.message}
            </span>
          </div>
        ))}
        <div ref={bottom} />
      </div>
    </div>
  );
}
