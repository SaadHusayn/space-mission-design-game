'use client';

import dynamic from 'next/dynamic';

// The game uses WebGL and browser storage, so it only renders in the browser.
const GameRoot = dynamic(() => import('./GameRoot'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-space">
      <p className="text-3xl font-extrabold tracking-[0.3em] text-ink sm:text-4xl">TRAJECTORY</p>
    </div>
  ),
});

export default function GameClient() {
  return <GameRoot />;
}
