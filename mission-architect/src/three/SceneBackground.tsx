'use client';

import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import { Color, Fog } from 'three';

/** Space black, used whenever a scene doesn't set its own background. */
export const DEFAULT_BACKGROUND = '#02040a';

interface SceneBackgroundProps {
  color?: string;
  /** Fog start and end distance. Leave out for no fog. */
  fog?: readonly [near: number, far: number];
  /** Fog colour (defaults to the background colour). */
  fogColor?: string;
}

/**
 * Sets the scene's background colour and fog, and resets them when the set
 * unmounts. (A `<color attach="background">` only works as a direct child of
 * the scene; inside a group it silently attaches to the group instead.)
 */
export function SceneBackground({ color = DEFAULT_BACKGROUND, fog, fogColor }: SceneBackgroundProps) {
  const get = useThree((state) => state.get);
  const near = fog?.[0];
  const far = fog?.[1];
  useLayoutEffect(() => {
    const { scene } = get();
    scene.background = new Color(color);
    scene.fog = near !== undefined && far !== undefined ? new Fog(fogColor ?? color, near, far) : null;
    return () => {
      scene.background = new Color(DEFAULT_BACKGROUND);
      scene.fog = null;
    };
  }, [get, color, near, far, fogColor]);
  return null;
}
