import type { ScenarioEvent } from './types';

export function sortEvents(events: ScenarioEvent[]): ScenarioEvent[] {
  return [...events].sort((x, y) => x.t - y.t);
}

/** Scripted 75s tour: stable → degrade → loss → recovery. */
export function buildScriptedTour(startSimTime: number): ScenarioEvent[] {
  const t0 = startSimTime;
  return [
    { t: t0 + 4, kind: 'setEdge', a: 0, b: 1, health: 'degraded' },
    { t: t0 + 14, kind: 'setEdge', a: 0, b: 1, health: 'lost' },
    { t: t0 + 16, kind: 'disturbance', intensity: 0.45, durationSec: 12 },
    { t: t0 + 22, kind: 'delayStorm', factor: 2.2, durationSec: 10 },
    { t: t0 + 34, kind: 'roleFailure', node: 0, durationSec: 8 },
    { t: t0 + 48, kind: 'setEdge', a: 0, b: 1, health: 'ok' },
    { t: t0 + 52, kind: 'setEdge', a: 0, b: 2, health: 'ok' },
    { t: t0 + 58, kind: 'delayStorm', factor: 1, durationSec: 0.05 },
  ];
}
