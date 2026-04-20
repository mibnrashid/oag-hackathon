import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import Globe from './Globe';
import AtmosphereGlow from './AtmosphereGlow';
import BackgroundFleet from './BackgroundFleet';
import MissionGraph from './MissionGraph';
import OrbitGrid from './OrbitGrid';

function Rig() {
  return (
    <>
      <color attach="background" args={['#050811']} />
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
      camera={{ position: [0, 0.9, 3.0], fov: 42 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <Rig />
        <Stars radius={80} depth={40} count={4000} factor={3} saturation={0} fade speed={0.4} />
        <Globe />
        <AtmosphereGlow />
        <OrbitGrid />
        <BackgroundFleet />
        <MissionGraph />
        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          minDistance={1.6}
          maxDistance={5}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.28}
          rotateSpeed={0.6}
          zoomSpeed={0.6}
        />
      </Suspense>
    </Canvas>
  );
}
