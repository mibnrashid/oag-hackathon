import type { AiPanelSnapshot } from '@/sim/types';

function RiskPill({ risk }: { risk: AiPanelSnapshot['risk'] }) {
  const cls =
    risk === 'high'
      ? 'bg-rose-500/15 text-rose-100 border-rose-400/25'
      : risk === 'medium'
        ? 'bg-amber-500/12 text-amber-100 border-amber-400/20'
        : 'bg-emerald-500/10 text-emerald-100 border-emerald-400/18';
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md border text-[11px] tracking-wide ${cls}`}>
      {risk.toUpperCase()}
    </span>
  );
}

export default function AiPanel({ panel }: { panel: AiPanelSnapshot }) {
  const confPct = Math.round(Math.max(0, Math.min(1, panel.minConfidence)) * 100);
  return (
    <div className="hud-panel p-3 flex flex-col gap-3 h-full min-h-0 max-h-full overflow-hidden">
      <div>
        <div className="font-[family-name:var(--font-display)] text-[11px] tracking-[0.22em] text-cyan-200/80">
          AI DECISION SUPPORT
        </div>
        <div className="text-[10px] text-white/45 mt-1 leading-relaxed">
          Transparent heuristics: fusion, risk gating, and reassignment suggestions (not a black-box model).
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-3 pr-1">
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="text-[10px] tracking-widest text-white/40">ACTIVE COORDINATOR</div>
          <div className="font-[family-name:var(--font-display)] text-lg mt-1">Sat-{panel.coordinatorId + 1}</div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] tracking-widest text-white/40">COMMS CONFIDENCE (MIN)</div>
            <div className="font-[family-name:var(--font-mono)] text-sm text-cyan-100">{confPct}%</div>
          </div>
          <div className="h-1.5 rounded bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500/20 to-cyan-300" style={{ width: `${confPct}%` }} />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
          <div className="text-[10px] tracking-widest text-white/40">PREDICTED NEIGHBOR STATE</div>
          <div className="font-[family-name:var(--font-mono)] text-[12px] text-slate-100/90 leading-relaxed">
            {panel.predictedNeighborSummary}
          </div>
          <div className="text-[10px] text-white/40">
            Estimator:{' '}
            <span className={panel.estimatorActive ? 'text-cyan-200/90' : 'text-white/35'}>
              {panel.estimatorActive ? 'ACTIVE' : 'idle'}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] tracking-widest text-white/40">COORDINATION RISK</div>
            <RiskPill risk={panel.risk} />
          </div>
          <div className="text-[11px] text-slate-200/80 leading-relaxed">{panel.riskReason}</div>
        </div>

        <div className="rounded-lg border border-cyan-400/15 bg-cyan-500/5 p-3">
          <div className="text-[10px] tracking-widest text-cyan-200/55">RECOMMENDATION</div>
          <div className="text-[12px] text-slate-100/90 leading-relaxed mt-1">{panel.recommendation}</div>
        </div>
      </div>
    </div>
  );
}
