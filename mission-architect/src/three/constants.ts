import { Vector3 } from 'three';

/** Direction from the scene origin towards the Sun (world space, normalised). */
export const SUN_DIRECTION = new Vector3(-0.82, 0.3, 0.48).normalize();

export const TEXTURES = {
  earthDay: '/textures/earth_day.webp',
  earthNight: '/textures/earth_night.webp',
  earthClouds: '/textures/earth_clouds.webp',
  earthNormal: '/textures/earth_normal.webp',
  earthSpecular: '/textures/earth_specular.webp',
  milkyWay: '/textures/milky_way.webp',
  moon: '/textures/moon.webp',
  mars: '/textures/mars.webp',
  jupiter: '/textures/jupiter.webp',
  sun: '/textures/sun.webp',
} as const;

export const MODELS = {
  probePlaceholder: '/models/probe_placeholder.glb',
  rocketSmall: '/models/rocket_small.glb',
  rocketMedium: '/models/rocket_medium.glb',
  rocketHeavy: '/models/rocket_heavy.glb',
  rocketSuperheavy: '/models/rocket_superheavy.glb',
  sun: '/models/sun.glb',
  moon: '/models/moon.glb',
  mars: '/models/mars.glb',
  exoplanet: '/models/exoplanet.glb',
  probeIss: '/models/probe_iss.glb',
  probeLro: '/models/probe_lro.glb',
  probeMro: '/models/probe_mro.glb',
  probeJuno: '/models/probe_juno.glb',
  probeVoyager: '/models/probe_voyager.glb',
  probeJwst: '/models/probe_jwst.glb',
  dsnDish: '/models/dsn_dish.glb',
} as const;
