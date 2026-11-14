// Generates placeholder GLB models in code, so the pipeline works before the
// real Blender models exist. Output goes to assets-src/models (uncompressed);
// scripts/optimize-assets.mjs then writes the compressed files to public/models.
//
// The placeholder follows the same conventions the real models must follow
// (see implementation-plan/01-tech-architecture.md §5):
//   - real-world scale in metres, +Y up
//   - mesh nodes named part_*
//   - empty nodes named socket_<slot> where parts attach
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Document, NodeIO } from '@gltf-transform/core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets-src', 'models');

// ---------- geometry helpers (positions, normals, indices) ----------

function box(w, h, d) {
  const x = w / 2, y = h / 2, z = d / 2;
  // [normal, four corners counter-clockwise seen from outside]
  const faces = [
    [[1, 0, 0], [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]]],
    [[-1, 0, 0], [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]]],
    [[0, 1, 0], [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]]],
    [[0, -1, 0], [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]]],
    [[0, 0, 1], [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]],
    [[0, 0, -1], [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]]],
  ];
  const positions = [], normals = [], indices = [];
  for (const [normal, corners] of faces) {
    const base = positions.length / 3;
    for (const corner of corners) {
      positions.push(...corner);
      normals.push(...normal);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions, normals, indices };
}

/** Cylinder or cone frustum along +Y, centred on the origin. */
function cylinder(radiusTop, radiusBottom, height, segments = 32, caps = true) {
  const positions = [], normals = [], indices = [];
  const half = height / 2;
  const slope = (radiusBottom - radiusTop) / height;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const c = Math.cos(angle), s = Math.sin(angle);
    const length = Math.hypot(1, slope);
    positions.push(radiusTop * c, half, radiusTop * s, radiusBottom * c, -half, radiusBottom * s);
    normals.push(c / length, slope / length, s / length, c / length, slope / length, s / length);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  if (caps) {
    for (const [radius, y, ny] of [[radiusTop, half, 1], [radiusBottom, -half, -1]]) {
      if (radius <= 0) continue;
      const centre = positions.length / 3;
      positions.push(0, y, 0);
      normals.push(0, ny, 0);
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        positions.push(radius * Math.cos(angle), y, radius * Math.sin(angle));
        normals.push(0, ny, 0);
      }
      for (let i = 0; i < segments; i++) {
        const a = centre + 1 + i;
        if (ny > 0) indices.push(centre, a + 1, a);
        else indices.push(centre, a, a + 1);
      }
    }
  }
  return { positions, normals, indices };
}

// ---------- document helpers ----------

function addMesh(doc, buffer, name, geometry, material) {
  const position = doc.createAccessor().setType('VEC3').setArray(new Float32Array(geometry.positions)).setBuffer(buffer);
  const normal = doc.createAccessor().setType('VEC3').setArray(new Float32Array(geometry.normals)).setBuffer(buffer);
  const index = doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(geometry.indices)).setBuffer(buffer);
  const primitive = doc.createPrimitive()
    .setAttribute('POSITION', position)
    .setAttribute('NORMAL', normal)
    .setIndices(index)
    .setMaterial(material);
  return doc.createMesh(name).addPrimitive(primitive);
}

const quatX90 = [Math.SQRT1_2, 0, 0, Math.SQRT1_2]; // +Y axis -> +Z
const quatZ90 = [0, 0, Math.SQRT1_2, Math.SQRT1_2]; // +Y axis -> -X

