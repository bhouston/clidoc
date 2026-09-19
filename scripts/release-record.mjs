import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeVersion } from './release-package.mjs';

export async function publish(_pluginConfig, context) {
  const stateFile = process.env.CLIDOC_RELEASE_STATE;
  if (!stateFile) throw new Error('Use pnpm release to set up package state');
  const { name } = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  writeVersion(stateFile, name, context.nextRelease.version);
}
