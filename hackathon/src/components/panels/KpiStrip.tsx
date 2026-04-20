import { useMemo } from 'react';
import type { KpiSnapshot } from '@/sim/types';
import { useMissionStore } from '@/store/mission-store';

function Metric({
  label,
  unit,
  base,
  ai,
  higherIsBetter = true,
}: {
  label: string;
  unit?: string;
  base: number;
  ai: number;
  higherIsBetter?: boolean;
}) {
  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(0) : '—');
  const delta = ai - base;
  const aiBetter = higherIsBetter ? delta > 0.5 : delta < -0.5;
  const aiWorse = higherIsBetter ? delta < -0.5 : delta > 0.5;
  return (
    <div className="grid grid-cols-[1fr_56px_56px] gap-2 items-center border-b border-white/5 py-1.5 last:border-b-0">
      <div className="text-[11px] tracking-wide text-[color:var(--color-mission-muted)] truncate">
        {label}
        {unit ? <span className="text-white/30 ml-1">{unit}</span> : null}
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[13px] text-rose-200/90 text-right tabular-nums">
        {fmt(base)}
      </div>
      <div
        className={`font-[family-name:var(--font-mono)] text-[13px] text-right tabular-nums ${
          aiBetter ? 'text-emerald-200/95' : aiWorse ? 'text-rose-200/95' : 'text-cyan-200/95'
        }`}
      >
        {fmt(ai)}
      </div>
    </div>
  );
}

function ContinuitySpark() {
  const history = useMissionStore((s) => s.continuityHistory);
  const viewportW = 200;
  const viewportH = 42;

  const { basePath, aiPath, t0, t1 } = useMemo(() => {
    if (history.length < 2) return { basePath: '', aiPath: '', t0: 0, t1: 1 };
    const t0 = history[0]!.t;
    const t1 = history[history.length - 1]!.t;
    const span = Math.max(0.001, t1 - t0);
    const xOf = (t: number) => ((t - t0) / span) * viewportW;
    const yOf = (v: number) => viewportH - (Math.max(0, Math.min(100, v)) / 100) * viewportH;
    const basePts = history.map((h) => `${xOf(h.t).toFixed(1)},${yOf(h.baseline).toFixed(1)}`);
    const aiPts = history.map((h) => `${xOf(h.t).toFixed(1)},${yOf(h.ai).toFixed(1)}`);
    return {
      basePath: `M ${basePts.join(' L ')}`,
      aiPath: `M ${aiPts.join(' L ')}`,
      t0,
      t1,
    };
  }, [history]);

  if (!basePath) {
    return (
      <div className="flex-1 min-w-0 h-[42px] rounded bg-white/5 border border-white/5" />
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <svg
        viewBox={`0 0 ${viewportW} ${viewportH}`}
        preserveAspectRatio="none"
        className="w-full h-[42px]"
        aria-label="Mission continuity — baseline vs AI"
      >
        <line x1={0} y1={viewportH * 0.15} x2={viewportW} y2={viewportH * 0.15} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 3" />
        <line x1={0} y1={viewportH * 0.5} x2={viewportW} y2={viewportH * 0.5} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 3" />
        <path d={basePath} fill="none" stroke="#ff94a8" strokeOpacity="0.85" strokeWidth="1.25" />
        <path d={aiPath} fill="none" stroke="#7dd9ff" strokeOpacity="0.95" strokeWidth="1.5" />
      </svg>
      <div className="flex justify-between text-[9px] text-white/35 font-[family-name:var(--font-mono)] mt-0.5">
        <span>t={t0.toFixed(0)}s</span>
        <span>continuity 0–100</span>
        <span>t={t1.toFixed(0)}s</span>
      </div>
    </div>
  );
}

export default function KpiStrip({ baseline, ai }: { baseline: KpiSnapshot; ai: KpiSnapshot }) {
  const contDelta = ai.missionContinuity - baseline.missionContinuity;
  const degradedSaved = baseline.degradedCommsSec - ai.degradedCommsSec;
  const advantagePositive = contDelta > 0.5;
  const advantageNegative = contDelta < -0.5;

  return (
    <div className="hud-panel px-3 py-2.5 h-full min-h-0 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="min-w-0">
          <div className="font-[family-name:var(--font-display)] text-[10.5px] tracking-[0.22em] text-cyan-200/80 truncate">
            BASELINE vs AI · LIVE
          </div>
          <div className="text-[9.5px] text-white/45 mt-0.5 truncate">Same physics · different autonomy layer</div>
        </div>
        <div
          className={`shrink-0 rounded px-2 py-1 border text-[10px] tracking-wide font-[family-name:var(--font-mono)] ${
            advantagePositive
              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
              : advantageNegative
                ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
                : 'border-white/15 bg-white/5 text-white/70'
          }`}
        >
          AI {contDelta >= 0 ? '+' : ''}
          {contDelta.toFixed(0)} pts
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1 text-[9px] text-white/55">
          <span className="inline-block w-2 h-[2px] bg-rose-300/80" /> baseline
        </div>
        <div className="flex items-center gap-1 text-[9px] text-white/55">
          <span className="inline-block w-2 h-[2px] bg-cyan-300/90" /> AI
        </div>
        <ContinuitySpark />
      </div>

      <div className="flex-1 overflow-auto pr-1">
        <Metric label="Mission continuity" unit="%" base={baseline.missionContinuity} ai={ai.missionContinuity} />
        <Metric label="Tasks satisfied" unit="/3" base={baseline.tasksSatisfied} ai={ai.tasksSatisfied} />
        <Metric
          label="Swarm uncertainty"
          base={baseline.swarmUncertainty}
          ai={ai.swarmUncertainty}
          higherIsBetter={false}
        />
        <Metric
          label="Degraded comms"
          unit="s"
          base={baseline.degradedCommsSec}
          ai={ai.degradedCommsSec}
          higherIsBetter={false}
        />
      </div>

      {degradedSaved > 1.5 ? (
        <div className="mt-1.5 text-[10px] text-emerald-200/80 font-[family-name:var(--font-mono)]">
          AI saved {degradedSaved.toFixed(0)}s of degraded coordination.
        </div>
      ) : null}
    </div>
  );
}
