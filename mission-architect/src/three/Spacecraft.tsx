'use client';

import type { ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';
import { DoubleSide } from 'three';

import { resolveDesign } from '@/game';
import type {
  Adcs,
  Battery,
  Bus,
  Comms,
  Computer,
  Design,
  Habitat,
  HeatShield,
  Instrument,
  LifeSupport,
  PowerSource,
  Propulsion,
  RadiationShield,
  SlotId,
  Thermal,
} from '@/game/types';
import type { AssemblyTarget } from '@/scenes/Hangar/assemblyStore';

export interface SocketLayout {
  target: AssemblyTarget;
  name: string;
  position: [number, number, number];
  explodeOffset: [number, number, number];
}

/** Socket positions around the spacecraft bus, scaled to the chosen bus size. */
export function getSocketLayouts(bus: Bus | null, exploded = false): Record<AssemblyTarget, SocketLayout> {
  const halfW = bus?.id === 'habitat_deep_space' ? 1.5 : bus?.id === 'capsule_crew' ? 1.15 : bus?.id === 'bus_large' ? 1.0 : bus?.id === 'bus_medium' ? 0.75 : 0.55;
  const halfH = bus?.id === 'habitat_deep_space' ? 1.9 : bus?.id === 'capsule_crew' ? 1.1 : bus?.id === 'bus_large' ? 1.1 : bus?.id === 'bus_medium' ? 0.85 : 0.65;

  const base: Record<AssemblyTarget, Omit<SocketLayout, 'target'>> = {
    bus: { name: 'socket_bus', position: [0, 0, 0], explodeOffset: [0, 0, 0] },
    power: { name: 'socket_power', position: [0, 0.1, 0], explodeOffset: [0, 0.35, 0] },
    battery: { name: 'socket_battery', position: [-halfW * 0.65, -halfH * 0.35, halfW * 0.55], explodeOffset: [-0.7, -0.2, 0.6] },
    computer: { name: 'socket_computer', position: [halfW * 0.65, halfH * 0.35, halfW * 0.55], explodeOffset: [0.7, 0.3, 0.6] },
    adcs: { name: 'socket_adcs', position: [0, 0.1, -halfW * 0.85], explodeOffset: [0, 0.1, -0.9] },
    comms: { name: 'socket_comms', position: [0, halfH + 0.05, 0], explodeOffset: [0, 0.95, 0] },
    propulsion: { name: 'socket_propulsion', position: [0, -halfH - 0.05, 0], explodeOffset: [0, -0.95, 0] },
    radiation: { name: 'socket_radiation', position: [-halfW * 0.85, 0.15, 0], explodeOffset: [-0.95, 0.15, 0] },
    thermal: { name: 'socket_thermal', position: [halfW * 0.85, -0.15, 0], explodeOffset: [0.95, -0.15, 0] },
    lifeSupport: { name: 'socket_lifeSupport', position: [0, -halfH * 0.25, -halfW * 0.78], explodeOffset: [0, -0.35, -0.95] },
    habitat: { name: 'socket_habitat', position: [0, halfH * 0.45, -halfW * 0.65], explodeOffset: [0, 0.55, -0.85] },
    heatShield: { name: 'socket_heatShield', position: [0, -halfH - 0.55, 0], explodeOffset: [0, -1.35, 0] },
    instruments: { name: 'socket_instrument_1', position: [0, -0.1, halfW + 0.12], explodeOffset: [0, 0, 1.05] },
  };

  const factor = exploded ? 1 : 0;
  const result = {} as Record<AssemblyTarget, SocketLayout>;
  for (const key of Object.keys(base) as AssemblyTarget[]) {
    const item = base[key];
    result[key] = {
      target: key,
      name: item.name,
      position: [
        item.position[0] + item.explodeOffset[0] * factor,
        item.position[1] + item.explodeOffset[1] * factor,
        item.position[2] + item.explodeOffset[2] * factor,
      ],
      explodeOffset: item.explodeOffset,
    };
  }
  return result;
}

interface HighlightProps {
  active: boolean;
  hovered: boolean;
}

function emissiveFor(baseEmissive: string, baseIntensity: number, { active, hovered }: HighlightProps): { emissive: string; emissiveIntensity: number } {
  if (active) return { emissive: '#5ce1ff', emissiveIntensity: Math.max(0.4, baseIntensity) };
  if (hovered) return { emissive: '#38bdf8', emissiveIntensity: Math.max(0.24, baseIntensity) };
  return { emissive: baseEmissive, emissiveIntensity: baseIntensity };
}

function BusMesh({ bus, highlight }: { bus: Bus | null; highlight: HighlightProps }) {
  const em = emissiveFor('#000000', 0, highlight);
  if (!bus) {
    // Wireframe ghost cradle frame when no bus is selected yet
    return (
      <mesh name="part_bus_empty">
        <boxGeometry args={[1.1, 1.3, 1.1]} />
        <meshStandardMaterial color="#5ce1ff" wireframe transparent opacity={0.35} {...em} />
      </mesh>
    );
  }

  if (bus.id === 'capsule_crew') {
    return (
      <group name={`part_${bus.id}`}>
        <mesh name="part_bus_capsule" castShadow receiveShadow position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.58, 1.22, 1.65, 32]} />
          <meshStandardMaterial color="#eef2f8" metalness={0.25} roughness={0.42} {...em} />
        </mesh>
        <mesh name="part_bus_window" position={[0, 0.35, 0.88]} rotation={[-0.38, 0, 0]}>
          <boxGeometry args={[0.42, 0.22, 0.08]} />
          <meshStandardMaterial color="#0f253e" metalness={0.9} roughness={0.12} emissive="#38bdf8" emissiveIntensity={0.25} />
        </mesh>
        <mesh name="part_bus_collar" position={[0, 0.98, 0]}>
          <cylinderGeometry args={[0.45, 0.55, 0.16, 24]} />
          <meshStandardMaterial color="#6e7a8a" metalness={0.8} roughness={0.35} {...em} />
        </mesh>
      </group>
    );
  }

  if (bus.id === 'habitat_deep_space') {
    return (
      <group name={`part_${bus.id}`}>
        <mesh name="part_bus_hab_core" castShadow receiveShadow>
          <cylinderGeometry args={[1.45, 1.45, 3.4, 36]} />
          <meshStandardMaterial color="#e4eaf2" metalness={0.3} roughness={0.45} {...em} />
        </mesh>
        {[-1.1, 0, 1.1].map((y) => (
          <mesh key={y} name="part_bus_hab_ring" position={[0, y, 0]}>
            <cylinderGeometry args={[1.5, 1.5, 0.16, 36]} />
            <meshStandardMaterial color="#8592a6" metalness={0.75} roughness={0.35} {...em} />
          </mesh>
        ))}
        <mesh name="part_bus_hab_cupola" position={[0, 0.6, 1.46]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.38, 0.45, 0.15, 20]} />
          <meshStandardMaterial color="#183654" metalness={0.9} roughness={0.15} emissive="#5ce1ff" emissiveIntensity={0.3} />
        </mesh>
      </group>
    );
  }

  const dims: [number, number, number] =
    bus.id === 'bus_large' ? [1.75, 2.05, 1.75] : bus.id === 'bus_medium' ? [1.35, 1.6, 1.35] : [0.95, 1.15, 0.95];

  return (
    <group name={`part_${bus.id}`}>
      <mesh name="part_bus_body" castShadow receiveShadow>
        <boxGeometry args={dims} />
        <meshStandardMaterial color="#dba335" metalness={0.68} roughness={0.38} {...em} />
      </mesh>
      <mesh name="part_bus_band" position={[0, dims[1] * 0.26, 0]}>
        <boxGeometry args={[dims[0] + 0.05, 0.12, dims[2] + 0.05]} />
        <meshStandardMaterial color="#96a2b4" metalness={0.9} roughness={0.32} {...em} />
      </mesh>
    </group>
  );
}

