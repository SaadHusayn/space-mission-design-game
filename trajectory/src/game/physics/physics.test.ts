import { describe, expect, it } from 'vitest';

import {
  AU,
  BODIES,
  DAYS_PER_YEAR,
  G0,
  LIGHT_YEAR_AU,
  SECONDS_PER_DAY,
  accumulatedDose,
  captureDeltaV,
  centripetalForce,
  consumablesMass,
  consumablesPerPersonDay,
  dataPerDayGb,
  deltaV,
  downlinkRateMbps,
  escapeVelocity,
  flybyDeltaV,
  flybyTurnAngle,
  gravityAt,
  hohmannTransferTime,
  lightDelaySeconds,
  massRatioFor,
  orbitSpeedAtAltitude,
  propellantFor,
  rtgPower,
  solarPowerAt,
  spinAcceleration,
  spinComfort,
  spinRadius,
  spinRpm,
  sunlightFraction,
  surfaceGravity,
  thrustToWeight,
  transitDepth,
} from './index';

const { earth, moon, mars, jupiter, sun } = BODIES;
const deg = (rad: number) => (rad * 180) / Math.PI;

// Every number below is a worked example from
// implementation-plan/02-physics-and-challenges.md.

describe('A. thrust-to-weight', () => {
  it('500 t rocket with 7,600 kN of thrust has TWR ≈ 1.55', () => {
    expect(thrustToWeight(7.6e6, 500_000)).toBeCloseTo(1.549, 2);
  });
  it('is below 1 when the rocket is too heavy, and 0 for nonsense input', () => {
    expect(thrustToWeight(4e6, 500_000)).toBeLessThan(1);
    expect(thrustToWeight(1e6, 0)).toBe(0);
  });
  it('uses local gravity when given', () => {
    expect(thrustToWeight(45_000, 15_000, surfaceGravity(moon))).toBeGreaterThan(1.8);
  });
});

describe('B. rocket equation', () => {
  it('Isp 350 s, 10 t → 4 t gives Δv ≈ 3,146 m/s', () => {
    expect(deltaV(350, 10_000, 4_000)).toBeCloseTo(3146, 0);
  });
  it('gives 0 with no propellant or invalid masses', () => {
    expect(deltaV(350, 4_000, 4_000)).toBe(0);
    expect(deltaV(350, 3_000, 4_000)).toBe(0);
    expect(deltaV(0, 10_000, 4_000)).toBe(0);
  });
  it('mass ratio and propellant are the inverse of Δv', () => {
    const dv = deltaV(320, 10_000, 4_000);
    expect(massRatioFor(dv, 320)).toBeCloseTo(2.5, 6);
    expect(propellantFor(dv, 320, 4_000)).toBeCloseTo(6_000, 3);
  });
  it('more payload mass means less Δv', () => {
    expect(deltaV(350, 11_000, 5_000)).toBeLessThan(deltaV(350, 10_000, 4_000));
  });
});

describe('C. orbital speed and centripetal force', () => {
  const r = earth.radius + 400e3;
  const v = orbitSpeedAtAltitude(earth, 400e3);
  it('400 km low Earth orbit: v ≈ 7.67 km/s', () => {
    expect(v).toBeCloseTo(7672.6, 0);
  });
  it('2,000 kg spacecraft needs ≈ 17.4 kN, which is exactly its weight up there', () => {
    const force = centripetalForce(2000, v, r);
    expect(force).toBeCloseTo(17_388, -1);
    expect(force).toBeCloseTo(2000 * gravityAt(earth.gm, r), 6);
    expect(gravityAt(earth.gm, r)).toBeCloseTo(8.694, 2);
    expect(force).toBeLessThan(2000 * G0);
  });
});

describe('D. escape velocity', () => {
  it('Earth surface ≈ 11.2 km/s, and √2 times the circular speed', () => {
    expect(escapeVelocity(earth.gm, earth.radius)).toBeCloseTo(11_186, 0);
    expect(escapeVelocity(earth.gm, earth.radius + 400e3) / orbitSpeedAtAltitude(earth, 400e3)).toBeCloseTo(Math.SQRT2, 9);
  });
});

