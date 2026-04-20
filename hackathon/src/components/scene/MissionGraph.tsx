import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { MISSION_COUNT, MISSION_EDGES, edgeKey } from '@/sim/graph';
import { missionPosition } from '@/sim/orbitLayout';
import { useMissionStore } from '@/store/mission-store';
import CommLink from './CommLink';
import CoordinatorHalo from './CoordinatorHalo';

export default function MissionGraph() {
  const angles = useMissionStore((s) => s.world.angles);
  const displayLink = useMissionStore((s) => s.displayLink);
  const coordinatorId = useMissionStore((s) => s.aiPanel.coordinatorId);
  const estimatorActive = useMissionStore((s) => s.aiPanel.estimatorActive);
  const roleFailureUntil = useMissionStore((s) => s.world.roleFailureUntil);
  const simTime = useMissionStore((s) => s.world.simTime);

  const nodes = useMemo(() => {
    return Array.from({ length: MISSION_COUNT }, (_, i) => {
      const p = missionPosition(angles[i] ?? 0);
      return new THREE.Vector3(p.x, p.y, p.z);
    });
  }, [angles]);

  const roleFailing = simTime < roleFailureUntil;

  return (
    <group>
      {MISSION_EDGES.map(([a, b]) => {
        const k = edgeKey(a, b);
        const sm = displayLink.get(k) ?? 0;
        return <CommLink key={k} edgeKey={k} a={nodes[a]!} b={nodes[b]!} smoothed={sm} />;
      })}

      {Array.from({ length: MISSION_COUNT }, (_, i) => {
        const p = nodes[i]!;
        const isCoord = i === coordinatorId;
        const isFailing = i === 0 && roleFailing;
        return (
          <group key={i} position={p}>
            <mesh>
              <sphereGeometry args={[0.028, 16, 16]} />
              <meshStandardMaterial
                color={isFailing ? '#ff6b6b' : isCoord ? '#7cffc4' : '#b7d7ff'}
                emissive={isFailing ? '#3a0a0a' : isCoord ? '#0f3a2a' : '#0a1a2a'}
                emissiveIntensity={isCoord ? 0.9 : 0.55}
                metalness={0.35}
                roughness={0.35}
              />
            </mesh>
            {isCoord && <CoordinatorHalo estimatorActive={estimatorActive} />}
            <Text
              position={[0, 0.06, 0]}
              fontSize={0.03}
              color={isCoord ? '#c0ffe4' : '#e8f4ff'}
              outlineWidth={0.006}
              outlineColor="#020508"
              anchorX="center"
              anchorY="bottom"
              letterSpacing={0.05}
              raycast={() => null}
            >
              {isCoord ? `SAT-${i + 1} · COORD` : `SAT-${i + 1}`}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
