import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Credits",
};

const ASSETS = [
  {
    name: "Earth day, night, clouds, normal and specular maps; Milky Way panorama (2K)",
    author: "Solar System Scope",
    licence: "CC BY 4.0",
    href: "https://www.solarsystemscope.com/textures/",
    note: "Resized and converted to WebP.",
  },
  {
    name: "Placeholder spacecraft model",
    author: "TRAJECTORY team",
    licence: "Original work",
    href: null,
    note: "Generated in code (scripts/build-placeholder-models.mjs).",
  },
];

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
        TRAJECTORY: Pathways Beyond is an independent student project made for
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

      <h2 className="mt-10 text-2xl font-bold">Built with</h2>
      <p className="mt-2 text-muted">
        Next.js, React, TypeScript, Tailwind CSS, three.js, React Three Fiber,
        drei, zustand, glTF Transform.
      </p>
    </main>
  );
}
