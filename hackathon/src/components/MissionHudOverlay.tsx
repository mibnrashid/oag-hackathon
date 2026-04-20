import { useEffect, useMemo } from 'react';
import { useMissionStore } from '@/store/mission-store';
import ScenarioPanel from '@/components/panels/ScenarioPanel';
import AiPanel from '@/components/panels/AiPanel';
import KpiStrip from '@/components/panels/KpiStrip';
import NarrationBar from '@/components/panels/NarrationBar';
import { BACKGROUND_COUNT, MISSION_EDGES, edgeKey } from '@/sim/graph';
import type { LinkHealth } from '@/sim/types';

function worstLinkState(edgeHealth: ReadonlyMap<string, LinkHealth>): LinkHealth {
  let worst: LinkHealth = 'ok';
  for (const [, h] of edgeHealth) {
    if (h === 'lost') return 'lost';
    if (h === 'degraded') worst = 'degraded';
  }
  return worst;
}

function LinkLegend() {
  const edgeHealth = useMissionStore((s) => s.edgeHealth);
  const displayLink = useMissionStore((s) => s.displayLink);

  const smoothedWorst = useMemo(() => {
    let v = 0;
    for (const [a, b] of MISSION_EDGES) {
      const k = edgeKey(a, b);
      const s = displayLink.get(k) ?? 0;
      if (s > v) v = s;
    }
    if (v >= 1.45) return 'lost' as const;
    if (v >= 0.45) return 'degraded' as const;
    return 'ok' as const;
  }, [displayLink]);

  const discrete = worstLinkState(edgeHealth);
  const effective = discrete === 'lost' || smoothedWorst === 'lost' ? 'lost' : discrete === 'degraded' || smoothedWorst === 'degraded' ? 'degraded' : 'ok';

  const chip = (id: LinkHealth, label: string) => {
    const active = effective === id;
    const base =
      id === 'ok'
        ? 'border-white/15 bg-black/25 text-slate-200/80'
        : id === 'degraded'
          ? 'border-amber-400/25 bg-amber-500/10 text-amber-100/85'
          : 'border-rose-400/25 bg-rose-500/10 text-rose-100/85';
    const glow = active ? 'ring-1 ring-[var(--color-accent)]/50' : 'opacity-45';
    return (
      <span className={`px-2 py-1 rounded border text-[10px] tracking-wide ${base} ${glow}`}>{label}</span>
    );
  };

  return (
    <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-dim)]">
      <span className="opacity-50 hidden sm:inline">COMMS</span>
      {chip('ok', 'LINK OK')}
      {chip('degraded', 'DEGRADED')}
      {chip('lost', 'LOST')}
    </div>
  );
}

/**
 * Starlink-viz HudContainer pattern: full-screen pointer-events-none shell;
 * interactive regions use pointer-events-auto so the WebGL layer never eats clicks.
 */
export default function MissionHudOverlay() {
  const demoMode = useMissionStore((s) => s.demoMode);
  const setDemoMode = useMissionStore((s) => s.setDemoMode);
  const baselineKpi = useMissionStore((s) => s.baselineKpi);
  const aiKpi = useMissionStore((s) => s.aiKpi);
  const aiPanel = useMissionStore((s) => s.aiPanelDisplay);
  const reset = useMissionStore((s) => s.reset);
  const startScriptedTour = useMissionStore((s) => s.startScriptedTour);
  const tourActive = useMissionStore((s) => s.tourActive);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'r') reset();
      if (k === 't') startScriptedTour();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reset, startScriptedTour]);

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      <header className="absolute top-4 left-6 right-6 flex flex-wrap items-start justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto">
          <div className="font-[family-name:var(--font-display)] text-[14px] md:text-[18px] tracking-[0.2em] text-[var(--color-accent)] hud-glow-text mb-1">
            SWARM MISSION CONTROL
          </div>
          <div className="text-[11px] md:text-[12px] text-white/50 mb-3">
            v2 · resilient coordination · {BACKGROUND_COUNT} background + 6 mission nodes
          </div>
          <div className="inline-flex overflow-hidden rounded border border-white/10 bg-black/40 backdrop-blur pointer-events-auto">
            <button
              onClick={() => setDemoMode('baseline')}
              className={`px-4 py-1.5 text-xs font-semibold tracking-wider transition-all ${
                demoMode === 'baseline'
                  ? 'bg-rose-500/20 text-rose-200 border-b-2 border-rose-500'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/80 border-b-2 border-transparent'
              }`}
            >
              BASELINE OFF
            </button>
            <div className="w-px bg-white/10 my-1" />
            <button
              onClick={() => setDemoMode('ai')}
              className={`px-4 py-1.5 text-xs font-semibold tracking-wider transition-all ${
                demoMode === 'ai'
                  ? 'bg-[var(--color-accent)]/20 text-[#60e0ff] border-b-2 border-[var(--color-accent)]'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/80 border-b-2 border-transparent'
              }`}
            >
              AI ESTIMATOR ON
            </button>
          </div>
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <LinkLegend />
        </div>
      </header>

      {/* Narration bar only shows during a scripted tour */}
      {tourActive ? (
        <div className="absolute top-[3.25rem] md:top-14 left-1/2 -translate-x-1/2 w-[min(720px,calc(100vw-2rem))] pointer-events-auto">
          <NarrationBar />
        </div>
      ) : null}

      {/* Mobile stack */}
      <div
        className={`lg:hidden absolute ${tourActive ? 'top-[10rem]' : 'top-14'} left-3 right-3 flex flex-col gap-2 max-h-[calc(55vh-80px)] overflow-y-auto pointer-events-auto`}
      >
        <ScenarioPanel />
        <AiPanel panel={aiPanel} />
        <div className="h-[300px] shrink-0">
          <KpiStrip baseline={baselineKpi} ai={aiKpi} />
        </div>
      </div>

      {/* Desktop columns */}
      <div
        className={`hidden lg:block absolute ${tourActive ? 'top-[9.5rem]' : 'top-[5.5rem]'} bottom-6 left-6 w-[340px] pointer-events-auto`}
      >
        <ScenarioPanel />
      </div>
      <div
        className={`hidden lg:flex absolute ${tourActive ? 'top-[9.5rem]' : 'top-[5.5rem]'} bottom-6 right-6 w-[380px] pointer-events-auto flex-col gap-4`}
      >
        <div className="flex-[4] min-h-0">
          <AiPanel panel={aiPanel} />
        </div>
        <div className="flex-[3] min-h-0">
          <KpiStrip baseline={baselineKpi} ai={aiKpi} />
        </div>
      </div>
    </div>
  );
}
