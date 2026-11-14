'use client';

import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Group } from 'three';

interface FigureProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Main suit or coat colour. */
  colour: string;
  /** Role / badge colour (glowing stripe). */
  accent: string;
  /** Gentle idle sway. */
  idle?: boolean;
  /** Slow floating bob (weightlessness). */
  float?: boolean;
  children?: ReactNode;
}

/** Simple stylised body shared by astronauts and engineers (about 1.8 m tall). */
function Body({ colour, accent, coat }: { colour: string; accent: string; coat: boolean }) {
  return (
    <group>
      {/* legs */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.62, 6, 12]} />
          <meshStandardMaterial color={coat ? '#2b3445' : colour} roughness={0.75} />
        </mesh>
      ))}
      {/* torso */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <capsuleGeometry args={[0.22, coat ? 0.62 : 0.5, 8, 16]} />
        <meshStandardMaterial color={colour} roughness={coat ? 0.8 : 0.6} />
      </mesh>
      {/* role stripe */}
      <mesh position={[0, 1.22, 0]}>
        <torusGeometry args={[0.225, 0.025, 8, 32]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} />
      </mesh>
      {/* arms */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.31, 1.13, 0]} rotation={[0, 0, side * 0.12]} castShadow>
          <capsuleGeometry args={[0.07, 0.52, 6, 12]} />
          <meshStandardMaterial color={colour} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** `seed` staggers the motion so figures don't all move in step. */
function useIdle(idle: boolean, float: boolean, seed: number) {
  const ref = useRef<Group>(null);
  const phase = useRef(seed);
  useFrame((_, delta) => {
    if (!ref.current) return;
    phase.current += delta;
    if (float) {
      ref.current.position.y = Math.sin(phase.current * 0.6) * 0.12;
      ref.current.rotation.z = Math.sin(phase.current * 0.3) * 0.12;
    } else if (idle) {
      ref.current.rotation.y = Math.sin(phase.current * 0.5) * 0.06;
    }
  });
  return ref;
}

/** An astronaut in a pressure suit with a helmet and a role-coloured stripe. */
export function Astronaut({ position = [0, 0, 0], rotation = [0, 0, 0], colour, accent, idle = true, float = false, children }: FigureProps) {
  const ref = useIdle(idle, float, position[0] * 3.1 + position[2] * 1.7);
  return (
    <group position={position} rotation={rotation}>
      <group ref={ref}>
        <Body colour={colour} accent={accent} coat={false} />
        {/* backpack */}
        <mesh position={[0, 1.2, -0.27]} castShadow>
          <boxGeometry args={[0.38, 0.5, 0.18]} />
          <meshStandardMaterial color="#c9ced8" roughness={0.6} />
        </mesh>
        {/* helmet and visor */}
        <mesh position={[0, 1.72, 0]} castShadow>
          <sphereGeometry args={[0.2, 32, 24]} />
          <meshStandardMaterial color="#f4f6fa" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.73, 0.075]} scale={[0.82, 0.7, 0.7]}>
          <sphereGeometry args={[0.2, 32, 24]} />
          <meshStandardMaterial color="#1c2b45" metalness={1} roughness={0.08} envMapIntensity={1.6} />
        </mesh>
        {children}
      </group>
    </group>
  );
}

/** An engineer in a work coat with a coloured badge. Stylised, with no facial features. */
export function Engineer({ position = [0, 0, 0], rotation = [0, 0, 0], colour, accent, idle = true, children }: FigureProps) {
  const ref = useIdle(idle, false, position[0] * 3.1 + position[2] * 1.7);
  return (
    <group position={position} rotation={rotation}>
      <group ref={ref}>
        <Body colour={colour} accent={accent} coat />
        <mesh position={[0, 1.72, 0]} castShadow>
          <sphereGeometry args={[0.16, 32, 24]} />
          <meshStandardMaterial color="#9aa7bd" roughness={0.55} />
        </mesh>
        {/* headset */}
        <mesh position={[0, 1.78, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.17, 0.018, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#202938" />
        </mesh>
        {/* badge */}
        <mesh position={[0.12, 1.32, 0.215]}>
          <boxGeometry args={[0.08, 0.1, 0.01]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} />
        </mesh>
        {children}
      </group>
    </group>
  );
}
