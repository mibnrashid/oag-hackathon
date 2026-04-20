import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BACKGROUND_COUNT } from '@/sim/graph';
import { backgroundPositionFromOrbit, createBackgroundOrbits } from '@/sim/orbitLayout';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();

const SHELL_COLORS = [
  new THREE.Color('#ff9c42'), /** 43° */
  new THREE.Color('#4aa8ff'), /** 53° */
  new THREE.Color('#3ad1c6'), /** 70° */
  new THREE.Color('#ff6fa8'), /** 97.6° */
];

function shellColor(incRad: number): THREE.Color {
  const deg = (incRad * 180) / Math.PI;
  if (deg < 48) return SHELL_COLORS[0]!;
  if (deg < 60) return SHELL_COLORS[1]!;
  if (deg < 80) return SHELL_COLORS[2]!;
  return SHELL_COLORS[3]!;
}

export default function BackgroundFleet() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tRef = useRef(0);
  const orbits = useMemo(() => createBackgroundOrbits(BACKGROUND_COUNT), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const colorAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(BACKGROUND_COUNT * 3),
      3,
    );
    for (let i = 0; i < BACKGROUND_COUNT; i++) {
      const c = shellColor(orbits[i]!.inc);
      colorAttr.setXYZ(i, c.r, c.g, c.b);
    }
    mesh.instanceColor = colorAttr;
    for (let i = 0; i < BACKGROUND_COUNT; i++) {
      const pos = backgroundPositionFromOrbit(orbits[i]!, 0, _p);
      _m.compose(pos, _q, _s.setScalar(0.009));
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [orbits]);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    tRef.current += dt;
    const t = tRef.current;
    for (let i = 0; i < BACKGROUND_COUNT; i++) {
      const pos = backgroundPositionFromOrbit(orbits[i]!, t, _p);
      _m.compose(pos, _q, _s.setScalar(0.009));
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BACKGROUND_COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial vertexColors transparent opacity={0.65} depthWrite={false} />
    </instancedMesh>
  );
}
