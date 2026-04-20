import { useMemo } from 'react';
import type { KpiSnapshot } from '@/sim/types';
import { useMissionStore } from '@/store/mission-store';
import { getCueForRel } from '@/sim/scenario';

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
  const deltaPct = base === 0 ? 0 : ((delta / base) * 100);
  const deltaStr = Math.abs(deltaPct) > 0.5 ? `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(0)}%` : '—';
  
  return (
    <>
      <div className="text-[12px] tracking-wide text-[color:var(--color-mission-muted)] truncate py-1.5 border-b border-white/5">
        {label}
        {unit ? <span className="text-white/30 ml-2">{unit}</span> : null}
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[14px] text-rose-200/90 text-right tabular-nums py-1.5 border-b border-white/5">
        {fmt(base)}
      </div>
      <div
        className={`font-[family-name:var(--font-mono)] text-[14px] text-right tabular-nums py-1.5 border-b border-white/5 ${
          aiBetter ? 'text-emerald-300 font-bold' : aiWorse ? 'text-rose-300' : 'text-cyan-200/95'
        }`}
      >
        {fmt(ai)}
      </div>
      <div
        className={`font-[family-name:var(--font-mono)] text-[12px] text-right tabular-nums py-1.5 border-b border-white/5 ${
          aiBetter ? 'text-emerald-400 font-bold font-[family-name:var(--font-display)]' : aiWorse ? 'text-rose-400' : 'text-white/30'
        }`}
      >
        {deltaStr}
      </div>
    </>
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
        aria-label="Mission continuity — baseline vs AUTONOMY"
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

  const tourActive = useMissionStore((s) => s.tourActive);
  const tourStart = useMissionStore((s) => s.tourStartSimTime);
  const simTime = useMissionStore((s) => s.world.simTime);
  const rel = tourActive && tourStart >= 0 ? Math.max(0, simTime - tourStart) : -1;
  const current = useMemo(() => getCueForRel(rel), [rel]);

  return (
    <div className="hud-panel p-3.5 h-full flex flex-col overflow-y-auto custom-scrollbar">
      <div className="flex items-start justify-between gap-3 mb-2 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="font-[family-name:var(--font-display)] text-[11px] tracking-[0.24em] text-cyan-200/90 mb-1">
            {tourActive && current ? 'PHASE IMPACT \u00B7 SECONDS SAVED' : 'BASELINE vs AUTONOMY \u00B7 LIVE'}
          </div>
          <div className="text-[10px] text-white/50 break-words whitespace-normal leading-tight">
            {tourActive && current ? 'Measuring the autonomy layer\'s advantage in real-time' : 'Same physics \u00B7 different autonomy layer'}
          </div>
        </div>
        <div
          className={`shrink-0 rounded px-2.5 py-1.5 border text-[10px] font-bold tracking-wide font-[family-name:var(--font-mono)] ${
            advantagePositive
              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
              : advantageNegative
                ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
                : 'border-white/15 bg-white/5 text-white/70'
          }`}
        >
          AUTONOMY {contDelta >= 0 ? '+' : ''}
          {contDelta.toFixed(0)} pts
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2.5 shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] text-white/60 font-bold tracking-wider">
          <span className="inline-block w-3 h-[2px] bg-rose-400" /> BASELINE
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/60 font-bold tracking-wider">
          <span className="inline-block w-3 h-[2px] bg-cyan-400" /> AUTONOMY
        </div>
      </div>
      <div className="flex-1 w-full mb-4 min-h-[42px] shrink-0 lg:shrink">
        <ContinuitySpark />
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 mb-3 shrink-0">
        <div className="text-[10px] font-bold tracking-widest text-[color:var(--color-mission-muted)] border-b border-white/10 pb-1.5 mb-1 text-left">METRIC</div>
        <div className="text-[10px] font-bold tracking-widest text-[#ff94a8] text-right border-b border-white/10 pb-1.5 mb-1">BASE</div>
        <div className="text-[10px] font-bold tracking-widest text-[#7dd9ff] text-right border-b border-white/10 pb-1.5 mb-1">AI</div>
        <div className="text-[10px] font-bold tracking-widest text-emerald-300 text-right border-b border-white/10 pb-1.5 mb-1">IMPACT</div>
        
        <Metric label="Mission continuity" unit="%" base={baseline.missionContinuity} ai={ai.missionContinuity} />
        <Metric label="Tasks satisfied" unit="/3" base={baseline.tasksSatisfied} ai={ai.tasksSatisfied} />
        <Metric
          label="Formation error"
          base={baseline.swarmUncertainty}
          ai={ai.swarmUncertainty}
          higherIsBetter={false}
        />
      </div>

      <div className="mt-1 text-[10px] text-white/50 leading-relaxed bg-black/20 p-2.5 rounded border border-white/5 shrink-0">
        <strong className="text-emerald-300 tracking-wider font-bold mb-1 block">MEASURABLE PROOF</strong>
        <span className="text-emerald-300 font-bold">{(baseline.swarmUncertainty - ai.swarmUncertainty > 0) ? `+${((baseline.swarmUncertainty - ai.swarmUncertainty) / Math.max(1, baseline.swarmUncertainty) * 100).toFixed(0)}%` : '0%'}</span> formation error reduction.<br />
        <span className="text-emerald-300 font-bold">{(ai.tasksSatisfied - baseline.tasksSatisfied > 0) ? `+${((ai.tasksSatisfied - baseline.tasksSatisfied) / Math.max(1, baseline.tasksSatisfied) * 100).toFixed(0)}%` : '0%'}</span> task success increase.<br />
        <div className="text-white/40 mt-1 text-[9px] border-t border-white/5 pt-1">Impact is calculated live against the deterministic baseline physics simulation.</div>
        {degradedSaved > 1.5 && (
          <div className="mt-1 text-emerald-300 font-[family-name:var(--font-mono)]">
            AI saved {degradedSaved.toFixed(0)}s of degraded coordination.
          </div>
        )}
      </div>
    </div>
  );
}
