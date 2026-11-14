import Link from 'next/link';

/** Shown when the browser can't run WebGL 2, or the 3D view crashes. */
export function WebGLFallback({ reason }: { reason?: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-space p-8 text-center text-ink">
      <h1 className="text-3xl font-extrabold tracking-wide">3D graphics couldn&apos;t start</h1>
      <p className="mt-4 max-w-md leading-relaxed text-muted">
        Mission Architect needs WebGL 2. Try the latest Chrome, Edge or Firefox, turn on hardware acceleration in your
        browser settings, then reload this page.
      </p>
      {reason && <p className="mt-3 max-w-md font-mono text-sm text-warn">{reason}</p>}
      <Link href="/" className="mt-8 text-accent underline-offset-4 hover:underline">
        Back to the home page
      </Link>
    </div>
  );
}
