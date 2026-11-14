import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-space px-6 py-16 text-center text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgb(40_110_220/0.45),transparent_60%),radial-gradient(ellipse_at_80%_0%,rgb(120_60_200/0.18),transparent_55%)]"
      />
      <div className="relative flex max-w-2xl flex-col items-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">
          A space mission design game
        </p>
        <h1 className="mt-4 text-5xl font-extrabold tracking-[0.12em] sm:text-7xl">
          MISSION ARCHITECT
        </h1>
        <p className="mt-2 text-xl font-medium tracking-[0.3em] text-muted sm:text-2xl">
          PATHWAYS TO THE STARS
        </p>
        <p className="mt-8 text-lg leading-relaxed text-muted">
          Join the astronaut class. Design a spacecraft with the engineers,
          choose your orbit and rocket, launch, and fly to the Moon, Mars,
          Jupiter and beyond. Every choice is a trade-off, and the physics
          decides how your mission ends.
        </p>
        <Link
          href="/play"
          className="mt-10 rounded-full border border-accent bg-accent/15 px-10 py-4 text-lg font-bold tracking-[0.18em] text-ink shadow-[0_0_30px_rgb(92_225_255/0.3)] transition hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          PLAY
        </Link>
        <p className="mt-12 text-sm text-muted">
          Made for the NASA Space Apps Challenge 2026: Space Mission Design
          Game. An independent student project, not affiliated with or
          endorsed by NASA.
        </p>
        <Link href="/credits" className="mt-3 text-sm text-accent underline-offset-4 hover:underline">
          Credits
        </Link>
      </div>
    </main>
  );
}
