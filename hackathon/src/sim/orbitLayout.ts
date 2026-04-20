import { ORBIT_RADIUS } from './graph';
import * as THREE from 'three';

const _v = new THREE.Vector3();

/** Mission orbit: slight tilt for readability; radius in Earth units. */
export function missionPosition(angle: number, out?: THREE.Vector3): THREE.Vector3 {
  const tilt = 0.35;
  _v.set(Math.cos(angle), tilt, Math.sin(angle)).normalize().multiplyScalar(ORBIT_RADIUS);
  if (out) return out.copy(_v);
  return _v.clone();
}

/** Background shell: different tilt + radius jitter for depth. */
export function backgroundPosition(seed: number, t: number, out?: THREE.Vector3): THREE.Vector3 {
  const u = seed * 12.9898;
  const inc = 0.55 + (Math.sin(u) * 0.5 + 0.5) * 0.35;
  const phase = u + t * (0.03 + (Math.cos(u * 3.1) * 0.5 + 0.5) * 0.05);
  const r = 1.05 + (Math.sin(u * 2.2) * 0.5 + 0.5) * 0.12;
  _v.set(Math.cos(phase) * Math.cos(inc), Math.sin(inc), Math.sin(phase) * Math.cos(inc)).normalize().multiplyScalar(r);
  if (out) return out.copy(_v);
  return _v.clone();
}
