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
  const demoMode = useMissionStore((s) => s.demoMode);
  const kpi = useMissionStore((s) => s.demoMode === 'ai' ? s.aiKpi : s.baselineKpi);

  const roleFailing = simTime < roleFailureUntil;
  const isAi = demoMode === 'ai';
  // Baseline visual: one mission node drifts off-track as uncertainty rises.
  const driftScale = Math.max(0, Math.min(1, (kpi.swarmUncertainty - 8) / 38));

  const nodes = useMemo(() => {
    return Array.from({ length: MISSION_COUNT }, (_, i) => {
      const p = missionPosition(angles[i] ?? 0);

      // In baseline mode, Sat-2 gradually departs from its orbital track.
      // This creates a clear, believable failure signature instead of noisy jitter.
      if (!isAi && i === 1 && driftScale > 0) {
        const cur = new THREE.Vector3(p.x, p.y, p.z);
        const ahead = missionPosition((angles[i] ?? 0) + 0.035);
        const tangent = new THREE.Vector3(ahead.x - p.x, ahead.y - p.y, ahead.z - p.z).normalize();
        const radial = cur.clone().normalize();
        const phase = Math.sin(simTime * 0.9) * 0.5 + 0.5;
        const offTrack = driftScale * (0.13 + 0.06 * phase);

        cur.addScaledVector(radial, offTrack);
        cur.addScaledVector(tangent, offTrack * 0.45);

        return cur;
      }

      return new THREE.Vector3(p.x, p.y, p.z);
    });
  }, [angles, driftScale, isAi, simTime]);

  return (
    <group>
      {MISSION_EDGES.map(([a, b]) => {
        const k = edgeKey(a, b);
        const sm = displayLink.get(k) ?? 0;
        return <CommLink key={k} edgeKey={k} a={nodes[a]!} b={nodes[b]!} smoothed={sm} />;
      })}

      {Array.from({ length: MISSION_COUNT }, (_, i) => {
        const p = nodes[i]!;
        const isCoord = isAi ? (i === coordinatorId) : (i === 0);
        const isFailing = i === 0 && roleFailing;
        
        // Show AI ghost for lost links
        const hasLostLink = MISSION_EDGES.some(([a, b]) => {
          if (a !== i && b !== i) return false;
          const k = edgeKey(a, b);
          return (displayLink.get(k) ?? 0) >= 1.45;
        });
        const showGhost = isAi && estimatorActive && hasLostLink && !isCoord;

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
            
            {showGhost && (
              <mesh position={[0.015, -0.01, 0.015]}>
                <sphereGeometry args={[0.03, 16, 16]} />
                <meshBasicMaterial color="#7dd9ff" wireframe transparent opacity={0.5} />
              </mesh>
            )}

            {isCoord && <CoordinatorHalo estimatorActive={isAi ? estimatorActive : false} />}
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
