import { ANGULAR_RATE, MISSION_COUNT, edgeKey } from './graph';
import type { LinkHealth } from './types';

export interface WorldSnapshot {
  simTime: number;
  angles: readonly number[];
  formationError: number;
  /** Multiplier on packet intervals (>1 means slower updates). */
  delayFactor: number;
  /** Coordinator node degraded by scenario (not reassignment). */
  roleFailureUntil: number;
}

export function advanceAngles(angles: number[], dt: number): number[] {
  const next = angles.slice();
  for (let i = 0; i < MISSION_COUNT; i++) {
    next[i] += ANGULAR_RATE * dt;
  }
  return next;
}

export function decayFormationError(current: number, dt: number, calm: boolean): number {
  const rate = calm ? 0.35 : 0.12;
  const target = calm ? 0 : current * 0.98;
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function bumpFormationError(current: number, intensity: number): number {
  return Math.min(6, current + intensity * 2.2);
}

export function createInitialWorld(): WorldSnapshot {
  const angles = Array.from({ length: MISSION_COUNT }, (_, i) => (i / MISSION_COUNT) * Math.PI * 2);
  return {
    simTime: 0,
    angles,
    formationError: 0,
    delayFactor: 1,
    roleFailureUntil: -1,
  };
}

export function setEdgeHealth(
  edgeHealth: Map<string, LinkHealth>,
  a: number,
  b: number,
  health: LinkHealth,
): void {
  edgeHealth.set(edgeKey(a, b), health);
}

export function getEdgeHealth(edgeHealth: ReadonlyMap<string, LinkHealth>, a: number, b: number): LinkHealth {
  return edgeHealth.get(edgeKey(a, b)) ?? 'ok';
}
