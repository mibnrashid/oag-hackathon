import type { LinkHealth } from './types';

export const MISSION_COUNT = 6;
export const BACKGROUND_COUNT = 700;
export const ORBIT_RADIUS = 1.14;
export const ANGULAR_RATE = 0.09;

/** Undirected mission edges (visual + comms graph). */
export const MISSION_EDGES: readonly [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 5],
  [2, 4],
  [2, 3],
  [3, 4],
  [4, 5],
  [3, 5],
];

export function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function initialEdgeHealth(): Map<string, LinkHealth> {
  const m = new Map<string, LinkHealth>();
  for (const [a, b] of MISSION_EDGES) {
    m.set(edgeKey(a, b), 'ok');
  }
  return m;
}

export function neighborsOf(node: number): number[] {
  const s = new Set<number>();
  for (const [a, b] of MISSION_EDGES) {
    if (a === node) s.add(b);
    if (b === node) s.add(a);
  }
  return [...s];
}
