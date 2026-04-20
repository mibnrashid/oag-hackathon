import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Globe from './Globe';
import AtmosphereGlow from './AtmosphereGlow';
import BackgroundFleet from './BackgroundFleet';
import MissionGraph from './MissionGraph';
import OrbitGrid from './OrbitGrid';

function Rig() {
  return (
    <>
      <color attach="background" args={['#0a0e1a']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 2, 3]} intensity={1.25} color="#d7ecff" />
      <directionalLight position={[-3, -1, -2]} intensity={0.35} color="#304060" />
    </>
  );
}

export default function SwarmCanvas() {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', display: 'block' }}
      camera={{ position: [0, 0.35, 2.55], fov: 45 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <Rig />
        <Globe />
        <AtmosphereGlow />
        <OrbitGrid />
        <BackgroundFleet />
        <MissionGraph />
      </Suspense>
    </Canvas>
  );
}
