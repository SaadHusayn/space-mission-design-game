import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Credits",
};

const ASSETS = [
  {
    name: "Earth (day, night, clouds, normal, specular), Moon, Mars, Jupiter and Sun maps; Milky Way panorama (2K)",
    author: "Solar System Scope",
    licence: "CC BY 4.0",
    href: "https://www.solarsystemscope.com/textures/",
    note: "Resized and converted to WebP.",
  },
  {
    name: "Placeholder spacecraft model",
    author: "Mission Architect team",
    licence: "Original work",
    href: null,
    note: "Generated in code (scripts/build-placeholder-models.mjs).",
  },
  {
    name: "3D Rockets, Celestial Bodies & Spacecraft (.glb)",
    author: "NASA 3D Resources / Space Universe Collection",
    licence: "NASA media usage policy",
    href: "https://github.com/nasa/NASA-3D-Resources",
    note: "Atlas 6, Space Shuttle, Saturn V, Starship, Sun, Moon (LRO), Mars, Kepler-186f, ISS, LRO, MRO, Juno, Voyager, JWST, DSN 70m dish.",
  },
  {
    name: "Procedural ambient music & mission SFX",
    author: "Mission Architect team",
    licence: "Original work",
    href: null,
    note: "Synthesized locally via Web Audio API (src/audio/soundEngine.ts).",
  },
];

const REAL_MISSIONS = [
  ["ISS & CubeSats (LEO)", "Low-Earth-orbit technology demonstration, Earth observation, and microgravity research."],
  ["Artemis & Lunar Reconnaissance Orbiter (Moon)", "Cislunar transfer orbits, polar water-ice mapping, and lunar communications."],
  ["Mars Reconnaissance Orbiter & Perseverance (Mars)", "Hohmann transfers (~259 days), atmospheric entry/landing, and high-gain deep-space downlink."],
  ["Galileo, Juno & Europa Clipper (Jupiter)", "Radiation-hardened electronics, low-solar-flux RTG power (~3.7% of 1 AU), and gravity assists."],
  ["Voyager 1 & 2 (Interstellar)", "Jupiter/Saturn gravity-assist slingshots, RTG longevity, and heliopause plasma science."],
  ["Kepler & JWST (Exoplanet Telescope)", "Sun-Earth L2 thermal stability and transit photometry (detecting ppm-level starlight dips)."],
] as const;

const RESOURCES = [
  ["Design and Develop Science Missions (NASA)", "https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf?emrc=a454cf"],
  ["General Mission Analysis Tool, GMAT (NASA)", "https://software.nasa.gov/software/GSC-19468-1"],
  ["Concept Maturity Levels (NASA JPL)", "https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299"],
  ["Mission Design Lab (NASA GSFC)", "https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/"],
  ["NASA Mission Viz", "https://nasa.github.io/mission-viz/"],
  ["A Learning Game About Telescopes (NASA)", "https://science.nasa.gov/mission/webb/game-build-it-yourself/"],
  ["CubeSat 101 (NASA CSLI)", "https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf"],
  ["Digital Games and Activities (Canadian Space Agency)", "https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp"],
] as const;

export default function CreditsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-space px-6 py-16 text-ink">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-6 text-4xl font-extrabold tracking-wide">Credits</h1>
      <p className="mt-4 leading-relaxed text-muted">
        Mission Architect: Pathways to the Stars is an independent student project made for
        the NASA Space Apps Challenge 2026. It is not affiliated with or
        endorsed by NASA or any other space agency. The Orbital Exploration
        Agency and all characters in the game are fictional. Physics in the
        game is simplified for learning.
      </p>

      <h2 className="mt-10 text-2xl font-bold">Assets</h2>
      <ul className="mt-4 space-y-4">
        {ASSETS.map((asset) => (
          <li key={asset.name} className="rounded-xl border border-line bg-panel p-4">
            <p className="font-semibold">{asset.name}</p>
            <p className="mt-1 text-sm text-muted">
              {asset.author} · {asset.licence} · {asset.note}
            </p>
            {asset.href && (
              <a href={asset.href} className="mt-1 inline-block text-sm text-accent underline-offset-4 hover:underline" rel="noreferrer" target="_blank">
                {asset.href}
              </a>
            )}
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-2xl font-bold">Learn more</h2>
      <p className="mt-2 text-sm text-muted">
        Resources listed by the challenge that shaped the game&apos;s design.
      </p>
      <ul className="mt-4 space-y-2">
        {RESOURCES.map(([label, href]) => (
          <li key={href}>
            <a href={href} className="text-accent underline-offset-4 hover:underline" rel="noreferrer" target="_blank">
              {label}
            </a>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-2xl font-bold">Real missions referenced</h2>
      <p className="mt-2 text-sm text-muted">
        Each pathway in Mission Architect is inspired by real-world spaceflight engineering.
      </p>
      <ul className="mt-4 space-y-2">
        {REAL_MISSIONS.map(([title, desc]) => (
          <li key={title} className="rounded-xl border border-line bg-panel p-3 text-sm">
            <span className="font-semibold text-ink">{title}:</span>{' '}
            <span className="text-muted">{desc}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-2xl font-bold">Built with</h2>
      <p className="mt-2 text-muted">
        Next.js, React, TypeScript, Tailwind CSS, three.js, React Three Fiber,
        drei, zustand, glTF Transform.
      </p>
    </main>
  );
}
