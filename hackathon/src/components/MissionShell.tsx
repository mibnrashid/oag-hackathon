import { useMissionLoop } from '@/hooks/useMissionLoop';
import SwarmCanvas from '@/components/scene/SwarmCanvas';
import MissionHudOverlay from '@/components/MissionHudOverlay';

/**
 * Starlink-viz page pattern: full-viewport WebGL under fixed HUD overlay.
 */
export default function MissionShell() {
  useMissionLoop();

  return (
    <main className="fixed inset-0 z-0 bg-[var(--color-bg)]">
      <div className="absolute inset-0 z-0">
        <SwarmCanvas />
      </div>
      <MissionHudOverlay />
    </main>
  );
}
