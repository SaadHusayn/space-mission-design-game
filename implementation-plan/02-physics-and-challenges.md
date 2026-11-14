# 02 · Physics Model, Physics Challenges and Engineering Review

> All formulas are standard physics, **simplified for a game** and labelled "Simplified model for learning" in-game.
> Every worked example below was **computed and checked** (SI units; results rounded).
> Implement each section as a **pure, unit-tested function** in `src/game/physics/` ([01](01-tech-architecture.md) §2).

---

## 0. Constants (`physics/constants.ts`)

| Symbol | Value | Note |
|---|---|---|
| g₀ | 9.81 m/s² | Standard gravity |
| GM_Earth | 3.986 × 10¹⁴ m³/s² | R_Earth = 6,371 km |
| GM_Moon | 4.905 × 10¹² | R_Moon = 1,737 km · surface g ≈ 1.62 m/s² |
| GM_Mars | 4.283 × 10¹³ | R_Mars = 3,390 km · surface g ≈ 3.71 m/s² |
| GM_Jupiter | 1.267 × 10¹⁷ | R_Jupiter = 71,492 km (equatorial) · g ≈ 24.8 m/s² |
| GM_Sun | 1.327 × 10²⁰ | |
| AU | 1.496 × 10¹¹ m | Mars 1.52 AU · Jupiter 5.2 AU |
| c | 299,792 km/s | |
| Earth–Moon distance | 384,400 km | |
| Light-year | 63,241 AU | |

---

## 1. Physics topics (formula → example → challenge)

Each challenge is **generated from the player's own spacecraft numbers** where possible. It offers **1 correct answer + 2–3 misconception answers**. **Every answer has a consequence and an explanation**: the game never just says "wrong" (the challenge text asks to teach *why*).

### A. Weight vs thrust: thrust-to-weight ratio (Launch, Prologue/Ch 1)
- `TWR = F_thrust / (m × g₀)`. The rocket lifts off only if TWR > 1. The game requires **≥ 1.2** for a safe margin.
- **Example:** m = 500,000 kg, F = 7,600 kN → weight = 4,905 kN → **TWR ≈ 1.55** ✓.
- **Challenge:** "Your fully loaded rocket weighs ___ kN. Will it lift off?" Options: lifts off (TWR 1.55) · hovers (TWR = 1) · can't lift (thinks weight is in kg) · …
- **Consequence:** TWR < 1.2 → NO-GO, or a slow, gravity-loss-heavy ascent (−Δv).

### B. Rocket equation: Δv budget (Assembly ERB, every chapter)
- `Δv = Isp × g₀ × ln(m₀ / m_f)`
- **Example:** Isp = 350 s, m₀ = 10,000 kg, m_f = 4,000 kg → **Δv ≈ 3,146 m/s (3.1 km/s)**.
- **Typical mission Δv (approximate, from LEO):** trans-lunar injection ≈ 3.1 km/s · lunar orbit insertion ≈ 0.9 km/s · trans-Mars injection ≈ 3.6 km/s · trans-Jupiter (Hohmann) ≈ 6.3 km/s. Reaching LEO from the ground ≈ 9.3–10 km/s including losses.
- **Challenge:** "Adding 1,000 kg of instruments changes your Δv from X to ___". This teaches that **mass costs Δv**.
- **Consequence:** Δv < required + 10% → can't complete the transfer or insertion (ERB fail, or the mission ends in a flyby only).

