// Converts downloaded source textures into web-ready files in public/textures.
//
// Usage: node scripts/import-textures.mjs <folder-with-source-images>
//
// Source: Solar System Scope textures (CC BY 4.0), 2K set:
//   https://www.solarsystemscope.com/textures/
// See CREDITS.md for the attribution.
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'textures');
const srcDir = process.argv[2];

if (!srcDir) {
  console.error('Usage: node scripts/import-textures.mjs <folder-with-source-images>');
  process.exit(1);
}

/** source file -> [output name, webp quality, greyscale?] */
const JOBS = [
  ['2k_earth_daymap.jpg', 'earth_day.webp', 86, false],
  ['2k_earth_nightmap.jpg', 'earth_night.webp', 82, false],
  ['2k_earth_clouds.jpg', 'earth_clouds.webp', 80, true],
  ['2k_earth_normal_map.tif', 'earth_normal.webp', 90, false],
  ['2k_earth_specular_map.tif', 'earth_specular.webp', 80, true],
  ['2k_stars_milky_way.jpg', 'milky_way.webp', 78, false],
];

await mkdir(outDir, { recursive: true });

for (const [source, output, quality, greyscale] of JOBS) {
  const input = path.join(srcDir, source);
  const target = path.join(outDir, output);
  let image = sharp(input).resize(2048, 1024, { fit: 'fill' });
  if (greyscale) image = image.greyscale();
  await image.webp({ quality, effort: 6 }).toFile(target);
  const { size } = await stat(target);
  console.log(`${output.padEnd(22)} ${(size / 1024).toFixed(0).padStart(5)} KB`);
}
