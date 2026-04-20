import { MISSION_EDGES, edgeKey } from './graph';
import type { ObservationState } from './observations';
import { rescheduleEdge } from './observations';
import type { LinkHealth } from './types';
import type { WorldSnapshot } from './world';

export function deliverPacket(
  obs: ObservationState,
  simTime: number,
  i: number,
  j: number,
  angles: readonly number[],
): void {
  obs.obsTime[i]![j] = simTime;
  obs.obsAngle[i]![j] = angles[j]!;
}

export function processPackets(
  world: WorldSnapshot,
  obs: ObservationState,
  edgeHealth: Map<string, LinkHealth>,
  delayFactor: number,
): void {
  const { simTime, angles } = world;
  for (const [a, b] of MISSION_EDGES) {
    const key = edgeKey(a, b);
    const h = edgeHealth.get(key) ?? 'ok';
    if (h === 'lost') continue;
    const due = obs.nextPacketDue.get(key);
    if (due == null || simTime < due) continue;

    let accept = true;
    if (h === 'degraded' && Math.random() > 0.62) accept = false;

    if (accept) {
      deliverPacket(obs, simTime, a, b, angles);
      deliverPacket(obs, simTime, b, a, angles);
    }
    rescheduleEdge(obs.nextPacketDue, key, simTime, h, delayFactor);
  }
}
