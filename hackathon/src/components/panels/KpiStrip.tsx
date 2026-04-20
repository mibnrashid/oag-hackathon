import type { KpiSnapshot } from '@/sim/types';

function Metric({ label, base, ai }: { label: string; base: number; ai: number }) {
  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(0) : '—');
  return (
    <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 items-center border-b border-white/5 py-2 last:border-b-0">
      <div className="text-[11px] tracking-wide text-[color:var(--color-mission-muted)]">{label}</div>
      <div className="font-[family-name:var(--font-mono)] text-sm text-rose-200/90">{fmt(base)}</div>
      <div className="font-[family-name:var(--font-mono)] text-sm text-cyan-200/95">{fmt(ai)}</div>
    </div>
  );
}

export default function KpiStrip({ baseline, ai }: { baseline: KpiSnapshot; ai: KpiSnapshot }) {
  return (
    <div className="hud-panel px-4 py-3">
      <div className="flex items-end justify-between gap-3 mb-2">
        <div>
          <div className="font-[family-name:var(--font-display)] text-[11px] tracking-[0.22em] text-cyan-200/80">
            SWARM KPI / SPLIT
          </div>
          <div className="text-[10px] text-white/45 mt-1">Shared scenario · different autonomy layers</div>
        </div>
        <div className="grid grid-cols-2 gap-6 text-[10px] tracking-widest text-white/45 pr-1">
          <div className="text-rose-200/80 text-right">BASELINE</div>
          <div className="text-cyan-200/85">AI‑ASSISTED</div>
        </div>
      </div>
      <Metric label="Mission continuity" base={baseline.missionContinuity} ai={ai.missionContinuity} />
      <Metric label="Tasks satisfied (0–3)" base={baseline.tasksSatisfied} ai={ai.tasksSatisfied} />
      <Metric label="Swarm uncertainty" base={baseline.swarmUncertainty} ai={ai.swarmUncertainty} />
      <Metric label="Degraded comms time (s)" base={baseline.degradedCommsSec} ai={ai.degradedCommsSec} />
    </div>
  );
}