describe('E. Moon, Mars, Jupiter', () => {
  it('surface gravity', () => {
    expect(surfaceGravity(moon)).toBeCloseTo(1.626, 2);
    expect(surfaceGravity(mars)).toBeCloseTo(3.727, 2);
    expect(surfaceGravity(jupiter)).toBeCloseTo(24.79, 1);
  });
  it('100 km lunar orbit ≈ 1.63 km/s, 300 km Mars orbit ≈ 3.41 km/s', () => {
    expect(orbitSpeedAtAltitude(moon, 100e3)).toBeCloseTo(1634, 0);
    expect(orbitSpeedAtAltitude(mars, 300e3)).toBeCloseTo(3407, 0);
  });
  it('a 15,000 kg lander weighs ≈ 24.4 kN on the Moon and ≈ 147 kN on Earth', () => {
    expect((15_000 * surfaceGravity(moon)) / 1000).toBeCloseTo(24.4, 0);
    expect((15_000 * G0) / 1000).toBeCloseTo(147.2, 0);
  });
});

describe('F. artificial gravity', () => {
  it('85 m arm at Mars gravity (3.73 m/s²) needs ≈ 2.0 rpm', () => {
    expect(spinRpm(3.73, 85)).toBeCloseTo(2.0, 2);
  });
  it('1 g at 2 rpm needs ≈ 224 m; 1 g on a 56 m arm needs ≈ 4.0 rpm', () => {
    expect(spinRadius(G0, 2)).toBeCloseTo(223.6, 0);
    expect(spinRpm(G0, 56)).toBeCloseTo(4.0, 1);
  });
  it('acceleration is the inverse of rpm', () => {
    expect(spinAcceleration(spinRpm(3.73, 85), 85)).toBeCloseTo(3.73, 9);
    expect(spinRpm(0, 85)).toBe(0);
  });
  it('comfort bands', () => {
    expect(spinComfort(2)).toBe('comfortable');
    expect(spinComfort(3.9)).toBe('adaptation');
    expect(spinComfort(6)).toBe('uncomfortable');
  });
});

describe('G. Jupiter gravity assist', () => {
  const cases: [number, number, number][] = [
    [1.5, 152.4, 11.65],
    [5, 130.9, 10.92],
    [20, 91.4, 8.59],
  ];
  it.each(cases)('closest approach %d R_J: turn ≈ %d°, Δv ≈ %d km/s', (radii, turn, dv) => {
    const periapsis = radii * 6.9911e7; // the doc's examples use Jupiter's mean radius
    expect(deg(flybyTurnAngle(jupiter.gm, 6000, periapsis))).toBeCloseTo(turn, 0);
    expect(flybyDeltaV(jupiter.gm, 6000, periapsis) / 1000).toBeCloseTo(dv, 1);
  });
  it('a closer flyby always bends the path more', () => {
    const close = flybyDeltaV(jupiter.gm, 6000, 2 * jupiter.radius);
    const far = flybyDeltaV(jupiter.gm, 6000, 10 * jupiter.radius);
    expect(close).toBeGreaterThan(far);
    expect(close).toBeLessThanOrEqual(2 * 6000);
  });
  it('braking into orbit is cheaper closer in (Oberth effect)', () => {
    const apoapsis = 100 * jupiter.radius;
    const close = captureDeltaV(jupiter.gm, 5640, 1.5 * jupiter.radius, apoapsis);
    const mid = captureDeltaV(jupiter.gm, 5640, 5 * jupiter.radius, apoapsis);
    const far = captureDeltaV(jupiter.gm, 5640, 20 * jupiter.radius, apoapsis);
    expect(close).toBeLessThan(mid);
    expect(mid).toBeLessThan(far);
    expect(close).toBeGreaterThan(500);
    expect(far).toBeLessThan(2600);
  });
});

describe('H. sunlight and generators', () => {
  it('Mars gets 43%, Jupiter 3.7%, Saturn 1.1% of Earth-level sunlight', () => {
    expect(sunlightFraction(1.524)).toBeCloseTo(0.4306, 3);
    expect(sunlightFraction(5.2)).toBeCloseTo(0.037, 3);
    expect(sunlightFraction(9.54)).toBeCloseTo(0.011, 3);
  });
  it('a 10 kW array gives ≈ 430 W at Mars and ≈ 370 W at Jupiter', () => {
    expect(solarPowerAt(10_000, 1.524)).toBeCloseTo(4306, 0);
    expect(solarPowerAt(10_000, 5.2)).toBeCloseTo(370, 0);
    expect(solarPowerAt(10_000, 0)).toBe(0);
  });
  it('a plutonium generator keeps ≈ 85% of its power after 20 years', () => {
    expect(rtgPower(100, 20)).toBeCloseTo(85.4, 1);
    expect(rtgPower(100, 87.7)).toBeCloseTo(50, 6);
    expect(rtgPower(100, 0)).toBe(100);
  });
});

