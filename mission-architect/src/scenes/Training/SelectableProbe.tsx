'use client';

import { useGLTF } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { Color, Mesh, MeshStandardMaterial, type Object3D } from 'three';

import { MODELS } from '@/three/constants';

import { partInfoFor } from './trainingStore';

interface SelectableProbeProps {
  selected: string | null;
  onSelect: (nodeName: string) => void;
  /** Bigger solar arrays (the training trade-off). */
  bigArray: boolean;
  position?: [number, number, number];
  scale?: number;
}

const HIGHLIGHT = new Color('#5ce1ff');
const HOVER = new Color('#1d4a5c');

function partName(object: Object3D | null): string | null {
  for (let node = object; node; node = node.parent) {
    if (node.name.startsWith('part_') && partInfoFor(node.name)) return node.name;
  }
  return null;
}

/** The test spacecraft: hover and click parts to inspect them. */
export function SelectableProbe({ selected, onSelect, bigArray, position = [0, 0, 0], scale = 1 }: SelectableProbeProps) {
  const { scene } = useGLTF(MODELS.probePlaceholder, false, true);
  const [hovered, setHovered] = useState<string | null>(null);

  // Own copy with its own materials, so highlighting one part doesn't light up others.
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((node) => {
      if (node instanceof Mesh && node.material instanceof MeshStandardMaterial) {
        node.material = node.material.clone();
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return copy;
  }, [scene]);

  useEffect(() => {
    const groupOf = (name: string) => name.replace(/_(left|right)$/, '');
    model.traverse((node) => {
      if (!(node instanceof Mesh) || !(node.material instanceof MeshStandardMaterial)) return;
      const name = node.name;
      const active = selected !== null && (name === selected || groupOf(name) === groupOf(selected));
      const hover = hovered !== null && !active && (name === hovered || groupOf(name) === groupOf(hovered));
      node.material.emissive.copy(active ? HIGHLIGHT : hover ? HOVER : new Color(0, 0, 0));
      node.material.emissiveIntensity = active ? 0.22 : hover ? 0.8 : 0;
      // The bigger array is 60% longer (and visibly heavier).
      if (name.startsWith('part_solar')) {
        const side = name.endsWith('left') ? -1 : 1;
        node.scale.x = bigArray ? 1.6 : 1;
        node.position.x = side * (bigArray ? 3.66 : 2.7);
      }
    });
  }, [model, selected, hovered, bigArray]);

  const pick = (event: ThreeEvent<PointerEvent | MouseEvent>) => partName(event.object);

  return (
    <group position={position} scale={scale}>
      <primitive
        object={model}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          const name = pick(event);
          if (name) onSelect(name);
        }}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          const name = pick(event);
          setHovered(name);
          document.body.style.cursor = name ? 'pointer' : 'auto';
        }}
        onPointerOut={() => {
          setHovered(null);
          document.body.style.cursor = 'auto';
        }}
      />
    </group>
  );
}
