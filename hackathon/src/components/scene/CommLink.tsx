import { useMemo, useRef } from 'react';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ARC_SEGMENTS = 48;
const PACKET_COUNT_OK = 3;
const PACKET_COUNT_DEG = 2;

interface Props {
  a: THREE.Vector3;
  b: THREE.Vector3;
  /** 0=ok, 1=degraded, 2=lost (smoothed). */
  smoothed: number;
  edgeKey: string;
}

function arcPoints(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3[] {
  const midDir = new THREE.Vector3().addVectors(a, b).normalize();
  const baseLen = Math.max(a.length(), b.length());
  const ab = a.distanceTo(b);
  const arcRadius = baseLen + Math.min(0.12, ab * 0.18);
  const mid = midDir.multiplyScalar(arcRadius);

  const pts: THREE.Vector3[] = [];
  const tmp = new THREE.Vector3();
  const t1 = new THREE.Vector3();
  const t2 = new THREE.Vector3();
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const u = i / ARC_SEGMENTS;
    t1.copy(a).lerp(mid, u);
    t2.copy(mid).lerp(b, u);
    tmp.copy(t1).lerp(t2, u);
    pts.push(tmp.clone());
  }
  return pts;
}

/** Position along the precomputed polyline at normalized arc-length t in [0,1]. */
function samplePolyline(pts: THREE.Vector3[], t: number, out: THREE.Vector3): void {
  const n = pts.length - 1;
  const f = t * n;
  const i = Math.min(n - 1, Math.floor(f));
  const u = f - i;
  out.copy(pts[i]!).lerp(pts[i + 1]!, u);
}

function linkColor(s: number): string {
  if (s < 0.45) return '#3ad19a';
  if (s < 1.45) return '#f1c232';
  return '#ff4d5e';
}

function packetColor(s: number): string {
  if (s < 0.45) return '#8affd7';
  if (s < 1.45) return '#ffe79a';
  return '#ff8899';
}

/** A single inter-sat link with health-coded rendering and animated packets. */
export default function CommLink({ a, b, smoothed, edgeKey }: Props) {
  const pts = useMemo(() => arcPoints(a.clone(), b.clone()), [a.x, a.y, a.z, b.x, b.y, b.z]);

  const isLost = smoothed >= 1.45;
  const isDegraded = smoothed >= 0.45 && smoothed < 1.45;
  const color = linkColor(smoothed);

  /** For "lost" we only draw two short stubs near each endpoint. */
  const stubA = useMemo(() => pts.slice(0, Math.floor(ARC_SEGMENTS * 0.22)), [pts]);
  const stubB = useMemo(() => pts.slice(Math.floor(ARC_SEGMENTS * 0.78)), [pts]);

  const packetRef = useRef<THREE.InstancedMesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const phaseRef = useRef<number>(Math.random());
  const _m = useMemo(() => new THREE.Matrix4(), []);
  const _q = useMemo(() => new THREE.Quaternion(), []);
  const _s = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const _p = useMemo(() => new THREE.Vector3(), []);

  const count = isLost ? 0 : isDegraded ? PACKET_COUNT_DEG : PACKET_COUNT_OK;
  const speed = isLost ? 0 : isDegraded ? 0.16 : 0.42;

  useFrame((_, dt) => {
    const mesh = packetRef.current;
    if (mesh && count > 0) {
      phaseRef.current = (phaseRef.current + dt * speed) % 1;
      for (let i = 0; i < count; i++) {
        const t = (phaseRef.current + i / count) % 1;
        /** Drop-out flicker for degraded to show unreliable delivery. */
        const visible = isDegraded
          ? ((Math.sin((t + (edgeKey.charCodeAt(0) % 7)) * 14) * 0.5 + 0.5) > 0.35)
          : true;
        samplePolyline(pts, t, _p);
        _s.setScalar(visible ? (isDegraded ? 0.014 : 0.018) : 0.0001);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(i, _m);
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    } else if (mesh) {
      mesh.count = 0;
      mesh.instanceMatrix.needsUpdate = true;
    }

    if (pulseRef.current && isLost) {
      const mid = pts[Math.floor(pts.length / 2)]!;
      pulseRef.current.position.copy(mid);
      const s = 0.028 + 0.012 * Math.sin(performance.now() * 0.006);
      pulseRef.current.scale.setScalar(s);
    }
  });

  if (isLost) {
    return (
      <group>
        <Line
          points={stubA}
          color={color}
          lineWidth={1.2}
          transparent
          opacity={0.55}
          dashed
          dashSize={0.035}
          gapSize={0.02}
          depthWrite={false}
        />
        <Line
          points={stubB}
          color={color}
          lineWidth={1.2}
          transparent
          opacity={0.55}
          dashed
          dashSize={0.035}
          gapSize={0.02}
          depthWrite={false}
        />
        <mesh ref={pulseRef}>
          <ringGeometry args={[0.6, 1, 20]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <Line
        points={pts}
        color={color}
        lineWidth={isDegraded ? 1.4 : 1.6}
        transparent
        opacity={isDegraded ? 0.7 : 0.82}
        dashed={isDegraded}
        dashSize={0.045}
        gapSize={0.03}
        depthWrite={false}
      />
      <instancedMesh
        ref={packetRef}
        args={[undefined, undefined, Math.max(1, count)]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial color={packetColor(smoothed)} transparent opacity={0.95} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
