import { MISSION_COUNT, edgeKey } from './graph';
import type { LinkHealth } from './types';

export interface ObservationState {
  obsTime: number[][];
  obsAngle: number[][];
  nextPacketDue: Map<string, number>;
}

export function createObservationState(): ObservationState {
  const obsTime = Array.from({ length: MISSION_COUNT }, () => Array(MISSION_COUNT).fill(0));
  const obsAngle = Array.from({ length: MISSION_COUNT }, () => Array(MISSION_COUNT).fill(0));
  return { obsTime, obsAngle, nextPacketDue: new Map() };
}

function scheduleNextPacket(
  nextPacketDue: Map<string, number>,
  key: string,
  simTime: number,
  health: LinkHealth,
  delayFactor: number,
): void {
  if (health === 'lost') return;
  const base = health === 'ok' ? 0.09 : 0.34;
  const jitter = 0.02 + Math.random() * 0.08;
  nextPacketDue.set(key, simTime + (base * delayFactor + jitter) * (health === 'degraded' ? 1.2 : 1));
}

export function initPacketSchedule(
  nextPacketDue: Map<string, number>,
  simTime: number,
  edgeHealth: ReadonlyMap<string, LinkHealth>,
  delayFactor: number,
  edges: readonly [number, number][],
): void {
  nextPacketDue.clear();
  for (const [a, b] of edges) {
    const k = edgeKey(a, b);
    const h = edgeHealth.get(k) ?? 'ok';
    scheduleNextPacket(nextPacketDue, k, simTime, h, delayFactor);
  }
}

export function rescheduleEdge(
  nextPacketDue: Map<string, number>,
  key: string,
  simTime: number,
  health: LinkHealth,
  delayFactor: number,
): void {
  if (health === 'lost') {
    nextPacketDue.delete(key);
    return;
  }
  scheduleNextPacket(nextPacketDue, key, simTime, health, delayFactor);
}
