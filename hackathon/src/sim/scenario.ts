import type { ScenarioEvent } from './types';

export type NarrationTone = 'nominal' | 'warning' | 'ai' | 'recovery';

export interface NarrationCue {
  /** Seconds after tour start. */
  tRel: number;
  title: string;
  caption: string;
  tone: NarrationTone;
}

export function sortEvents(events: ScenarioEvent[]): ScenarioEvent[] {
  return [...events].sort((x, y) => x.t - y.t);
}

/**
 * Scripted 75 s tour. Each cue is aligned with the `buildScriptedTour`
 * events so captions explain exactly what the operator just saw.
 */
export const TOUR_NARRATION: readonly NarrationCue[] = [
  {
    tRel: 0,
    title: 'Phase 1 · Nominal operation',
    caption:
      'Six satellites cooperate on an inclined orbit. All inter-sat links healthy. Sat-1 is coordinator; tasks are shared across neighbours.',
    tone: 'nominal',
  },
  {
    tRel: 4,
    title: 'Phase 2 · Link degradation',
    caption:
      'Comms between Sat-1 ↔ Sat-2 start dropping packets. Baseline trusts stale telemetry; AI drops its confidence estimate.',
    tone: 'warning',
  },
  {
    tRel: 14,
    title: 'Phase 3 · Link lost · AI estimator engages',
    caption:
      'Sat-1 ↔ Sat-2 is fully down. AI switches on dead-reckoning fusion to predict Sat-2 state from neighbours.',
    tone: 'ai',
  },
  {
    tRel: 16,
    title: 'Phase 4 · External disturbance',
    caption:
      'Formation is perturbed. Baseline cannot correct against a neighbour it cannot observe; AI uses its prediction to keep tasks satisfied.',
    tone: 'warning',
  },
  {
    tRel: 22,
    title: 'Phase 5 · Telemetry delay storm',
    caption:
      'Packet cadence slows 2.2×. Baseline uncertainty spikes; AI widens its estimator window instead of chasing stale data.',
    tone: 'warning',
  },
  {
    tRel: 34,
    title: 'Phase 6 · Coordinator role failure',
    caption:
      'Sat-1 is degraded as coordinator. AI re-elects a healthier neighbour (highest link score) and redistributes tasks. Baseline keeps asking Sat-1.',
    tone: 'ai',
  },
  {
    tRel: 48,
    title: 'Phase 7 · Links restored',
    caption:
      'Links come back. AI hands coordination back to Sat-1 and scales the estimator down. Baseline still has a stale uncertainty tail.',
    tone: 'recovery',
  },
  {
    tRel: 62,
    title: 'Phase 8 · Recovery complete',
    caption:
      'Both systems back to nominal. Compare cumulative "degraded comms time": AI kept the swarm effective for longer.',
    tone: 'recovery',
  },
];

export const TOUR_DURATION_SEC = 75;

export function buildScriptedTour(startSimTime: number): ScenarioEvent[] {
  const t0 = startSimTime;
  return [
    { t: t0 + 4, kind: 'setEdge', a: 0, b: 1, health: 'degraded' },
    { t: t0 + 14, kind: 'setEdge', a: 0, b: 1, health: 'lost' },
    { t: t0 + 16, kind: 'disturbance', intensity: 0.45, durationSec: 12 },
    { t: t0 + 22, kind: 'delayStorm', factor: 2.2, durationSec: 10 },
    { t: t0 + 34, kind: 'roleFailure', node: 0, durationSec: 12 },
    { t: t0 + 48, kind: 'setEdge', a: 0, b: 1, health: 'ok' },
    { t: t0 + 52, kind: 'setEdge', a: 0, b: 2, health: 'ok' },
  ];
}

export function getCueForRel(rel: number): { index: number; cue: NarrationCue } | null {
  if (rel < 0) return null;
  let idx = -1;
  for (let i = 0; i < TOUR_NARRATION.length; i++) {
    if (TOUR_NARRATION[i]!.tRel <= rel) idx = i;
    else break;
  }
  if (idx < 0) return null;
  return { index: idx, cue: TOUR_NARRATION[idx]! };
}
