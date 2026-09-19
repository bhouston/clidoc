import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { internalDependencies, stagePackage } from './release-package.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = join(root, 'packages');
const output = resolve(root, process.argv[2] ?? 'publish');
if (existsSync(output)) throw new Error(`Output directory already exists: ${output}`);
const packages = new Map();
for (const directory of readdirSync(packageRoot)) {
  const packageDir = join(packageRoot, directory);
  try {
    const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
    if (!manifest.private) packages.set(manifest.name, { packageDir, manifest, directory });
  } catch {
    /* Skip non-package entries. */
  }
}
const versions = Object.fromEntries([...packages].map(([name, { manifest }]) => [name, manifest.version]));
const order = [];
const visiting = new Set();
function visit(name) {
  if (order.includes(name)) return;
  if (visiting.has(name)) throw new Error(`Circular package dependency: ${name}`);
  visiting.add(name);
  for (const dependency of internalDependencies(packages.get(name).manifest)) {
    if (packages.has(dependency)) visit(dependency);
  }
  visiting.delete(name);
  order.push(name);
}
for (const name of packages.keys()) visit(name);
mkdirSync(output, { recursive: true });
for (const name of order) {
  const { packageDir, manifest, directory } = packages.get(name);
  const destination = join(output, directory);
  stagePackage(packageDir, destination, manifest.version, versions);
  console.log(`${name}@${manifest.version} -> ${destination}`);
}
