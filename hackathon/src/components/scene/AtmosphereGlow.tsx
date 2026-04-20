import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function AtmosphereGlow() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.02;
  });

  return (
    <mesh ref={ref} scale={1.02}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshBasicMaterial color="#1a3a4a" transparent opacity={0.18} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}
