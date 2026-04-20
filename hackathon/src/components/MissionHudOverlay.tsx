import { useEffect, useMemo } from 'react';
import { useMissionStore } from '@/store/mission-store';
import ScenarioPanel from '@/components/panels/ScenarioPanel';
import AiPanel from '@/components/panels/AiPanel';
import KpiStrip from '@/components/panels/KpiStrip';
import EventLogPanel from '@/components/panels/EventLogPanel';
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
  const baselineKpi = useMissionStore((s) => s.baselineKpi);
  const aiKpi = useMissionStore((s) => s.aiKpi);
  const aiPanel = useMissionStore((s) => s.aiPanel);
  const logs = useMissionStore((s) => s.logs);
  const reset = useMissionStore((s) => s.reset);
  const startScriptedTour = useMissionStore((s) => s.startScriptedTour);

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
    <div className="fixed inset-0 pointer-events-none z-10 p-2 md:p-4">
      <header className="absolute top-2 md:top-4 left-2 right-2 md:left-4 md:right-4 flex flex-wrap items-start justify-between gap-2 pointer-events-auto">
        <div>
          <div className="font-[family-name:var(--font-display)] text-[12px] md:text-[14px] tracking-[0.16em] text-[var(--color-accent)] hud-glow-text">
            SWARM MISSION CONTROL
          </div>
          <div className="text-[10px] md:text-[11px] text-[var(--color-text-dim)] mt-0.5 max-w-[70vw] md:max-w-none">
            v2 · resilient coordination · {BACKGROUND_COUNT} background + 6 mission nodes
          </div>
        </div>
        <LinkLegend />
      </header>

      {/* Mobile: stack scenario + AI so panels never overlap */}
      <div className="lg:hidden absolute top-12 left-2 right-2 flex flex-col gap-2 max-h-[min(48vh,calc(100vh-220px))] overflow-y-auto pointer-events-auto z-[11]">
        <ScenarioPanel />
        <AiPanel panel={aiPanel} />
      </div>

      {/* Desktop: starlink-style left / right columns */}
      <div className="hidden lg:block absolute top-[4.25rem] left-4 w-[min(380px,calc(50vw-48px))] max-h-[min(58vh,calc(100vh-200px))] min-h-0 pointer-events-auto z-[11]">
        <ScenarioPanel />
      </div>
      <div className="hidden lg:block absolute top-[4.25rem] right-4 w-[min(380px,calc(50vw-48px))] max-h-[min(58vh,calc(100vh-200px))] min-h-0 pointer-events-auto z-[11]">
        <AiPanel panel={aiPanel} />
      </div>

      <div
        className="absolute bottom-2 md:bottom-4 left-2 right-2 md:left-4 md:right-4 flex flex-col md:flex-row gap-2 md:gap-3 pointer-events-auto max-h-[min(42vh,calc(100vh-120px))] md:max-h-[200px]"
        style={{ zIndex: 11 }}
      >
        <div className="flex-1 min-h-0 min-w-0 md:max-w-[55%]">
          <EventLogPanel logs={logs} />
        </div>
        <div className="flex-shrink-0 w-full md:w-[min(420px,42%)] min-h-0">
          <KpiStrip baseline={baselineKpi} ai={aiKpi} />
        </div>
      </div>
    </div>
  );
}
