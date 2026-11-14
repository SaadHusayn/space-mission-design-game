'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BackSide, Color, InstancedMesh, Object3D, type Group } from 'three';

import { createRng } from '@/game/core/rng';
import { SUN_DIRECTION, TEXTURES } from '@/three/constants';
import { Planet } from '@/three/Planet';
import { Starfield } from '@/three/Starfield';

import { Astronaut } from './Figures';

/** Training centrifuge: a long arm spinning a crew pod. */
export function CentrifugeSet({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const arm = useRef<Group>(null);
  useFrame((_, delta) => {
    if (arm.current) arm.current.rotation.y += delta * (reducedMotion ? 0.4 : 2.2);
  });
  return (
    <group>
      <color attach="background" args={['#0a0d12']} />
      <hemisphereLight args={['#b9c7e0', '#14100c', 0.45]} />
      <spotLight position={[0, 14, 0]} angle={0.9} penumbra={0.7} intensity={140} distance={40} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color="#20252e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[14, 14, 12, 64, 1, true]} />
        <meshStandardMaterial color="#151a22" side={BackSide} roughness={0.9} />
      </mesh>
      {/* hazard ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[8.6, 9, 96]} />
        <meshStandardMaterial color="#ffb547" emissive="#ffb547" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1.2, 2.4, 32]} />
        <meshStandardMaterial color="#3a4458" metalness={0.6} roughness={0.4} />
      </mesh>
      <group ref={arm} position={[0, 1.8, 0]}>
        <mesh position={[4, 0, 0]} castShadow>
          <boxGeometry args={[8, 0.45, 0.6]} />
          <meshStandardMaterial color="#c9ced8" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[8.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.85, 1.2, 8, 24]} />
          <meshStandardMaterial color="#f2f4f8" roughness={0.4} />
        </mesh>
        <mesh position={[8.1, 0.2, 0.86]}>
          <circleGeometry args={[0.32, 24]} />
          <meshStandardMaterial color="#5ce1ff" emissive="#5ce1ff" emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      </group>
      {[0, 1, 2, 3].map((i) => (
        <pointLight key={i} position={[Math.cos(i * 1.57) * 12, 9, Math.sin(i * 1.57) * 12]} color="#ff5a6a" intensity={6} distance={10} />
      ))}
    </group>
  );
}

/** Launch simulator cockpit looking out at Earth. */
export function SimulatorSet() {
  const screens = [
    [-1.1, 1.05, -1.2, '#163a5c'],
    [0, 0.95, -1.35, '#0f2f2a'],
    [1.1, 1.05, -1.2, '#3a2a10'],
  ] as const;
  return (
    <group>
      <Starfield count={1200} milkyWay={0.4} seed={12} />
      <group position={[0, 0.2, -14]}>
        <Planet
          textures={{ map: TEXTURES.earthDay, nightMap: TEXTURES.earthNight, cloudsMap: TEXTURES.earthClouds }}
          radius={6}
          sunDirection={SUN_DIRECTION}
          rotationSpeed={0.01}
          atmosphereColor="#5aa8ff"
          segments={64}
        />
      </group>
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 2.2, 0.5]} intensity={6} color="#9fc4ff" distance={6} />
      {/* window frame */}
      {[-1.7, 1.7].map((x) => (
        <mesh key={x} position={[x, 1.8, -2.2]} rotation={[0, 0, x > 0 ? -0.15 : 0.15]}>
          <boxGeometry args={[0.18, 2.8, 0.2]} />
          <meshStandardMaterial color="#2a3242" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 3.2, -2.2]}>
        <boxGeometry args={[3.8, 0.2, 0.2]} />
        <meshStandardMaterial color="#2a3242" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* console */}
      <mesh position={[0, 0.55, -1.25]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[3.6, 0.9, 0.4]} />
        <meshStandardMaterial color="#1b2230" roughness={0.6} />
      </mesh>
      {screens.map(([x, y, z, colour]) => (
        <mesh key={x} position={[x, y, z]} rotation={[-0.5, 0, 0]}>
          <planeGeometry args={[0.9, 0.5]} />
          <meshStandardMaterial color={colour} emissive={new Color(colour).multiplyScalar(2.2)} />
        </mesh>
      ))}
      {/* No seat: the camera is the pilot's eyes. */}
    </group>
  );
}

/** Neutral-buoyancy pool: astronauts rehearse weightlessness underwater. */
export function PoolSet() {
  const bubbles = useRef<InstancedMesh>(null);
  const seeds = useMemo(() => {
    const rng = createRng(21);
    return Array.from({ length: 70 }, () => ({ x: rng.range(-5, 5), z: rng.range(-4, 4), speed: rng.range(0.3, 0.9), offset: rng.range(0, 6) }));
  }, []);
  const dummy = useMemo(() => new Object3D(), []);
  const time = useRef(0);
  useFrame((_, delta) => {
    time.current += delta;
    const mesh = bubbles.current;
    if (!mesh) return;
    seeds.forEach((seed, i) => {
      const y = -4 + ((time.current * seed.speed + seed.offset) % 4.2);
      dummy.position.set(seed.x + Math.sin(time.current + i) * 0.1, y, seed.z);
      dummy.scale.setScalar(0.04 + (i % 3) * 0.015);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <color attach="background" args={['#021624']} />
      <fog attach="fog" args={['#05324a', 4, 24]} />
      <ambientLight intensity={0.4} color="#6fd0ff" />
      <directionalLight position={[2, 10, 4]} intensity={1.4} color="#bdf0ff" />
      <pointLight position={[0, -2, 2]} intensity={10} color="#2bb3ff" distance={12} />
      {/* pool floor and walls */}
      <mesh position={[0, -4.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#5fa3b8" roughness={0.9} />
      </mesh>
      {/* water surface */}
      <mesh position={[0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#6fd0ff" transparent opacity={0.25} metalness={0.2} roughness={0.1} side={2} />
      </mesh>
      {/* mock spacecraft module on the pool floor */}
      <mesh position={[-2.5, -3.2, -1.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.2, 1.2, 5, 32]} />
        <meshStandardMaterial color="#e7ebf2" roughness={0.5} />
      </mesh>
      <Astronaut position={[1.2, -1.6, 0]} rotation={[0.4, -0.6, 0.3]} colour="#f2f4f8" accent="#5ce1ff" float />
      <Astronaut position={[-1.2, -2.2, 1.6]} rotation={[-0.3, 0.8, -0.2]} colour="#f2f4f8" accent="#ffb547" float />
      <instancedMesh ref={bubbles} args={[undefined, undefined, seeds.length]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#d9f6ff" transparent opacity={0.6} />
      </instancedMesh>
    </group>
  );
}
