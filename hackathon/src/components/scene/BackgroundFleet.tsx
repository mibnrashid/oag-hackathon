import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BACKGROUND_COUNT } from '@/sim/graph';
import { backgroundPosition } from '@/sim/orbitLayout';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();

export default function BackgroundFleet() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tRef = useRef(0);
  const seeds = useMemo(() => Float32Array.from({ length: BACKGROUND_COUNT }, (_, i) => i * 0.137 + 0.21), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < BACKGROUND_COUNT; i++) {
      const pos = backgroundPosition(seeds[i]!, 0, _p);
      _m.compose(pos, _q, _s.setScalar(0.012));
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [seeds]);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    tRef.current += dt;
    const t = tRef.current;
    for (let i = 0; i < BACKGROUND_COUNT; i++) {
      const pos = backgroundPosition(seeds[i]!, t, _p);
      _m.compose(pos, _q, _s.setScalar(0.012));
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BACKGROUND_COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#355070" transparent opacity={0.35} depthWrite={false} />
    </instancedMesh>
  );
}
