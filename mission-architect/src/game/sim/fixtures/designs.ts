/**
 * Reference designs, used by the balance tests (two different winning
 * designs per pathway, plus designs that should fail) and as example
 * solutions for hints. Keep them in sync with the data files.
 */
import { emptyDesign, type Design, type PathwayId, type SlotId } from '../../types';

export interface DesignFixture {
  name: string;
  pathway: PathwayId;
  trajectory: string;
  vehicle: string;
  design: Design;
}

export function makeDesign(
  busId: string,
  slots: Partial<Record<SlotId, string>>,
  instrumentIds: string[],
  options: Partial<Design['options']> = {},
): Design {
  const design = emptyDesign();
  design.busId = busId;
  for (const [key, value] of Object.entries(slots)) design.slots[key as SlotId] = value;
  design.instrumentIds = instrumentIds;
  design.options = { ...design.options, ...options };
  return design;
}

/** Two different designs per pathway that must both pass every check. */
export const WINNING_DESIGNS: DesignFixture[] = [
  {
    name: 'LEO A: imager on a medium lifter',
    pathway: 'leo',
    trajectory: 'leo_400',
    vehicle: 'lv_medium',
    design: makeDesign(
      'capsule_crew',
      {
        power: 'solar_crew', battery: 'battery_medium', computer: 'computer_standard', adcs: 'adcs_wheels',
        comms: 'comms_sband', propulsion: 'prop_biprop', thermal: 'thermal_basic', lifeSupport: 'ls_stored',
        heatShield: 'shield_leo',
      },
      ['inst_imager'],
      { fuelMass: 520, supplyDays: 6 },
    ),
  },
  {
    name: 'LEO B: higher orbit, cheap avionics, heavy lifter',
    pathway: 'leo',
    trajectory: 'leo_550',
    vehicle: 'lv_heavy',
    design: makeDesign(
      'capsule_crew',
      {
        power: 'solar_crew', battery: 'battery_medium', computer: 'computer_basic', adcs: 'adcs_wheels',
        comms: 'comms_uhf', propulsion: 'prop_biprop', thermal: 'thermal_basic', lifeSupport: 'ls_stored',
        heatShield: 'shield_leo',
      },
      ['inst_imager'],
      { fuelMass: 400, supplyDays: 6 },
    ),
  },
  {
    name: 'Moon A: polar orbit with ice radar',
    pathway: 'moon',
    trajectory: 'moon_polar',
    vehicle: 'lv_heavy',
    design: makeDesign(
      'capsule_crew',
      {
        power: 'solar_crew', battery: 'battery_medium', computer: 'computer_standard', adcs: 'adcs_wheels',
        comms: 'comms_sband', propulsion: 'prop_service', thermal: 'thermal_basic', lifeSupport: 'ls_stored',
        heatShield: 'shield_lunar',
      },
      ['inst_radar'],
      { fuelMass: 9400, supplyDays: 15 },
    ),
  },
  {
    name: 'Moon B: cheaper equatorial orbit, same radar',
    pathway: 'moon',
    trajectory: 'moon_equatorial',
    vehicle: 'lv_heavy',
    design: makeDesign(
      'capsule_crew',
      {
        power: 'solar_crew', battery: 'battery_medium', computer: 'computer_standard', adcs: 'adcs_wheels',
        comms: 'comms_sband', propulsion: 'prop_service', thermal: 'thermal_basic', lifeSupport: 'ls_stored',
        heatShield: 'shield_lunar',
      },
      ['inst_radar'],
      { fuelMass: 7700, supplyDays: 15 },
    ),
  },
  {
    name: 'Mars A: efficient transfer, storm shelter, exercise',
    pathway: 'mars',
    trajectory: 'mars_hohmann',
    vehicle: 'lv_superheavy',
    design: makeDesign(
      'habitat_deep_space',
      {
        power: 'solar_habitat', battery: 'battery_large', computer: 'computer_standard', adcs: 'adcs_wheels',
        comms: 'comms_ka', propulsion: 'prop_methalox', radiation: 'rad_storm_shelter', thermal: 'thermal_basic',
        lifeSupport: 'ls_closed', habitat: 'hab_exercise', heatShield: 'shield_mars',
      },
      ['inst_spectrometer'],
      { fuelMass: 59500, supplyDays: 650 },
    ),
  },
  {
    name: 'Mars B: fast nuclear transfer with a spinning habitat',
    pathway: 'mars',
    trajectory: 'mars_fast',
    vehicle: 'lv_superheavy',
    design: makeDesign(
      'habitat_deep_space',
      {
        power: 'solar_habitat', battery: 'battery_large', computer: 'computer_standard', adcs: 'adcs_wheels',
        comms: 'comms_ka', propulsion: 'prop_nuclear', thermal: 'thermal_basic', lifeSupport: 'ls_closed',
        habitat: 'hab_spin', heatShield: 'shield_mars',
      },
      ['inst_spectrometer'],
      { fuelMass: 30000, supplyDays: 455, spinArmLength: 85 },
    ),
  },
  {
    name: 'Jupiter A: direct, Ka-band, heavy lifter',
    pathway: 'jupiter',
    trajectory: 'jupiter_direct',
    vehicle: 'lv_heavy',
    design: makeDesign(
      'bus_medium',
      {
        power: 'solar_large', battery: 'battery_small', computer: 'computer_standard', adcs: 'adcs_wheels',
        comms: 'comms_ka', propulsion: 'prop_biprop', radiation: 'rad_vault', thermal: 'thermal_heaters',
      },
      ['inst_magnetometer', 'inst_radiometer'],
      { fuelMass: 560 },
    ),
  },
  {
    name: 'Jupiter B: Earth flyby, X-band, medium lifter',
    pathway: 'jupiter',
    trajectory: 'jupiter_ega',
    vehicle: 'lv_medium',
    design: makeDesign(
      'bus_medium',
      {
        power: 'solar_large', battery: 'battery_medium', computer: 'computer_standard', adcs: 'adcs_wheels',
        comms: 'comms_xband', propulsion: 'prop_biprop', radiation: 'rad_vault', thermal: 'thermal_heaters',
      },
      ['inst_magnetometer', 'inst_radiometer'],
      { fuelMass: 760 },
    ),
  },
  {
    name: 'Interstellar A: Jupiter assist, Ka-band',
    pathway: 'interstellar',
    trajectory: 'interstellar_jga',
    vehicle: 'lv_heavy',
    design: makeDesign(
      'bus_small',
      {
        power: 'rtg', computer: 'computer_radhard', adcs: 'adcs_wheels', comms: 'comms_ka',
        propulsion: 'prop_mono', radiation: 'rad_spot', thermal: 'thermal_basic',
      },
      ['inst_plasma'],
      { fuelMass: 125 },
    ),
  },
  {
    name: 'Interstellar B: direct escape, X-band',
    pathway: 'interstellar',
    trajectory: 'interstellar_direct',
    vehicle: 'lv_heavy',
    design: makeDesign(
      'bus_small',
      {
        power: 'rtg', computer: 'computer_radhard', adcs: 'adcs_wheels', comms: 'comms_xband',
        propulsion: 'prop_mono', radiation: 'rad_spot', thermal: 'thermal_basic',
      },
      ['inst_plasma'],
      { fuelMass: 90 },
    ),
  },
  {
    name: 'Exoplanet A: telescope + photometer, direct',
    pathway: 'exoplanet',
    trajectory: 'l2_direct',
    vehicle: 'lv_medium',
    design: makeDesign(
      'bus_medium',
      {
        power: 'solar_medium', battery: 'battery_medium', computer: 'computer_standard', adcs: 'adcs_precision',
        comms: 'comms_xband', propulsion: 'prop_mono', thermal: 'thermal_basic',
      },
      ['inst_telescope', 'inst_photometer'],
      { fuelMass: 90 },
    ),
  },
  {
    name: 'Exoplanet B: cooled telescope, lunar flyby',
    pathway: 'exoplanet',
    trajectory: 'l2_lunar',
    vehicle: 'lv_medium',
    design: makeDesign(
      'bus_medium',
      {
        power: 'solar_small', battery: 'battery_medium', computer: 'computer_standard', adcs: 'adcs_precision',
        comms: 'comms_sband', propulsion: 'prop_mono', thermal: 'thermal_sunshield',
      },
      ['inst_telescope'],
      { fuelMass: 60 },
    ),
  },
];
