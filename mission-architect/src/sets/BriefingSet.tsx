'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { AdditiveBlending, type Group } from 'three';

import type { PathwayId } from '@/game/types';
import { useGame } from '@/hooks/useGame';
import { TEXTURES } from '@/three/constants';
import { Heliosphere } from '@/three/Heliosphere';
import { SimplePlanet } from '@/three/SimplePlanet';
import { Glow } from '@/three/Sun';

import { Engineer } from './Figures';
import { HangarSet } from './HangarSet';

const TEXTURE_FOR: Partial<Record<PathwayId, string>> = {
  leo: TEXTURES.earthDay,
  moon: TEXTURES.moon,
  mars: TEXTURES.mars,
  jupiter: TEXTURES.jupiter,
};

function OrbitRing({ radius, tilt = 0.35, colour = '#5ce1ff' }: { radius: number; tilt?: number; colour?: string }) {
  return (
    <mesh rotation={[Math.PI / 2 - tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.012, 8, 128]} />
      <meshBasicMaterial color={colour} toneMapped={false} transparent opacity={0.9} />
    </mesh>
  );
}

/** The hologram above the table: the mission's destination. */
function Hologram({ pathway }: { pathway: PathwayId }) {
  const spin = useRef<Group>(null);
  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += delta * 0.25;
  });
  const texture = TEXTURE_FOR[pathway];
  return (
    <group position={[0, 2.6, 0]}>
      <group ref={spin}>
        {texture && <SimplePlanet texture={texture} radius={pathway === 'jupiter' ? 0.9 : pathway === 'moon' ? 0.55 : 0.7} spin={0.2} atmosphere={pathway === 'leo' ? '#5aa8ff' : pathway === 'mars' ? '#ff9a6a' : undefined} />}
        {pathway === 'leo' && <OrbitRing radius={0.95} />}
        {pathway === 'moon' && <OrbitRing radius={0.8} tilt={1.4} colour="#ffb547" />}
        {pathway === 'mars' && <OrbitRing radius={1.0} colour="#ffb547" />}
        {pathway === 'jupiter' && (
          <mesh rotation={[Math.PI / 2 - 0.2, 0, 0]}>
            <torusGeometry args={[1.55, 0.25, 16, 96]} />
            <meshBasicMaterial color="#ff5a6a" transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        )}
        {pathway === 'interstellar' && (
          <group>
            <Glow size={0.9} />
            <Heliosphere radius={0.9} opacity={0.9} />
            <mesh position={[1.3, 0.2, 0]}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshBasicMaterial color="#e8f1ff" toneMapped={false} />
            </mesh>
          </group>
        )}
        {pathway === 'exoplanet' && (
          <group>
            <Glow size={1.2} inner="rgba(255,190,150,1)" outer="rgba(255,80,40,0.5)" />
            {[0.5, 0.75, 1.0, 1.25].map((radius, i) => (
              <group key={radius} rotation={[0, i * 1.6, 0]}>
                <mesh position={[radius, 0, 0]}>
                  <sphereGeometry args={[0.06, 12, 12]} />
                  <meshStandardMaterial color={['#c98f6b', '#8fa6c9', '#b9c48a', '#9a8fc9'][i]} emissive="#221100" />
                </mesh>
                <OrbitRing radius={radius} tilt={Math.PI / 2} colour="#b48cff" />
              </group>
            ))}
          </group>
        )}
      </group>
      <pointLight position={[2, 1, 2]} intensity={4} color="#ffffff" distance={8} />
    </group>
  );
}

/** Mission control: Director Hale and the engineers around the holo-table. */
export function BriefingSet() {
  const pathway = useGame((state) => state.mission?.pathwayId ?? 'leo');
  return (
    <HangarSet brightness={0.55} holoTable={false}>
      <group>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.6, 1.8, 1, 64]} />
          <meshStandardMaterial color="#1a2233" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.3, 1.5, 96]} />
          <meshStandardMaterial color="#5ce1ff" emissive="#5ce1ff" emissiveIntensity={2} toneMapped={false} />
        </mesh>
        {/* light cone from the table to the hologram */}
        <mesh position={[0, 1.8, 0]}>
          <cylinderGeometry args={[1.2, 1.3, 1.6, 48, 1, true]} />
          <meshBasicMaterial color="#5ce1ff" transparent opacity={0.06} blending={AdditiveBlending} depthWrite={false} side={2} />
        </mesh>
        <Hologram pathway={pathway} />
      </group>
      <Engineer position={[-1.7, 0, 0.3]} rotation={[0, 1.2, 0]} colour="#2b3445" accent="#e8f1ff" />
      <Engineer position={[1.9, 0, -0.6]} rotation={[0, -1.8, 0]} colour="#e9edf3" accent="#ffb547" />
      <Engineer position={[1.2, 0, 1.8]} rotation={[0, -2.6, 0]} colour="#e9edf3" accent="#b48cff" />
    </HangarSet>
  );
}
