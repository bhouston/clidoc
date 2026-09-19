import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { internalDependencies, readVersions, registryVersion, stagePackage } from './release-package.mjs';

export async function prepare(_pluginConfig, context) {
  const packageDir = process.cwd();
  const stageDir = process.env.OPENCLI_RELEASE_PKG_ROOT;
  const stateFile = process.env.OPENCLI_RELEASE_STATE;
  if (!stageDir || !stateFile) throw new Error('Use pnpm release to set up package staging');
  const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  const versions = readVersions(stateFile);
  for (const name of internalDependencies(manifest)) versions[name] ??= registryVersion(name);
  stagePackage(packageDir, stageDir, context.nextRelease.version, versions);
}
