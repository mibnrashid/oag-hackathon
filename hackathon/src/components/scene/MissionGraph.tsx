import { useMemo, useRef } from 'react';
import { Line, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MISSION_COUNT, MISSION_EDGES, edgeKey } from '@/sim/graph';
import { missionPosition } from '@/sim/orbitLayout';
import { useMissionStore } from '@/store/mission-store';

function linkColor(smoothed: number): string {
  if (smoothed < 0.45) return '#2ee6ff';
  if (smoothed < 1.45) return '#e6c82e';
  return '#ff3355';
}

export default function MissionGraph() {
  const angles = useMissionStore((s) => s.world.angles);
  const displayLink = useMissionStore((s) => s.displayLink);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.06;
  });

  const nodes = useMemo(() => {
    return Array.from({ length: MISSION_COUNT }, (_, i) => {
      const p = missionPosition(angles[i] ?? 0);
      return new THREE.Vector3(p.x, p.y, p.z);
    });
  }, [angles]);

  return (
    <group ref={groupRef}>
      {MISSION_EDGES.map(([a, b]) => {
        const k = edgeKey(a, b);
        const sm = displayLink.get(k) ?? 0;
        const pts = [nodes[a]!.clone(), nodes[b]!.clone()];
        return (
          <Line key={k} points={pts} color={linkColor(sm)} lineWidth={1.75} transparent opacity={0.92} />
        );
      })}
      {Array.from({ length: MISSION_COUNT }, (_, i) => {
        const p = nodes[i]!;
        return (
          <group key={i} position={p}>
            <mesh>
              <sphereGeometry args={[0.028, 16, 16]} />
              <meshStandardMaterial
                color={i === 0 ? '#7cffc4' : '#b7d7ff'}
                emissive={i === 0 ? '#0f3a2a' : '#0a1a2a'}
                emissiveIntensity={0.6}
                metalness={0.35}
                roughness={0.35}
              />
            </mesh>
            <Text
              position={[0, 0.05, 0]}
              fontSize={0.034}
              color="#e8f4ff"
              outlineWidth={0.007}
              outlineColor="#020508"
              anchorX="center"
              anchorY="bottom"
              letterSpacing={0.06}
              raycast={() => null}
            >
              {`SAT-${i + 1}`}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
