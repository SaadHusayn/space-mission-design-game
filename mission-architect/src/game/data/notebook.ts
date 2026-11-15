/**
 * Mission Notebook concept cards (Phase 10).
 * Pure data module (framework-free) with formulas, plain-language explanations,
 * and worked example values grounded in 02-physics-and-challenges.md.
 */

export type NotebookCategory = 'Propulsion' | 'Orbits' | 'Power & Comms' | 'Science';

export interface NotebookCard {
  id: string;
  title: string;
  category: NotebookCategory;
  formula: string;
  summary: string;
  example: string;
  unlockedIn: string;
}

export const NOTEBOOK_CARDS: readonly NotebookCard[] = [
  {
    id: 'rocket-equation',
    title: 'Tsiolkovsky Rocket Equation (Δv)',
    category: 'Propulsion',
    formula: 'Δv = Isp · g₀ · ln(m₀ / mf)',
    summary: 'How much velocity change a spacecraft gets depends on engine efficiency (Isp) and how much of its starting mass is propellant.',
    example: 'With Isp = 315 s and m₀ / mf = 2.5, Δv ≈ 315 × 9.81 × ln(2.5) ≈ 2,831 m/s.',
    unlockedIn: 'Assembly & Launch',
  },
  {
    id: 'orbital-velocity',
    title: 'Circular Orbital Velocity',
    category: 'Orbits',
    formula: 'v = √(μ / r)',
    summary: 'Closer orbits pull harder under gravity, so a spacecraft must move faster to keep falling around the planet instead of into it.',
    example: 'In 400 km Low Earth Orbit (r = 6,771 km), v ≈ 7.67 km/s; at Geostationary orbit (42,164 km), v ≈ 3.07 km/s.',
    unlockedIn: 'Trajectory Selection',
  },
  {
    id: 'inverse-square-power',
    title: 'Inverse-Square Solar Flux',
    category: 'Power & Comms',
    formula: 'P(d) = P₁ AU / d²',
    summary: 'Sunlight spreads out in all directions, so doubling your distance from the Sun cuts solar panel power to one quarter.',
    example: 'At Mars (1.52 AU) solar flux is ~43% of Earth; at Jupiter (5.2 AU) it drops to just ~3.7%, favouring RTGs.',
    unlockedIn: 'Deep-Space Pathways',
  },
  {
    id: 'hohmann-transfer',
    title: 'Hohmann Transfer Orbit',
    category: 'Orbits',
    formula: 'a_trans = (r₁ + r₂) / 2',
    summary: 'An elliptical bridge tangent to both your starting orbit and target orbit that uses two brief engine burns to minimize fuel.',
    example: 'An Earth-to-Mars Hohmann transfer takes roughly 259 days (~8.5 months) along half of the transfer ellipse.',
    unlockedIn: 'Mars & Moon Pathways',
  },
  {
    id: 'gravity-assist',
    title: 'Gravity Assist (Slingshot)',
    category: 'Orbits',
    formula: 'Δv_helio ≈ 2 · v_∞ · sin(δ / 2)',
    summary: 'Flying close behind a moving planet borrows a tiny fraction of its orbital momentum to speed up your probe without burning fuel.',
    example: 'A Jupiter flyby bends the trajectory and adds several km/s of heliocentric speed for outer-system or interstellar escape.',
    unlockedIn: 'Jupiter & Interstellar',
  },
  {
    id: 'link-budget',
    title: 'Deep-Space Link Budget',
    category: 'Power & Comms',
    formula: 'Rate ∝ (P_tx · G_tx · G_rx) / (4π · d)²',
    summary: 'Radio signals weaken with the square of distance, so faraway missions need bigger high-gain antennas or lower data rates.',
    example: 'At Earth–Jupiter distance (~630–930 million km), a signal takes 35–52 minutes one-way and requires a High-Gain Dish.',
    unlockedIn: 'Comms & Downlink',
  },
  {
    id: 'transit-photometry',
    title: 'Exoplanet Transit Photometry',
    category: 'Science',
    formula: 'ΔF / F ≈ (R_planet / R_star)²',
    summary: 'When an exoplanet crosses in front of its star, it blocks a tiny fraction of starlight proportional to their area ratio.',
    example: 'An Earth-sized planet crossing a Sun-like star dims the star by only ~0.0084% (84 parts per million).',
    unlockedIn: 'Exoplanet Telescope',
  },
  {
    id: 'centripetal-gravity',
    title: 'Artificial Gravity (Centrifuge)',
    category: 'Science',
    formula: 'a = ω² · r',
    summary: 'Spinning a habitat arm creates outward apparent gravity proportional to arm radius and the square of spin rate.',
    example: 'A 10 m arm spinning at 0.43 rad/s (~4.1 rpm) produces ~0.19 g (lunar gravity) for astronaut health research.',
    unlockedIn: 'Crew & Orbit Ops',
  },
];
