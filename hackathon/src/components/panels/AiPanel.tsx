import { useMemo } from 'react';
import type { AiPanelSnapshot } from '@/sim/types';
import { useMissionStore } from '@/store/mission-store';
import { getCueForRel } from '@/sim/scenario';

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
  
  const tourActive = useMissionStore((s) => s.tourActive);
  const tourStart = useMissionStore((s) => s.tourStartSimTime);
  const simTime = useMissionStore((s) => s.world.simTime);
  const rel = tourActive && tourStart >= 0 ? Math.max(0, simTime - tourStart) : -1;
  const current = useMemo(() => getCueForRel(rel), [rel]);

  return (
    <div className="hud-panel p-3.5 flex flex-col gap-2.5 h-full overflow-hidden">
      <div>
        <div className="font-[family-name:var(--font-display)] text-[11px] tracking-[0.24em] text-cyan-200/90 mb-1">
          {tourActive && current ? current.cue.title.toUpperCase() : 'AUTONOMOUS DECISION SUPPORT'}
        </div>
        <div className="text-[10px] text-white/50 leading-snug">
          {tourActive && current ? current.cue.caption : 'Transparent heuristics: fusion, risk gating, and reassignment suggestions (not a black-box model).'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 pb-1 custom-scrollbar">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
            <div className="text-[9px] tracking-widest text-white/40 mb-1">COORDINATOR</div>
            <div className="font-[family-name:var(--font-display)] text-base text-white/95">Sat-{panel.coordinatorId + 1}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 flex flex-col justify-center items-start">
            <div className="text-[9px] tracking-widest text-white/40 mb-1.5">SYS RISK</div>
            <RiskPill risk={panel.risk} />
          </div>
        </div>

        <div className="rounded border border-cyan-400/20 bg-gradient-to-br from-cyan-900/30 to-black/40 p-2.5 relative overflow-hidden backdrop-blur-sm">
          <div className="text-[9px] tracking-widest text-cyan-300/90 font-bold mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]"></span>
            AUTONOMOUS DEAD-RECKONING ENGINE
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[9px] leading-snug text-cyan-100/70">
            <span className="text-cyan-400/50 font-bold">IN:</span>
            <span>Last state, neighbor locs, comm gaps</span>
            <span className="text-cyan-400/50 font-bold">OP:</span>
            <span>Kinematic Fusion + Confidence Decay</span>
            <span className="text-cyan-400/50 font-bold">OUT:</span>
            <span className="text-cyan-100 font-medium">Pos Vector, Risk, Role Reschedule</span>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[9px] tracking-widest text-white/50">COMMS CONFIDENCE</div>
            <div className="font-[family-name:var(--font-mono)] text-xs text-emerald-300 font-bold">{confPct}%</div>
          </div>
          <div className="h-[4px] rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500/40 to-emerald-400 transition-all duration-300" style={{ width: `${confPct}%` }} />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 space-y-1.5">
          <div className="flex justify-between items-center mb-1">
            <div className="text-[9px] tracking-widest text-white/50">ESTIMATOR STATE</div>
            <span className={`text-[9px] tracking-wider px-1 py-0.5 rounded ${panel.estimatorActive ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30' : 'text-white/30 border border-white/10'}`}>
              {panel.estimatorActive ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>
          <div className="font-[family-name:var(--font-mono)] text-[11px] text-slate-100 leading-snug">
            {panel.predictedNeighborSummary}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
          <div className="text-[9px] tracking-widest text-white/50 mb-1.5">RECOMMENDATION & CONTEXT</div>
          <div className="text-[11px] text-slate-100/90 leading-snug mb-1 font-medium">{panel.recommendation}</div>
          <div className="text-[10px] text-white/40 italic leading-tight border-l-2 border-white/10 pl-2 py-0.5">{panel.riskReason}</div>
        </div>
      </div>
    </div>
  );
}