async function buildProbe() {
  const doc = new Document();
  doc.getRoot().getAsset().generator = 'Mission Architect placeholder generator';
  const buffer = doc.createBuffer();
  const scene = doc.createScene('probe_placeholder');

  const material = (name, color, metallic, roughness, emissive) => {
    const m = doc.createMaterial(name).setBaseColorFactor([...color, 1]).setMetallicFactor(metallic).setRoughnessFactor(roughness);
    if (emissive) m.setEmissiveFactor(emissive);
    return m;
  };
  const gold = material('mat_gold_foil', [0.86, 0.64, 0.2], 0.65, 0.42);
  const solar = material('mat_solar_cell', [0.05, 0.11, 0.42], 0.55, 0.28);
  const white = material('mat_white_paint', [0.9, 0.92, 0.95], 0.05, 0.55);
  // Open shapes (dish, nozzle) are visible from both sides.
  const dishWhite = material('mat_dish', [0.9, 0.92, 0.95], 0.05, 0.5).setDoubleSided(true);
  const nozzle = material('mat_nozzle', [0.05, 0.06, 0.08], 0.7, 0.45).setDoubleSided(true);
  const metal = material('mat_aluminium', [0.62, 0.65, 0.7], 0.95, 0.4);
  const dark = material('mat_dark', [0.04, 0.05, 0.07], 0.4, 0.5);
  const light = material('mat_status_light', [0.1, 0.6, 0.8], 0.0, 0.4, [0.36, 0.88, 1.0]);

  const rootNode = doc.createNode('probe');
  scene.addChild(rootNode);

  const add = (name, geometry, mat, translation = [0, 0, 0], rotation) => {
    const node = doc.createNode(name).setMesh(addMesh(doc, buffer, name, geometry, mat)).setTranslation(translation);
    if (rotation) node.setRotation(rotation);
    rootNode.addChild(node);
    return node;
  };
  const socket = (slot, translation) => rootNode.addChild(doc.createNode(`socket_${slot}`).setTranslation(translation));

  // Bus: 1.2 x 1.6 x 1.2 m
  add('part_body', box(1.2, 1.6, 1.2), gold);
  add('part_body_band', box(1.24, 0.12, 1.24), metal, [0, 0.45, 0]);
  add('part_status_light', box(0.3, 0.06, 0.02), light, [0, 0.1, 0.61]);

  // Solar wings: 3.2 x 1.3 m each, on booms
  for (const side of [-1, 1]) {
    const tag = side < 0 ? 'left' : 'right';
    add(`part_boom_${tag}`, cylinder(0.04, 0.04, 0.5, 12), metal, [side * 0.85, 0, 0], quatZ90);
    add(`part_solar_${tag}`, box(3.2, 0.05, 1.3), solar, [side * 2.7, 0, 0]);
    add(`part_solar_frame_${tag}`, box(3.26, 0.03, 0.06), metal, [side * 2.7, 0, 0]);
    socket(`power_${tag}`, [side * 0.6, 0, 0]);
  }

  // High-gain dish on top
  add('part_antenna_mast', cylinder(0.05, 0.05, 0.4, 12), metal, [0, 1.0, 0]);
  add('part_antenna_dish', cylinder(0.75, 0.12, 0.28, 40, false), dishWhite, [0, 1.3, 0]);
  add('part_antenna_feed', cylinder(0.03, 0.03, 0.45, 8), metal, [0, 1.5, 0]);
  socket('antenna', [0, 0.8, 0]);

  // Instrument (telescope tube) pointing along +Z
  add('part_instrument_tube', cylinder(0.3, 0.3, 1.0, 32), white, [0, -0.2, 1.1], quatX90);
  add('part_instrument_aperture', cylinder(0.26, 0.26, 0.02, 32), dark, [0, -0.2, 1.605], quatX90);
  socket('instrument_1', [0, -0.2, 0.6]);

  // Thruster on the bottom
  add('part_thruster', cylinder(0.12, 0.28, 0.35, 24, false), nozzle, [0, -0.97, 0]);

  // Internal sockets (parts mounted inside or on the bus)
  socket('battery', [-0.3, -0.5, 0]);
  socket('computer', [0.3, 0.3, 0]);
  socket('adcs', [0, 0, -0.6]);

  await mkdir(outDir, { recursive: true });
  const file = path.join(outDir, 'probe_placeholder.glb');
  await new NodeIO().write(file, doc);
  console.log(`wrote ${path.relative(root, file)}`);
}

await buildProbe();
