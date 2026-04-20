import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

function ring(axis: 'x' | 'y' | 'z', phase: number, r: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const segs = 96;
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2 + phase;
    if (axis === 'x') pts.push(new THREE.Vector3(0, Math.cos(t) * r, Math.sin(t) * r));
    if (axis === 'y') pts.push(new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r));
    if (axis === 'z') pts.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, 0));
  }
  return pts;
}

/** Faint great-circle guides for an aerospace “ops room” feel. */
export default function OrbitGrid() {
  const rings = useMemo(() => {
    const r = 1.22;
    return [
      ring('y', 0, r),
      ring('y', 0.4, r),
      ring('x', 0.2, r),
    ];
  }, []);

  return (
    <group>
      {rings.map((pts, i) => (
        <Line key={i} points={pts} color="#2ee6ff" lineWidth={1} transparent opacity={0.08} depthWrite={false} />
      ))}
    </group>
  );
}
