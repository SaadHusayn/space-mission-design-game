'use client';

import { Environment, Grid, Lightformer } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { SceneBackground } from '@/three/SceneBackground';

interface HangarSetProps {
  /** 0..1: overall brightness (dim for the transmission scene). */
  brightness?: number;
  /** Show the glowing holo-table. */
  holoTable?: boolean;
  children?: ReactNode;
}

function HoloTable({ position }: { position: [number, number, number] }) {
  const globe = useRef<Group>(null);
  useFrame((_, delta) => {
    if (globe.current) globe.current.rotation.y += delta * 0.4;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.1, 1.25, 0.9, 48]} />
        <meshStandardMaterial color="#1a2233" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.91, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 1.0, 64]} />
        <meshStandardMaterial color="#5ce1ff" emissive="#5ce1ff" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <group ref={globe} position={[0, 1.75, 0]}>
        <mesh>
          <sphereGeometry args={[0.55, 24, 16]} />
          <meshBasicMaterial color="#5ce1ff" wireframe transparent opacity={0.45} toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2.3, 0, 0]}>
          <torusGeometry args={[0.85, 0.01, 8, 96]} />
          <meshBasicMaterial color="#ffb547" toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[0, 1.6, 0]} color="#5ce1ff" intensity={6} distance={6} />
    </group>
  );
}

/** The Mission Design Center: a clean, lit spacecraft assembly hall. */
export function HangarSet({ brightness = 1, holoTable = true, children }: HangarSetProps) {
  return (
    <group>
      <SceneBackground color="#070b14" fog={[22, 60]} />
      <hemisphereLight args={['#c8d8ff', '#1a1f2a', 0.35 * brightness]} />
      <directionalLight position={[6, 14, 8]} intensity={1.6 * brightness} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
        <orthographicCamera attach="shadow-camera" args={[-14, 14, 14, -14, 1, 40]} />
      </directionalLight>
      <spotLight position={[0, 12, 0]} angle={0.5} penumbra={0.6} intensity={60 * brightness} color="#fff4e0" distance={30} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2 * brightness} position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[16, 2, 1]} />
        <Lightformer form="rect" intensity={1.2 * brightness} position={[-10, 4, 0]} rotation={[0, Math.PI / 2, 0]} scale={[10, 3, 1]} color="#9fc4ff" />
        <Lightformer form="rect" intensity={1.2 * brightness} position={[10, 4, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[10, 3, 1]} color="#ffd9a8" />
      </Environment>

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#141a26" metalness={0.35} roughness={0.55} />
      </mesh>
      <Grid
        position={[0, 0.005, 0]}
        args={[80, 80]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#22314a"
        sectionSize={5}
        sectionThickness={1.1}
        sectionColor="#2f5b8a"
        fadeDistance={45}
        fadeStrength={1.5}
      />

      {/* assembly cradle */}
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.6, 2.8, 0.3, 64]} />
        <meshStandardMaterial color="#1f2838" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.35, 2.5, 96]} />
        <meshStandardMaterial color="#5ce1ff" emissive="#5ce1ff" emissiveIntensity={1.5 * brightness + 0.3} toneMapped={false} />
      </mesh>

      {/* back wall with light strips */}
      <mesh position={[0, 7, -16]} receiveShadow>
        <boxGeometry args={[60, 14, 0.5]} />
        <meshStandardMaterial color="#10161f" roughness={0.8} />
      </mesh>
      {[-12, -6, 0, 6, 12].map((x) => (
        <mesh key={x} position={[x, 7, -15.7]}>
          <boxGeometry args={[0.18, 11, 0.05]} />
          <meshStandardMaterial color="#9fd8ff" emissive="#9fd8ff" emissiveIntensity={1.2 * brightness} toneMapped={false} />
        </mesh>
      ))}
      {/* side gantries */}
      {[-11, 11].map((x) => (
        <group key={x} position={[x, 0, -4]}>
          {[0, 4, 8].map((z) => (
            <mesh key={z} position={[0, 4, z - 4]} castShadow>
              <boxGeometry args={[0.35, 8, 0.35]} />
              <meshStandardMaterial color="#2a3446" metalness={0.6} roughness={0.5} />
            </mesh>
          ))}
          <mesh position={[0, 8, 0]}>
            <boxGeometry args={[0.4, 0.35, 9]} />
            <meshStandardMaterial color="#2a3446" metalness={0.6} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {holoTable && <HoloTable position={[-6, 0, 3]} />}
      {children}
    </group>
  );
}