describe('I. communications', () => {
  it('light delay: Moon 1.3 s, Mars 3–22 min, Jupiter 33–54 min', () => {
    expect(lightDelaySeconds(3.844e8 / AU)).toBeCloseTo(1.28, 2);
    expect(lightDelaySeconds(5.46e10 / AU) / 60).toBeCloseTo(3.04, 1);
    expect(lightDelaySeconds(4.01e11 / AU) / 60).toBeCloseTo(22.3, 1);
    expect(lightDelaySeconds(5.88e11 / AU) / 60).toBeCloseTo(32.7, 1);
    expect(lightDelaySeconds(9.68e11 / AU) / 60).toBeCloseTo(53.8, 1);
  });
  it('data rate falls with distance squared and is capped near Earth', () => {
    expect(downlinkRateMbps(2, 150, 1)).toBe(2);
    expect(downlinkRateMbps(2, 150, 2)).toBeCloseTo(0.5, 9);
    expect(downlinkRateMbps(2, 150, 0.001)).toBe(150);
    expect(downlinkRateMbps(2, 150, 0)).toBe(150);
  });
  it('1 Mbps for 8 hours is 28.8 Gb', () => {
    expect(dataPerDayGb(1, 8)).toBeCloseTo(28.8, 9);
  });
});

describe('J. transfer times', () => {
  it('Earth → Mars Hohmann ≈ 259 days; Earth → Jupiter ≈ 2.7 years', () => {
    expect(hohmannTransferTime(AU, 1.524 * AU, sun.gm) / SECONDS_PER_DAY).toBeCloseTo(259, 0);
    expect(hohmannTransferTime(AU, 5.2 * AU, sun.gm) / SECONDS_PER_DAY / DAYS_PER_YEAR).toBeCloseTo(2.73, 1);
  });
});

describe('K. life support', () => {
  it('4 crew for 500 days need ≈ 11,200 kg, or ≈ 6,640 kg with 60% recycling', () => {
    expect(consumablesMass(4, 500)).toBeCloseTo(11_200, 6);
    expect(consumablesMass(4, 500, 0.6)).toBeCloseTo(6_640, 6);
    expect(consumablesPerPersonDay(1)).toBeCloseTo(1.8, 9);
  });
});

describe('L. radiation', () => {
  it('dose scales with time and shielding', () => {
    expect(accumulatedDose(1.8, 259)).toBeCloseTo(466.2, 6);
    expect(accumulatedDose(50, 400, 0.998)).toBeCloseTo(40, 6);
    expect(accumulatedDose(1, 10, 2)).toBe(0);
  });
});

describe('N. beyond the Solar System', () => {
  it('heliopause at 120 AU: ≈ 17 years at 7 AU/yr, ≈ 33 years at 3.6 AU/yr', () => {
    expect(120 / 7).toBeCloseTo(17.1, 1);
    expect(120 / 3.6).toBeCloseTo(33.3, 1);
  });
  it('Proxima Centauri is ≈ 268,000 AU away: ≈ 74,000 years at 3.6 AU/yr', () => {
    expect(4.24 * LIGHT_YEAR_AU).toBeCloseTo(268_142, 0);
    expect((4.24 * LIGHT_YEAR_AU) / 3.6).toBeCloseTo(74_484, 0);
  });
  it('transit depth: Earth–Sun 0.0084%, Jupiter–Sun ≈ 1%, Earth–TRAPPIST-1 ≈ 0.6%', () => {
    expect(transitDepth(6371, 696_000) * 100).toBeCloseTo(0.0084, 4);
    expect(transitDepth(69_911, 696_000) * 100).toBeCloseTo(1.009, 2);
    expect(transitDepth(6371, 0.119 * 696_000) * 100).toBeCloseTo(0.592, 2);
    expect(transitDepth(1, 0)).toBe(0);
  });
});
