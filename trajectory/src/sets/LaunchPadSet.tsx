'use client';

import { Starfield } from '@/three/Starfield';
import { SceneBackground } from '@/three/SceneBackground';

/** A launch pad at night: tower, rocket and floodlights. */
export function LaunchPadSet() {
  const towerLevels = Array.from({ length: 12 }, (_, i) => i);
  return (
    <group>
      <SceneBackground color="#03060d" fog={[30, 90]} />
      <Starfield count={1800} milkyWay={0.55} seed={3} />
      <hemisphereLight args={['#5d7fb8', '#0a0d14', 0.25]} />

      {/* ground and pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[80, 64]} />
        <meshStandardMaterial color="#0d1118" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[6, 7, 0.8, 8]} />
        <meshStandardMaterial color="#3a404b" roughness={0.9} />
      </mesh>

      {/* rocket: 2 stages + fairing */}
      <group position={[0, 0.8, 0]}>
        <mesh position={[0, 6, 0]} castShadow>
          <cylinderGeometry args={[0.9, 0.9, 12, 32]} />
          <meshStandardMaterial color="#e9edf3" roughness={0.45} />
        </mesh>
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.92, 0.92, 0.5, 32]} />
          <meshStandardMaterial color="#1b2230" />
        </mesh>
        <mesh position={[0, 15, 0]} castShadow>
          <cylinderGeometry args={[0.8, 0.9, 6, 32]} />
          <meshStandardMaterial color="#e9edf3" roughness={0.45} />
        </mesh>
        <mesh position={[0, 12.1, 0]}>
          <cylinderGeometry args={[0.91, 0.91, 0.25, 32]} />
          <meshStandardMaterial color="#5ce1ff" emissive="#5ce1ff" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 19.5, 0]} castShadow>
          <coneGeometry args={[0.8, 3, 32]} />
          <meshStandardMaterial color="#f4f6fa" roughness={0.4} />
        </mesh>
      </group>

      {/* tower */}
      <group position={[-3.2, 0.8, 0]}>
        {[-0.8, 0.8].map((x) =>
          [-0.8, 0.8].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 11, z]} castShadow>
              <boxGeometry args={[0.18, 22, 0.18]} />
              <meshStandardMaterial color="#8a5a2b" roughness={0.7} />
            </mesh>
          )),
        )}
        {towerLevels.map((level) => (
          <mesh key={level} position={[0, level * 1.9 + 0.5, 0]}>
            <boxGeometry args={[1.8, 0.12, 1.8]} />
            <meshStandardMaterial color="#8a5a2b" roughness={0.7} />
          </mesh>
        ))}
        <mesh position={[1.6, 16, 0]}>
          <boxGeometry args={[2, 0.3, 0.6]} />
          <meshStandardMaterial color="#8a5a2b" roughness={0.7} />
        </mesh>
        <pointLight position={[0, 23, 0]} color="#ff4d4d" intensity={4} distance={8} />
        <mesh position={[0, 22.3, 0]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshBasicMaterial color="#ff4d4d" toneMapped={false} />
        </mesh>
      </group>

      {/* floodlights aimed at the rocket */}
      {[
        [14, 2, 10],
        [-14, 2, 8],
        [6, 2, -15],
      ].map((position) => (
        <group key={position.join()}>
          <spotLight position={position as [number, number, number]} target-position={[0, 9, 0]} angle={0.35} penumbra={0.5} intensity={420} distance={60} color="#fff1d6" castShadow />
          <mesh position={position as [number, number, number]}>
            <sphereGeometry args={[0.35, 12, 12]} />
            <meshBasicMaterial color="#fff1d6" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
