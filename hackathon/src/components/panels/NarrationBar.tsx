import { useMemo } from 'react';
import { useMissionStore } from '@/store/mission-store';
import { TOUR_DURATION_SEC, TOUR_NARRATION, getCueForRel, type NarrationTone } from '@/sim/scenario';

const TONE_STYLES: Record<NarrationTone, { chip: string; bar: string; dot: string }> = {
  nominal: {
    chip: 'bg-emerald-500/12 border-emerald-400/25 text-emerald-100',
    bar: 'from-emerald-500/25 to-emerald-300/90',
    dot: 'bg-emerald-300',
  },
  warning: {
    chip: 'bg-amber-500/12 border-amber-400/25 text-amber-100',
    bar: 'from-amber-500/25 to-amber-300/90',
    dot: 'bg-amber-300',
  },
  ai: {
    chip: 'bg-cyan-500/12 border-cyan-400/25 text-cyan-100',
    bar: 'from-cyan-500/25 to-cyan-200',
    dot: 'bg-cyan-200',
  },
  recovery: {
    chip: 'bg-sky-500/12 border-sky-400/25 text-sky-100',
    bar: 'from-sky-500/25 to-sky-200',
    dot: 'bg-sky-200',
  },
};

export default function NarrationBar() {
  const tourActive = useMissionStore((s) => s.tourActive);
  const tourStart = useMissionStore((s) => s.tourStartSimTime);
  const simTime = useMissionStore((s) => s.world.simTime);

  const rel = tourActive && tourStart >= 0 ? Math.max(0, simTime - tourStart) : -1;
  const current = useMemo(() => getCueForRel(rel), [rel]);

  if (!tourActive || !current) return null;

  const pct = Math.max(0, Math.min(100, (rel / TOUR_DURATION_SEC) * 100));
  const tone = TONE_STYLES[current.cue.tone];

  return (
    <div className="hud-panel px-3 py-2.5 w-full">
      <div className="flex items-start gap-3">
        <div
          className={`px-2 py-1 rounded border text-[10px] tracking-widest font-[family-name:var(--font-display)] shrink-0 ${tone.chip}`}
        >
          {current.cue.tone.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-[family-name:var(--font-display)] tracking-[0.12em] text-cyan-100/95 truncate">
            {current.cue.title}
          </div>
          <div className="text-[11px] text-slate-200/85 mt-0.5 leading-snug">{current.cue.caption}</div>
        </div>
        <div className="shrink-0 text-right font-[family-name:var(--font-mono)] text-[10.5px] text-white/55 tabular-nums">
          T+{rel.toFixed(1)}s / {TOUR_DURATION_SEC}s
        </div>
      </div>

      <div className="relative mt-2 h-[6px] rounded bg-white/8 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${tone.bar}`}
          style={{ width: `${pct}%`, transition: 'width 120ms linear' }}
        />
        {TOUR_NARRATION.map((cue, i) => {
          const p = (cue.tRel / TOUR_DURATION_SEC) * 100;
          const past = cue.tRel <= rel;
          return (
            <div
              key={i}
              className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                past ? TONE_STYLES[cue.tone].dot : 'bg-white/25'
              }`}
              style={{ left: `calc(${p}% - 3px)` }}
              title={cue.title}
            />
          );
        })}
      </div>
    </div>
  );
}
