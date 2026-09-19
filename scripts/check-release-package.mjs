import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stagePackage } from './release-package.mjs';

const root = new URL('../packages/', import.meta.url);
const dirs = readdirSync(root, { withFileTypes: true }).filter((item) => item.isDirectory());
const versions = Object.fromEntries(
  dirs.map((item) => {
    const manifest = JSON.parse(readFileSync(new URL(`${item.name}/package.json`, root), 'utf8'));
    return [manifest.name, '9.8.7'];
  }),
);
for (const item of dirs) {
  const packageDir = new URL(`${item.name}/`, root).pathname;
  const temp = mkdtempSync(join(tmpdir(), 'clidoc-package-check-'));
  try {
    const staged = stagePackage(packageDir, temp, '2.3.4', versions);
    if (staged.version !== '2.3.4') throw new Error(`${staged.name}: incorrect staged version`);
    for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const range of Object.values(staged[field] ?? {})) {
        if (typeof range === 'string' && range.includes('workspace:'))
          throw new Error(`${staged.name}: unresolved workspace dependency`);
      }
    }
    console.log(`${staged.name}: staged package resolves workspace dependencies`);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
