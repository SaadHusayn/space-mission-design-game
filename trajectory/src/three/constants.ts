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
} as const;

export const MODELS = {
  probePlaceholder: '/models/probe_placeholder.glb',
} as const;