### C. Orbital speed and **centripetal force** (Ch 1, orbit insertion)
- `v = √(GM / r)` with r = R + altitude. In orbit, **gravity provides the centripetal force**: `F_c = m v² / r = m × g(r)`.
- **Example:** 400 km LEO → **v ≈ 7.67 km/s**. A 2,000 kg spacecraft needs **F_c ≈ 17.4 kN**, exactly its weight at that altitude (g ≈ 8.69 m/s²).
- **Challenge (the team's "centrifugal force" idea, physics-correct):** "What force keeps your 2,000 kg spacecraft in a 400 km orbit?" Options:
  - ✅ **≈ 17.4 kN, gravity acting as centripetal force**
  - ❌ 19.6 kN (uses surface gravity: forgets that gravity weakens with altitude)
  - ❌ 0 N, "astronauts are weightless" (misconception: they're in free fall, not gravity-free)
  - ❌ "the engines push it around" (misconception: no thrust is needed to stay in orbit)
- **Second challenge:** "To orbit at 400 km you must reach ≈ ___ km/s horizontally." Options 7.7 ✓ / 11.2 (escape speed) / 3.1 / 0.5.
- **Consequence:** the correct choice → a clean insertion. Wrong → the game simulates the error (a too-slow burn → the orbit decays and costs a correction burn, −Δv margin), then explains.

### D. Escape velocity (Ch 2–5 intro)
- `v_esc = √(2GM / r)`. Earth's surface → **≈ 11.2 km/s**. Use it to explain why going "beyond" needs more Δv or gravity assists.

### E. Lunar operations (Ch 2)
- Lunar orbit speed at 100 km: **≈ 1.63 km/s**. Surface gravity ≈ 1.62 m/s² (about 1/6 of Earth's). Light delay ≈ **1.3 s** each way.
- **Challenge:** "The lander weighs 15,000 kg. Its weight on the Moon is ___" → 24.3 kN ✓ (vs 147 kN on Earth). This teaches mass vs weight.

### F. Artificial gravity in a spinning habitat: **centrifugal effect** (Ch 3, crewed Mars cruise)
- In the rotating habitat, crew feel an outward (centrifugal) acceleration `a = ω² r`. RPM = `(60 / 2π) × √(a / r)`.
- **Example:** arm radius **85 m**, target Mars gravity 0.38 g (3.73 m/s²) → **≈ 2.0 rpm**. 1 g at 2 rpm needs r ≈ **224 m**. 1 g with a 56 m arm needs ≈ 4.0 rpm.
- Comfort rule (game value): ≤ 2 rpm comfortable · 2–4 rpm "adaptation needed" (motion-sickness risk) · > 4 rpm crew performance penalty.
- **Challenge:** "Your habitat arm is 85 m. What spin rate gives Mars-like gravity?" Options **2 rpm ✓** / 4 rpm / 6 rpm / 0.5 rpm.
- **Trade-off:** a longer arm → more mass (Δv cost) but a lower rpm (crew comfort). No spin → crew bone and muscle loss penalty on arrival (crew health stat).

### G. Jupiter gravity assist (Ch 4, Ch 5a)
- Hyperbolic flyby turn angle: `sin(δ/2) = 1 / (1 + r_p v∞² / GM)`. Velocity change in the Sun's frame: `|Δv| = 2 v∞ sin(δ/2)` (the speed relative to Jupiter is unchanged; the direction rotates).
- **Example (v∞ = 6 km/s):**

  | Closest approach r_p | Turn angle δ | Velocity change |Δv| | Radiation dose (game) |
  |---|---|---|---|
  | 1.5 R_J (very close) | ≈ 152° | **≈ 11.7 km/s** | Extreme |
  | 5 R_J | ≈ 131° | **≈ 10.9 km/s** | High |
  | 20 R_J | ≈ 91° | **≈ 8.6 km/s** | Low |

- **Challenge:** "Choose your flyby altitude." This is a **trade-off choice**, not one right answer: closer = more speed for the outer Solar System, but more radiation. The outcome depends on the **radiation vault** fitted in assembly.
- **Explanation text:** "Jupiter doesn't add energy from nothing. Your spacecraft steals a tiny bit of Jupiter's orbital momentum."

### H. Sunlight: inverse-square law (power: Ch 3–5)
- `P = P_1AU / d²` (d in AU). Mars → **43%**, Jupiter → **3.7%**, Saturn → 1.1%.
- **Example:** a 10 kW array at Earth gives ≈ 430 W at Mars and ≈ 370 W at Jupiter. (Real fact for the "learn more" card: Juno's arrays make ≈ 14 kW at Earth but only ≈ 500 W at Jupiter.)
- **Challenge:** "Your instruments need 600 W at Jupiter. Which power system?" Options: solar array ×2 size (heavy) / **RTG ✓ for beyond Jupiter** / bigger battery (✗, batteries store energy, they don't make it) / the same array (✗).
- **RTG decay:** `P(t) = P₀ × 0.5^(t / 87.7 yr)` (Pu-238). After 20 years ≈ 85% of the initial power (ignoring thermocouple degradation; label it simplified).

### I. Communications: inverse square + light-time delay (all chapters)
- Data rate ∝ antenna gain × power / d² (game: `rate = base_rate × (1 AU / d)²`, clamped).
- One-way light delay = d / c: Moon **1.3 s** · Mars **3–22 min** · Jupiter **33–54 min**.
- **Challenge:** "A hazard is detected at Jupiter. Your command takes ___ to arrive." This teaches why spacecraft need **autonomy** (the onboard computer tier) and why "joystick control" is impossible far away.
- **Consequence:** without the autonomy-capable computer, far-away events resolve worse.

### J. Transfer windows and travel time (Ch 3–5)
- Hohmann transfer time = `π √(a³ / GM_Sun)` with `a = (r₁ + r₂)/2`. Earth→Mars **≈ 259 days**. Earth→Jupiter **≈ 2.7 years**.
- **Challenge:** "Launch now (off-window, +40% Δv) or wait 26 months for the next window (+ops cost)?" A trade-off.

### K. Life support mass (crewed chapters)
- Consumables (game values, approximate): oxygen ≈ 0.8 kg, water ≈ 3 kg, food ≈ 1.8 kg per person per day. Recycling systems cut water/O₂ needs by a set % but cost mass and power.
- **Example:** 4 crew × 500 days × 5.6 kg/day ≈ **11,200 kg** without recycling → ≈ **6,600 kg** with 60% water/O₂ recycling (food isn't recycled: 4 × 500 × (1.8 + 0.4 × 3.8) ≈ 6,640 kg).
- **Challenge:** a choice between more storage mass vs a recycler (mass + power + reliability risk).

### L. Radiation (Ch 3–5)
- Game model: dose = environment rate × exposure time × (1 − shielding factor). Jupiter's belts are extreme. Real fact: Juno protects its electronics inside a ≈ 200 kg titanium **radiation vault**.
- **Consequence:** dose > tolerance → instruments degrade (science ×0.6) or the computer resets (an event).

### M. Thermal (simplified)
- Near the Sun → radiators needed. Far from the Sun → heaters (power) or RTG waste heat. A game check, with no real heat-transfer math in UI challenges.

### N. Beyond: distances and the transit method (Ch 5)
- Heliopause ≈ **120 AU** (Voyager 1 crossed at ≈ 121 AU in 2012). At **7 AU/yr** (the Interstellar Probe concept goal) → **≈ 17 years**. At Voyager's ≈ 3.6 AU/yr → ≈ 33 years.
- Proxima Centauri = 4.24 ly ≈ **268,000 AU** → at 3.6 AU/yr ≈ **74,000 years**. This is why we study exoplanets with **telescopes**.
- **Transit depth** = `(R_planet / R_star)²`:
  - Earth vs Sun: **0.0084%** (very hard to detect)
  - Jupiter vs Sun: **≈ 1%**
  - Earth-size planet vs **TRAPPIST-1** (star ≈ 0.12 R_Sun): **≈ 0.6%**. This is why small stars make it easier to find small planets.
- **Challenge:** "Which star makes an Earth-sized planet easiest to detect by transit?" Options: Sun-like / **small red dwarf ✓** / giant star / "they're all the same".
- Exoplanet worlds shown in 3D (TRAPPIST-1 system, Proxima b) are **artist's impressions built from real parameters** (size, orbit, star colour). Label them that way.

---

## 2. Physics challenge format (data)

```ts
type PhysicsChallenge = {
  id: string;                       // "C-ORBIT-CENTRIPETAL"
  chapter: ChapterId;
  topic: 'twr'|'rocket'|'orbit'|'artificialGravity'|'gravityAssist'|'power'|'comms'|'window'|'lifeSupport'|'radiation'|'transit';
  prompt: (ctx: ChallengeContext) => string;           // uses the player's craft numbers
  formulaHint: string;                                 // "F = m v² / r"
  options: (ctx) => Array<{ id: string; label: string; correct?: boolean; misconception?: string }>;
  kind: 'single-correct' | 'trade-off';                // trade-off = no single right answer (e.g. flyby altitude)
  apply: (ctx, optionId) => Consequence;               // changes Δv, health, science, power, time…
  explain: (ctx, optionId) => string;                  // always shown after answering
  hintLevels: { cadet: 'formula+worked'; engineer: 'formula'; director: 'none' };
};
```

- **UI ("Physics Console"):** givens (from your craft), a formula card (toggle), 3–4 option cards, an optional calculator, a timer only on Flight Director difficulty.
- **Scoring:** correct or smart choices add to **Physics Mastery** (part of the score). Wrong choices are **not** "game over": they cost resources, and the explanation shows the correct reasoning.

---

## 3. Engineering Review Board (ERB): physics-based evaluation of the assembly

Runs after assembly (P05) and before launch. Each check is a pure function → `pass | warn | fail` + an explanation + a fix hint.

| # | Check | Rule (simplified) | Applies to |
|---|---|---|---|
| ERB-1 | **Mass budget** | Total ≤ bus structural limit and ≤ launch vehicle capacity to the target | All |
| ERB-2 | **Δv budget** | Rocket-equation Δv ≥ pathway Δv × 1.1 | All |
| ERB-3 | **Liftoff TWR** | ≥ 1.2 | All |
| ERB-4 | **Power at destination** | Solar × (1/d²) (or RTG(t)) ≥ load × 1.15 | All |
| ERB-5 | **Eclipse energy** | Battery Wh ≥ load × eclipse duration | LEO, Moon, Mars |
| ERB-6 | **Comms link** | Downlink at max distance ≥ data generated. The computer has autonomy if the delay > 5 min. | All |
| ERB-7 | **Thermal** | Radiators (inner) / heaters or RTG (outer) present | All |
| ERB-8 | **Radiation** | Shielding ≥ environment class (Jupiter: vault required) | Ch 3–5 |
| ERB-9 | **Structure / launch loads** | Bus rated for the rocket's max g (for example, 5 g) | All |
| ERB-10 | **Life support** | Consumables + recycling ≥ crew × days × margin 1.1 | Crewed |
| ERB-11 | **Crew health** | Spin rpm in the comfort band, or exercise kit, for cruises > 180 days | Crewed Mars |
| ERB-12 | **Objective fit** | The required instruments are present | All |

- **Outcome:** an **ERB grade** (A–F) per discipline + an overall GO/NO-GO. A **fail** blocks launch. A **warn** allows launch with risk (shown later as consequences).
- **Physics techniques:** players can open a **Design Calculator** (mini-tools: Δv calculator, power-at-distance slider, rpm calculator). Using the tools isn't required, but good designs come from them. This is the "physics techniques we give when building" from the story.

---

## 4. Journey scenario checks (P07)

At each hazard checkpoint, the **built spacecraft is tested** against real conditions (no new design changes allowed, only operational decisions):

| Checkpoint | Spacecraft stats tested | Player decision / physics challenge |
|---|---|---|
| Max-Q during launch | Structure rating, TWR | Throttle-down timing (interactive) |
| Orbit insertion | Δv, attitude control | Centripetal/orbital-speed challenge (C) |
| Eclipse passes | Battery, power | Load-shedding choice |
| Lunar descent (Ch 2, optional landing) | Δv, TWR in lunar g | Weight-on-Moon challenge (E) |
| Deep-space cruise | Life support, spin habitat, radiation | Artificial-gravity challenge (F) |
| Jupiter flyby | Radiation vault, Δv, comms | Gravity-assist trade-off (G), light-delay (I) |
| Solar conjunction (comms blackout) | Autonomy (computer tier) | Pre-program the sequence vs wait |
| Heliopause crossing / exoplanet survey | RTG power(t), comms, telescope aperture | Transit challenge (N) |
