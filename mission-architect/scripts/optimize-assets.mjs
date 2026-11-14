// Optimizes every GLB in assets-src/models into public/models.
//
//   - removes duplicate and unused data
//   - compresses geometry with Meshopt (decoded in the browser by drei's useGLTF)
//   - converts embedded textures to WebP, 2K maximum
//
// Empty nodes are kept on purpose: `socket_*` empties are where spacecraft
// parts attach, and a default prune would delete them.
//
// KTX2 textures (smaller GPU memory) need the KTX-Software `ktx` command-line
// tool, which is a separate system install. WebP is used until that is set up.
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'assets-src', 'models');
const outDir = path.join(root, 'public', 'models');

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

await mkdir(outDir, { recursive: true });
const files = (await readdir(srcDir)).filter((file) => file.endsWith('.glb')).sort();
if (files.length === 0) {
  console.error(`No .glb files in ${path.relative(root, srcDir)}`);
  process.exit(1);
}

for (const file of files) {
  const input = path.join(srcDir, file);
  const output = path.join(outDir, file);
  const doc = await io.read(input);

  await doc.transform(
    dedup(),
    prune({ keepLeaves: true }),
    weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048] }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await io.write(output, doc);

  const nodes = doc.getRoot().listNodes().map((node) => node.getName());
  const sockets = nodes.filter((name) => name.startsWith('socket_'));
  const before = (await stat(input)).size;
  const after = (await stat(output)).size;
  console.log(
    `${file}: ${(before / 1024).toFixed(1)} KB -> ${(after / 1024).toFixed(1)} KB · ` +
      `${nodes.length} nodes · sockets: ${sockets.join(', ') || 'none'}`,
  );
}
