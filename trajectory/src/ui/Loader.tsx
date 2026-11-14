'use client';

import { useProgress } from '@react-three/drei';

import { useGame } from '@/hooks/useGame';

/** Full-screen loading overlay. Fades out when the first scene is ready. */
export function Loader() {
  const booting = useGame((state) => state.phase === 'BOOT');
  const { progress } = useProgress();
  const percent = Math.round(progress);

  return (
    <div
      aria-hidden={!booting}
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-space transition-opacity duration-700 ${
        booting ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <p className="text-3xl font-extrabold tracking-[0.3em] text-ink sm:text-4xl">TRAJECTORY</p>
      <div
        role="progressbar"
        aria-label="Loading"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-8 h-1.5 w-64 overflow-hidden rounded-full bg-white/10"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-4 font-mono text-sm tracking-[0.2em] text-muted">PREPARING MISSION CONTROL · {percent}%</p>
    </div>
  );
}
