import type { ReactNode } from 'react';
import { useMissionStore } from '@/store/mission-store';

export default function ScenarioPanel() {
  const injectLinkLoss = useMissionStore((s) => s.injectLinkLoss);
  const injectDegraded = useMissionStore((s) => s.injectDegraded);
  const injectDelay = useMissionStore((s) => s.injectDelay);
  const injectDisturbance = useMissionStore((s) => s.injectDisturbance);
  const injectRoleFailure = useMissionStore((s) => s.injectRoleFailure);
  const restoreAllLinks = useMissionStore((s) => s.restoreAllLinks);
  const reset = useMissionStore((s) => s.reset);
  const startScriptedTour = useMissionStore((s) => s.startScriptedTour);
  const world = useMissionStore((s) => s.world);
  const tourActive = useMissionStore((s) => s.tourActive);

  const Btn = ({
    children,
    onClick,
    tone = 'default',
  }: {
    children: ReactNode;
    onClick: () => void;
    tone?: 'default' | 'danger' | 'good';
  }) => {
    const cls =
      tone === 'danger'
        ? 'border-rose-400/25 hover:border-rose-300/45 text-rose-100/90'
        : tone === 'good'
          ? 'border-emerald-400/20 hover:border-emerald-300/45 text-emerald-100/90'
          : 'border-cyan-400/15 hover:border-cyan-300/40 text-slate-100/90';
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-3 py-2 rounded-lg text-[12px] tracking-wide bg-black/25 ${cls} border transition-colors`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="hud-panel p-3.5 flex flex-col gap-3 h-full overflow-hidden">
      <div>
        <div className="font-[family-name:var(--font-display)] text-[11px] tracking-[0.24em] text-cyan-200/90 mb-1">
          SCENARIO CONTROL
        </div>
        <div className="text-[10px] text-white/50 leading-snug">
          Deterministic injects · baseline & AI see the same physics & comms truth.
        </div>
      </div>

      <div className="text-[10px] text-white/50 font-[family-name:var(--font-mono)] border-l-2 border-cyan-400/30 pl-2">
        <span className="text-white/80 font-bold tracking-wider">t = {world.simTime.toFixed(2)}s</span> sim
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        <Btn onClick={() => injectLinkLoss(0, 1)} tone="danger">
          Comms loss · Sat-1 ↔ Sat-2
        </Btn>
        <Btn onClick={() => injectDegraded(0, 2)}>Degraded link · Sat-1 ↔ Sat-3</Btn>
        <Btn onClick={injectDelay}>Delayed updates storm</Btn>
        <Btn onClick={injectDisturbance}>External disturbance</Btn>
        <Btn onClick={injectRoleFailure} tone="danger">
          Coordinator role failure (Sat-1)
        </Btn>
        <Btn onClick={restoreAllLinks} tone="good">
          Restore all links (nominal)
        </Btn>
        <div className="h-px bg-white/10 my-1" />
        <Btn onClick={startScriptedTour}>
          {tourActive ? 'Restart scripted tour' : 'Play scripted tour (~75s)'}
        </Btn>
        <Btn onClick={reset} tone="good">
          Reset demo
        </Btn>
      </div>

      <div className="text-[10px] text-white/35 leading-relaxed">
        Keys: <span className="text-white/55">R</span> reset · <span className="text-white/55">T</span> tour
      </div>
    </div>
  );
}
