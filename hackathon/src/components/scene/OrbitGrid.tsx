import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { ORBIT_RADIUS } from '@/sim/graph';

const MISSION_INC = (53 * Math.PI) / 180;

function inclinedRing(r: number, inc: number, segs = 128): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const cosI = Math.cos(inc);
  const sinI = Math.sin(inc);
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const yFlat = 0;
    const zFlat = Math.sin(a) * r;
    const y = yFlat * cosI - zFlat * sinI;
    const z = yFlat * sinI + zFlat * cosI;
    pts.push(new THREE.Vector3(x, y, z));
  }
  return pts;
}

function equatorialRing(r: number, segs = 128): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  return pts;
}

/**
 * Mission orbit ring (inclined 53°) + a faint equatorial guide.
 * Gives viewers a clear sense of the plane the 6 mission sats ride on.
 */
export default function OrbitGrid() {
  const mission = useMemo(() => inclinedRing(ORBIT_RADIUS, MISSION_INC), []);
  const equator = useMemo(() => equatorialRing(1.02), []);
  const outerGuide = useMemo(() => inclinedRing(1.32, MISSION_INC * 0.55), []);

  return (
    <group>
      <Line points={mission} color="#2ee6ff" lineWidth={1.25} transparent opacity={0.35} depthWrite={false} />
      <Line points={equator} color="#3a5b8a" lineWidth={1} transparent opacity={0.18} depthWrite={false} />
      <Line points={outerGuide} color="#2ee6ff" lineWidth={1} transparent opacity={0.08} depthWrite={false} />
    </group>
  );
}
