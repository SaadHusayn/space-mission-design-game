import { it } from 'vitest';

import { getLaunchVehicle } from '../data/loadData';
import { WINNING_DESIGNS } from './fixtures/designs';
import { createMission } from './mission';
import { reviewDesign } from './review';

it.skipIf(!process.env.BALANCE)('prints the balance report', () => {
  for (const fixture of WINNING_DESIGNS) {
    const mission = createMission(fixture.pathway, fixture.trajectory);
    const result = reviewDesign(fixture.design, mission, getLaunchVehicle(fixture.vehicle));
    const s = result.summary;
    const bad = result.checks.filter((c) => c.status !== 'pass').map((c) => `${c.id}:${c.status}(${c.value} vs ${c.limit})`);
    console.log(
      `${result.go ? 'GO   ' : 'NO-GO'} ${result.grade} ${fixture.name}\n` +
        `   wet ${Math.round(s.wetMass)} kg cap ${Math.round(s.launchCapacity ?? 0)} | dv ${Math.round(s.deltaV)}/${Math.round(s.deltaVRequired * 1.1)} | ` +
        `fuel ${Math.round(s.fuelMass)} | power ${Math.round(s.powerAvailable)}/${Math.round(s.powerLoad * 1.15)} | ` +
        `data ${s.downlinkPerDay.toFixed(3)}/${s.dataPerDay.toFixed(3)} | cost ${Math.round(s.totalCost)}/${mission.budget} | ` +
        `sci ${s.science.toFixed(1)}/${mission.pathway.scienceTarget} | life ${s.designLifeYears.toFixed(1)}/${s.years.toFixed(1)} | ` +
        `health ${s.crewHealth?.toFixed(0) ?? '-'} dose ${Math.round(s.crewDose)}\n   ${bad.join('  ') || 'all pass'}`,
    );
  }
});
