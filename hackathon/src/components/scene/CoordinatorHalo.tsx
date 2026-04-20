import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  estimatorActive: boolean;
}

/** Ring around the active coordinator; pulses faster + brighter when estimator is running. */
export default function CoordinatorHalo({ estimatorActive }: Props) {
  const inner = useRef<THREE.Mesh>(null);
  const outer = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const t = performance.now() * 0.001;
    const speed = estimatorActive ? 2.2 : 0.9;
    const amp = estimatorActive ? 0.45 : 0.18;
    if (inner.current) {
      const s = 0.055 + amp * 0.01 * Math.sin(t * speed);
      inner.current.scale.setScalar(s);
      (inner.current.material as THREE.MeshBasicMaterial).opacity =
        0.55 + 0.3 * (0.5 + 0.5 * Math.sin(t * speed));
    }
    if (outer.current) {
      const s = 0.085 + amp * 0.02 * Math.sin(t * speed + 0.6);
      outer.current.scale.setScalar(s);
      (outer.current.material as THREE.MeshBasicMaterial).opacity =
        0.12 + 0.18 * (0.5 + 0.5 * Math.sin(t * speed + 0.6));
    }
  });

  const color = estimatorActive ? '#7cffc4' : '#6ed6ff';

  return (
    <group>
      <mesh ref={inner} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 1, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={outer} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.88, 1, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}
