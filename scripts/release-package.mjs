import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

export function internalDependencies(manifest) {
  return Object.entries({ ...manifest.dependencies, ...manifest.optionalDependencies, ...manifest.peerDependencies })
    .filter(
      ([name, range]) => name.startsWith('@opencli/') && typeof range === 'string' && range.startsWith('workspace:'),
    )
    .map(([name]) => name);
}

export function resolveManifest(manifest, versions, nextVersion) {
  const result = structuredClone(manifest);
  result.version = nextVersion;
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const [name, range] of Object.entries(result[field] ?? {})) {
      if (typeof range !== 'string' || !range.startsWith('workspace:')) continue;
      const version = versions[name];
      if (!version) throw new Error(`No published version available for ${name}`);
      if (!['workspace:*', 'workspace:^', 'workspace:~'].includes(range)) {
        throw new Error(`Unsupported workspace range ${range} for ${name}`);
      }
      result[field][name] = range === 'workspace:*' ? version : range === 'workspace:^' ? `^${version}` : `~${version}`;
    }
  }
  return result;
}

export function readVersions(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
}
export function writeVersion(path, name, version) {
  writeFileSync(path, JSON.stringify({ ...readVersions(path), [name]: version }, null, 2) + '\n');
}
export function registryVersion(name) {
  try {
    return JSON.parse(execFileSync('npm', ['view', name, 'version', '--json'], { encoding: 'utf8' }));
  } catch {
    throw new Error(`No published version found for ${name}; release its dependency first`);
  }
}

/** Copy the files npm would publish, then write a concrete manifest to the staging directory. */
export function stagePackage(packageDir, stageDir, nextVersion, versions) {
  const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  const output = JSON.parse(
    execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: packageDir, encoding: 'utf8' }),
  );
  for (const file of output[0].files) {
    if (file.path === 'package.json') continue;
    const destination = resolve(stageDir, file.path);
    if (!destination.startsWith(resolve(stageDir) + '/')) throw new Error(`Invalid package path: ${file.path}`);
    mkdirSync(resolve(destination, '..'), { recursive: true });
    cpSync(join(packageDir, file.path), destination);
  }
  const resolved = resolveManifest(manifest, versions, nextVersion);
  mkdirSync(stageDir, { recursive: true });
  writeFileSync(join(stageDir, 'package.json'), JSON.stringify(resolved, null, 2) + '\n');
  return resolved;
}
