import { mkdtempSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { internalDependencies } from './release-package.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = join(root, 'packages');
const packages = new Map();
for (const directory of readdirSync(packageRoot)) {
  const path = join(packageRoot, directory);
  try {
    const manifest = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8'));
    if (!manifest.private) packages.set(manifest.name, { path, manifest });
  } catch {
    /* Ignore non-package entries. */
  }
}
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
const temp = mkdtempSync(join(tmpdir(), 'opencli-release-'));
const state = join(temp, 'versions.json');
writeFileSync(state, '{}\n');
try {
  for (const name of order) {
    const { path, manifest } = packages.get(name);
    const stage = join(temp, name.replaceAll('/', '-'));
    mkdirSync(stage);
    writeFileSync(
      join(stage, 'package.json'),
      JSON.stringify(
        { name, version: manifest.version, private: false, publishConfig: manifest.publishConfig },
        null,
        2,
      ) + '\n',
    );
    const result = spawnSync(
      'pnpm',
      ['exec', 'semantic-release', '-e', 'semantic-release-monorepo', ...process.argv.slice(2)],
      {
        cwd: path,
        stdio: 'inherit',
        env: { ...process.env, OPENCLI_RELEASE_STATE: state, OPENCLI_RELEASE_PKG_ROOT: stage },
      },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) process.exitCode = result.status ?? 1;
    if (process.exitCode) break;
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