function PowerMesh({ power, bus, highlight }: { power: PowerSource; bus: Bus | null; highlight: HighlightProps }) {
  const halfW = bus?.id === 'habitat_deep_space' ? 1.5 : bus?.id === 'capsule_crew' ? 1.15 : bus?.id === 'bus_large' ? 0.9 : bus?.id === 'bus_medium' ? 0.7 : 0.5;
  if (power.source === 'rtg') {
    const em = emissiveFor('#ff5a1f', 0.55, highlight);
    return (
      <group name={`part_${power.id}`} position={[halfW + 0.55, 0, 0]} rotation={[0, 0, -Math.PI / 3]}>
        <mesh name="part_power_rtg_boom" position={[-0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 12]} />
          <meshStandardMaterial color="#7b8798" metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh name="part_power_rtg_core" castShadow>
          <cylinderGeometry args={[0.18, 0.2, 0.95, 20]} />
          <meshStandardMaterial color="#2a2d35" metalness={0.6} roughness={0.45} {...em} />
        </mesh>
        {[0, 1, 2, 3].map((idx) => (
          <mesh key={idx} name="part_power_rtg_fin" rotation={[0, (idx * Math.PI) / 4, 0]}>
            <boxGeometry args={[0.56, 0.82, 0.03]} />
            <meshStandardMaterial color="#3c424f" metalness={0.5} roughness={0.5} {...em} />
          </mesh>
        ))}
      </group>
    );
  }

  const em = emissiveFor('#0a2463', 0.12, highlight);
  const span =
    power.id === 'solar_habitat'
      ? 3.8
      : power.id === 'solar_crew'
        ? 3.1
        : power.id === 'solar_large'
          ? 2.8
          : power.id === 'solar_medium'
            ? 2.0
            : 1.25;
  const chord = power.id === 'solar_habitat' ? 1.35 : power.id === 'solar_large' || power.id === 'solar_crew' ? 1.05 : 0.72;

  return (
    <group name={`part_${power.id}`}>
      {([-1, 1] as const).map((side) => {
        const tag = side < 0 ? 'left' : 'right';
        const boomX = side * (halfW + 0.25);
        const wingX = side * (halfW + 0.45 + span / 2);
        return (
          <group key={tag}>
            <mesh name={`part_boom_${tag}`} position={[boomX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, 0.5, 12]} />
              <meshStandardMaterial color="#9aa6b8" metalness={0.85} roughness={0.35} />
            </mesh>
            <mesh name={`part_solar_${tag}`} position={[wingX, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[span, 0.04, chord]} />
              <meshStandardMaterial color="#122b7a" metalness={0.55} roughness={0.25} {...em} />
            </mesh>
            <mesh name={`part_solar_frame_${tag}`} position={[wingX, 0, 0]}>
              <boxGeometry args={[span + 0.05, 0.025, 0.06]} />
              <meshStandardMaterial color="#9aa6b8" metalness={0.85} roughness={0.35} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function BatteryMesh({ battery, highlight }: { battery: Battery; highlight: HighlightProps }) {
  const em = emissiveFor('#22c55e', 0.15, highlight);
  const scale = battery.id === 'battery_large' ? 1.35 : battery.id === 'battery_medium' ? 1.05 : 0.8;
  return (
    <group name={`part_${battery.id}`} scale={scale}>
      <mesh name="part_battery_pack" castShadow>
        <boxGeometry args={[0.36, 0.24, 0.26]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} {...em} />
      </mesh>
      {[-0.1, 0, 0.1].map((x) => (
        <mesh key={x} name="part_battery_cell" position={[x, 0.13, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.05, 12]} />
          <meshStandardMaterial color="#4cf0a0" emissive="#4cf0a0" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function ComputerMesh({ computer, highlight }: { computer: Computer; highlight: HighlightProps }) {
  const em = emissiveFor('#5ce1ff', 0.25, highlight);
  const radHard = computer.id === 'computer_radhard';
  return (
    <group name={`part_${computer.id}`}>
      <mesh name="part_computer_chassis" castShadow>
        <boxGeometry args={[0.32, 0.22, 0.2]} />
        <meshStandardMaterial color={radHard ? '#eab308' : '#334155'} metalness={0.75} roughness={0.3} {...em} />
      </mesh>
      <mesh name="part_status_light" position={[0, 0, 0.11]}>
        <boxGeometry args={[0.2, 0.05, 0.02]} />
        <meshStandardMaterial color="#5ce1ff" emissive="#5ce1ff" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function AdcsMesh({ adcs, highlight }: { adcs: Adcs; highlight: HighlightProps }) {
  const em = emissiveFor('#fbbf24', 0.15, highlight);
  if (adcs.id === 'adcs_magnetorquer') {
    return (
      <group name={`part_${adcs.id}`}>
        {[-0.12, 0, 0.12].map((y, idx) => (
          <mesh key={idx} name="part_adcs_rod" position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.55, 12]} />
            <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.3} {...em} />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <group name={`part_${adcs.id}`}>
      <mesh name="part_adcs_housing" castShadow>
        <octahedronGeometry args={[0.24, 1]} />
        <meshStandardMaterial color="#64748b" metalness={0.75} roughness={0.32} {...em} />
      </mesh>
      {adcs.id === 'adcs_precision' && (
        <mesh name="part_adcs_tracker" position={[0, 0.18, -0.18]} rotation={[-Math.PI / 3, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.05, 0.22, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.3} {...em} />
        </mesh>
      )}
    </group>
  );
}

function CommsMesh({ comms, highlight }: { comms: Comms; highlight: HighlightProps }) {
  const em = emissiveFor('#e2e8f0', 0.1, highlight);
  if (comms.id === 'comms_uhf') {
    return (
      <group name={`part_${comms.id}`}>
        <mesh name="part_antenna_whip" position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.015, 0.025, 0.7, 10]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.25} {...em} />
        </mesh>
      </group>
    );
  }
  const radius = comms.id === 'comms_ka' ? 0.92 : comms.id === 'comms_xband' ? 0.68 : 0.38;
  const dishColor = comms.id === 'comms_ka' ? '#f8fafc' : '#e2e8f0';
  return (
    <group name={`part_${comms.id}`}>
      <mesh name="part_antenna_mast" position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.4, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.35} />
      </mesh>
      <mesh name="part_antenna_dish" position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[radius, 0.1, 0.26, 36, 1, true]} />
        <meshStandardMaterial color={dishColor} metalness={0.2} roughness={0.45} side={DoubleSide} {...em} />
      </mesh>
      <mesh name="part_antenna_feed" position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.38, 10]} />
        <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

function PropulsionMesh({ propulsion, fuelRatio, highlight }: { propulsion: Propulsion; fuelRatio: number; highlight: HighlightProps }) {
  const em = emissiveFor('#38bdf8', 0.1, highlight);
  const tankScale = 0.75 + 0.45 * Math.min(1, Math.max(0, fuelRatio));
  const radius =
    propulsion.id === 'prop_nuclear'
      ? 0.68
      : propulsion.id === 'prop_methalox'
        ? 0.62
        : propulsion.id === 'prop_service'
          ? 0.52
          : propulsion.id === 'prop_biprop'
            ? 0.32
            : 0.2;
  const height =
    propulsion.id === 'prop_nuclear'
      ? 1.15
      : propulsion.id === 'prop_methalox'
        ? 0.95
        : propulsion.id === 'prop_service'
          ? 0.75
          : 0.42;

  return (
    <group name={`part_${propulsion.id}`}>
      <mesh name="part_prop_tank" position={[0, -height * 0.45, 0]} scale={[1, tankScale, 1]} castShadow>
        <cylinderGeometry args={[radius, radius * 0.95, height, 28]} />
        <meshStandardMaterial
          color={propulsion.id === 'prop_nuclear' ? '#eab308' : '#cbd5e1'}
          metalness={0.65}
          roughness={0.35}
          {...em}
        />
      </mesh>
      <mesh name="part_thruster" position={[0, -height * 0.95 - 0.18, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.35, radius * 0.75, 0.42, 24, 1, true]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.4} side={DoubleSide} {...em} />
      </mesh>
    </group>
  );
}

function RadiationMesh({ radiation, highlight }: { radiation: RadiationShield; highlight: HighlightProps }) {
  const em = emissiveFor('#94a3b8', 0.15, highlight);
  const isVault = radiation.id === 'rad_vault';
  const isCrew = radiation.id === 'rad_storm_shelter' || radiation.id === 'rad_hull';
  return (
    <group name={`part_${radiation.id}`}>
      <mesh name="part_rad_shield" castShadow>
        <boxGeometry args={isCrew ? [0.42, 0.75, 0.65] : isVault ? [0.48, 0.48, 0.48] : [0.28, 0.32, 0.28]} />
        <meshStandardMaterial
          color={isVault ? '#7c8ba1' : isCrew ? '#38bdf8' : '#94a3b8'}
          metalness={isVault ? 0.9 : 0.4}
          roughness={0.3}
          {...em}
        />
      </mesh>
    </group>
  );
}

function ThermalMesh({ thermal, highlight }: { thermal: Thermal; highlight: HighlightProps }) {
  const em = emissiveFor('#f59e0b', 0.15, highlight);
  if (thermal.id === 'thermal_sunshield') {
    return (
      <group name={`part_${thermal.id}`} position={[0, -0.35, 0]}>
        <mesh name="part_thermal_sunshield" rotation={[0.1, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.1, 2.25, 0.05, 6]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.2} {...em} />
        </mesh>
      </group>
    );
  }
  return (
    <group name={`part_${thermal.id}`}>
      <mesh name="part_thermal_radiator" castShadow>
        <boxGeometry args={[0.08, 0.68, 0.52]} />
        <meshStandardMaterial color={thermal.id === 'thermal_heaters' ? '#f59e0b' : '#f8fafc'} metalness={0.4} roughness={0.4} {...em} />
      </mesh>
    </group>
  );
}

function LifeSupportMesh({ lifeSupport, highlight }: { lifeSupport: LifeSupport; highlight: HighlightProps }) {
  const em = emissiveFor('#38bdf8', 0.15, highlight);
  const count = lifeSupport.id === 'ls_closed' ? 3 : lifeSupport.id === 'ls_recycler' ? 2 : 1;
  return (
    <group name={`part_${lifeSupport.id}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <mesh key={idx} name="part_ls_tank" position={[(idx - (count - 1) / 2) * 0.22, 0, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.34, 8, 16]} />
          <meshStandardMaterial color="#38bdf8" metalness={0.5} roughness={0.35} {...em} />
        </mesh>
      ))}
    </group>
  );
}

function HabitatMesh({ habitat, spinArmLength, highlight }: { habitat: Habitat; spinArmLength: number; highlight: HighlightProps }) {
  const em = emissiveFor('#a855f7', 0.15, highlight);
  if (habitat.kind === 'spin') {
    // Visual representation scaled proportionally to spinArmLength (clamped for hangar fit)
    const visualArm = 1.4 + Math.min(2.6, Math.max(0.4, spinArmLength / 45));
    return (
      <group name={`part_${habitat.id}`}>
        <mesh name="part_hab_spin_arm" position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, visualArm * 2, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.35} {...em} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <mesh key={side} name="part_hab_spin_pod" position={[side * visualArm, 0.35, 0]} castShadow>
            <capsuleGeometry args={[0.28, 0.48, 12, 20]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.4} {...em} />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <group name={`part_${habitat.id}`}>
      <mesh name="part_hab_exercise" castShadow>
        <torusGeometry args={[0.26, 0.06, 12, 28]} />
        <meshStandardMaterial color="#c084fc" metalness={0.5} roughness={0.35} {...em} />
      </mesh>
    </group>
  );
}

function HeatShieldMesh({ heatShield, highlight }: { heatShield: HeatShield; highlight: HighlightProps }) {
  const em = emissiveFor('#ef4444', 0.12, highlight);
  const radius = heatShield.id === 'shield_mars' ? 1.55 : heatShield.id === 'shield_lunar' ? 1.32 : 1.18;
  const color = heatShield.id === 'shield_mars' ? '#451a03' : heatShield.id === 'shield_lunar' ? '#7c2d12' : '#334155';
  return (
    <group name={`part_${heatShield.id}`}>
      <mesh name="part_heat_shield" castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 0.72, 0.24, 36]} />
        <meshStandardMaterial color={color} metalness={0.25} roughness={0.7} {...em} />
      </mesh>
    </group>
  );
}

function InstrumentsMesh({ instruments, highlight }: { instruments: Instrument[]; highlight: HighlightProps }) {
  const em = emissiveFor('#c084fc', 0.2, highlight);
  return (
    <group name="part_instruments_bay">
      {instruments.map((inst, idx) => {
        const offsetX = (idx - (instruments.length - 1) / 2) * 0.44;
        if (inst.type === 'telescope' || inst.type === 'photometer') {
          return (
            <group key={inst.id} name={`part_${inst.id}`} position={[offsetX, 0, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh name={`part_instrument_${inst.id}`} castShadow>
                <cylinderGeometry args={[inst.type === 'telescope' ? 0.28 : 0.18, inst.type === 'telescope' ? 0.28 : 0.18, 0.85, 24]} />
                <meshStandardMaterial color="#f1f5f9" metalness={0.35} roughness={0.4} {...em} />
              </mesh>
            </group>
          );
        }
        if (inst.type === 'radar' || inst.type === 'magnetometer' || inst.type === 'plasma') {
          return (
            <group key={inst.id} name={`part_${inst.id}`} position={[offsetX, 0, 0.35]}>
              <mesh name={`part_instrument_${inst.id}`} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.9, 12]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.3} {...em} />
              </mesh>
            </group>
          );
        }
        return (
          <group key={inst.id} name={`part_${inst.id}`} position={[offsetX, 0, 0.2]}>
            <mesh name={`part_instrument_${inst.id}`} castShadow>
              <boxGeometry args={[0.28, 0.24, 0.32]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.35} {...em} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export interface SpacecraftProps {
  design: Design;
  selectedTarget: AssemblyTarget;
  hoveredTarget: AssemblyTarget | null;
  exploded?: boolean;
  applicableSlots?: ReadonlySet<SlotId>;
  onSelectTarget?: (target: AssemblyTarget) => void;
  onHoverTarget?: (target: AssemblyTarget | null) => void;
  position?: [number, number, number];
}

/**
 * Procedural 3D spacecraft assembled live from `Design`.
 * Follows the project conventions: metres, +Y up, `part_*` mesh nodes, `socket_*` empties.
 */
export function Spacecraft({
  design,
  selectedTarget,
  hoveredTarget,
  exploded = false,
  applicableSlots,
  onSelectTarget,
  onHoverTarget,
  position = [0, 2.35, 0],
}: SpacecraftProps) {
  const resolved = useMemo(() => resolveDesign(design), [design]);
  const sockets = useMemo(() => getSocketLayouts(resolved.bus, exploded), [resolved.bus, exploded]);

  const fuelRatio = resolved.propulsion && resolved.propulsion.fuelCapacity > 0
    ? design.options.fuelMass / resolved.propulsion.fuelCapacity
    : 0;

  const bindTarget = (target: AssemblyTarget) => ({
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelectTarget?.(target);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHoverTarget?.(target);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHoverTarget?.(null);
      document.body.style.cursor = 'auto';
    },
  });

  const hl = (target: AssemblyTarget): HighlightProps => ({
    active: selectedTarget === target,
    hovered: hoveredTarget === target,
  });

  const isSlotVisible = (slot: SlotId) => !applicableSlots || applicableSlots.has(slot);

  return (
    <group name="spacecraft_root" position={position}>
      {/* Bus */}
      <group name={sockets.bus.name} position={sockets.bus.position} {...bindTarget('bus')}>
        <BusMesh bus={resolved.bus} highlight={hl('bus')} />
      </group>

      {/* Power */}
      <group name={sockets.power.name} position={sockets.power.position} {...bindTarget('power')}>
        {resolved.power && <PowerMesh power={resolved.power} bus={resolved.bus} highlight={hl('power')} />}
      </group>

      {/* Battery */}
      <group name={sockets.battery.name} position={sockets.battery.position} {...bindTarget('battery')}>
        {resolved.battery && <BatteryMesh battery={resolved.battery} highlight={hl('battery')} />}
      </group>

      {/* Computer */}
      <group name={sockets.computer.name} position={sockets.computer.position} {...bindTarget('computer')}>
        {resolved.computer && <ComputerMesh computer={resolved.computer} highlight={hl('computer')} />}
      </group>

      {/* ADCS */}
      <group name={sockets.adcs.name} position={sockets.adcs.position} {...bindTarget('adcs')}>
        {resolved.adcs && <AdcsMesh adcs={resolved.adcs} highlight={hl('adcs')} />}
      </group>

      {/* Comms */}
      <group name={sockets.comms.name} position={sockets.comms.position} {...bindTarget('comms')}>
        {resolved.comms && <CommsMesh comms={resolved.comms} highlight={hl('comms')} />}
      </group>

      {/* Propulsion */}
      <group name={sockets.propulsion.name} position={sockets.propulsion.position} {...bindTarget('propulsion')}>
        {resolved.propulsion && <PropulsionMesh propulsion={resolved.propulsion} fuelRatio={fuelRatio} highlight={hl('propulsion')} />}
      </group>

      {/* Radiation */}
      <group name={sockets.radiation.name} position={sockets.radiation.position} {...bindTarget('radiation')}>
        {resolved.radiation && <RadiationMesh radiation={resolved.radiation} highlight={hl('radiation')} />}
      </group>

      {/* Thermal */}
      <group name={sockets.thermal.name} position={sockets.thermal.position} {...bindTarget('thermal')}>
        {resolved.thermal && <ThermalMesh thermal={resolved.thermal} highlight={hl('thermal')} />}
      </group>

      {/* Life Support */}
      {isSlotVisible('lifeSupport') && (
        <group name={sockets.lifeSupport.name} position={sockets.lifeSupport.position} {...bindTarget('lifeSupport')}>
          {resolved.lifeSupport && <LifeSupportMesh lifeSupport={resolved.lifeSupport} highlight={hl('lifeSupport')} />}
        </group>
      )}

      {/* Habitat */}
      {isSlotVisible('habitat') && (
        <group name={sockets.habitat.name} position={sockets.habitat.position} {...bindTarget('habitat')}>
          {resolved.habitat && (
            <HabitatMesh habitat={resolved.habitat} spinArmLength={design.options.spinArmLength} highlight={hl('habitat')} />
          )}
        </group>
      )}

      {/* Heat Shield */}
      {isSlotVisible('heatShield') && (
        <group name={sockets.heatShield.name} position={sockets.heatShield.position} {...bindTarget('heatShield')}>
          {resolved.heatShield && <HeatShieldMesh heatShield={resolved.heatShield} highlight={hl('heatShield')} />}
        </group>
      )}

      {/* Instruments */}
      <group name={sockets.instruments.name} position={sockets.instruments.position} {...bindTarget('instruments')}>
        {resolved.instruments.length > 0 && <InstrumentsMesh instruments={resolved.instruments} highlight={hl('instruments')} />}
      </group>

      {/* Socket markers for interactive selection */}
      {(Object.keys(sockets) as AssemblyTarget[]).map((target) => {
        if (target !== 'bus' && target !== 'instruments' && !isSlotVisible(target as SlotId)) return null;
        const socket = sockets[target];
        const filled =
          target === 'bus'
            ? resolved.bus !== null
            : target === 'instruments'
              ? resolved.instruments.length > 0
              : resolved[target as SlotId] !== null;
        const isSelected = selectedTarget === target;
        const isHovered = hoveredTarget === target;
        if (filled && !isSelected && !isHovered && !exploded) return null;

        return (
          <mesh
            key={`marker_${target}`}
            name={`marker_${socket.name}`}
            position={socket.position}
            {...bindTarget(target)}
          >
            <sphereGeometry args={[isSelected ? 0.14 : 0.1, 16, 16]} />
            <meshBasicMaterial
              color={isSelected ? '#5ce1ff' : filled ? '#4cf0a0' : '#ffb547'}
              wireframe={!isSelected}
              transparent
              opacity={isSelected || isHovered ? 0.95 : 0.55}
            />
          </mesh>
        );
      })}
    </group>
  );
}
