import type { KpiSnapshot } from '@/sim/types';

function Metric({ label, unit, base, ai }: { label: string; unit?: string; base: number; ai: number }) {
  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(0) : '—');
  const delta = ai - base;
  const better = delta > 0.5;
  const worse = delta < -0.5;
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
          better ? 'text-emerald-200/95' : worse ? 'text-rose-200/95' : 'text-cyan-200/95'
        }`}
      >
        {fmt(ai)}
      </div>
    </div>
  );
}

export default function KpiStrip({ baseline, ai }: { baseline: KpiSnapshot; ai: KpiSnapshot }) {
  return (
    <div className="hud-panel px-3 py-2.5 h-full min-h-0 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="min-w-0">
          <div className="font-[family-name:var(--font-display)] text-[10.5px] tracking-[0.22em] text-cyan-200/80 truncate">
            SWARM KPI · BASELINE vs AI
          </div>
          <div className="text-[9.5px] text-white/45 mt-0.5 truncate">Same physics · different autonomy layer</div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-[9.5px] tracking-widest text-white/50 shrink-0">
          <div className="text-rose-200/80 text-right w-14">BASELINE</div>
          <div className="text-cyan-200/85 text-right w-14">AI</div>
        </div>
      </div>
      <div className="flex-1 overflow-auto pr-1">
        <Metric label="Mission continuity" unit="%" base={baseline.missionContinuity} ai={ai.missionContinuity} />
        <Metric label="Tasks satisfied" unit="/3" base={baseline.tasksSatisfied} ai={ai.tasksSatisfied} />
        <Metric label="Swarm uncertainty" base={baseline.swarmUncertainty} ai={ai.swarmUncertainty} />
        <Metric label="Degraded comms" unit="s" base={baseline.degradedCommsSec} ai={ai.degradedCommsSec} />
      </div>
    </div>
  );
}
