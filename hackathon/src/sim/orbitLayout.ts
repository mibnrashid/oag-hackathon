import * as THREE from 'three';
import { MISSION_COUNT, ORBIT_RADIUS } from './graph';

const _v = new THREE.Vector3();

/** Inclination of the mission swarm orbital plane (rad). */
const MISSION_INC = (53 * Math.PI) / 180;

/** Place mission sats on a single inclined circular orbit (ECI-ish). */
export function missionPosition(angle: number, out?: THREE.Vector3): THREE.Vector3 {
  const x = Math.cos(angle) * ORBIT_RADIUS;
  const yFlat = 0;
  const zFlat = Math.sin(angle) * ORBIT_RADIUS;
  const cosI = Math.cos(MISSION_INC);
  const sinI = Math.sin(MISSION_INC);
  const y = yFlat * cosI - zFlat * sinI;
  const z = yFlat * sinI + zFlat * cosI;
  _v.set(x, y, z);
  if (out) return out.copy(_v);
  return _v.clone();
}

export function missionAngleFor(i: number): number {
  return (i / MISSION_COUNT) * Math.PI * 2;
}

/**
 * Background sats: each one gets a stable orbital plane (RAAN + inclination)
 * and a phase that advances with time. This spreads them evenly over the globe
 * instead of clustering at one pole.
 */
export interface BgOrbit {
  raan: number;
  inc: number;
  phase0: number;
  rate: number;
  radius: number;
}

function hash01(x: number): number {
  const s = Math.sin(x) * 43758.5453;
  return s - Math.floor(s);
}

export function createBackgroundOrbits(count: number): BgOrbit[] {
  const orbits: BgOrbit[] = [];
  for (let i = 0; i < count; i++) {
    const r1 = hash01(i * 12.9898 + 7.13);
    const r2 = hash01(i * 78.233 + 0.41);
    const r3 = hash01(i * 39.337 + 11.77);
    const r4 = hash01(i * 93.989 + 2.51);
    const r5 = hash01(i * 17.137 + 31.09);
    /** Shell mix: 53° (common), 43°, 70°, 97.6° polar. */
    const shellPick = r5;
    let incDeg = 53;
    if (shellPick < 0.25) incDeg = 43;
    else if (shellPick < 0.55) incDeg = 53;
    else if (shellPick < 0.80) incDeg = 70;
    else incDeg = 97.6;
    const inc = (incDeg * Math.PI) / 180;
    const raan = r1 * Math.PI * 2;
    const phase0 = r2 * Math.PI * 2;
    const radius = 1.06 + r3 * 0.18;
    const rate = 0.012 + r4 * 0.018;
    orbits.push({ raan, inc, phase0, rate, radius });
  }
  return orbits;
}

/** ECI-style position for an inclined orbital plane: Rz(RAAN) * Rx(inc) * (r cos v, r sin v, 0). */
export function backgroundPositionFromOrbit(orbit: BgOrbit, t: number, out?: THREE.Vector3): THREE.Vector3 {
  const v = orbit.phase0 + orbit.rate * t;
  const cv = Math.cos(v);
  const sv = Math.sin(v);
  const ci = Math.cos(orbit.inc);
  const si = Math.sin(orbit.inc);
  const cr = Math.cos(orbit.raan);
  const sr = Math.sin(orbit.raan);

  const xp = orbit.radius * cv;
  const yp = orbit.radius * sv;

  const x1 = xp;
  const y1 = yp * ci;
  const z1 = yp * si;

  const x = x1 * cr - y1 * sr;
  const y = x1 * sr + y1 * cr;
  const z = z1;

  _v.set(x, z, y);
  if (out) return out.copy(_v);
  return _v.clone();
}
