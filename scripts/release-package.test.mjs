import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { internalDependencies, readVersions, resolveManifest, stagePackage, writeVersion } from './release-package.mjs';

test('resolves dependency ranges against versions actually published', () => {
  const manifest = {
    name: '@opencli/cli',
    version: '0.1.0',
    dependencies: { '@opencli/core': 'workspace:^', '@opencli/adapter-yargs': 'workspace:*', chalk: '^5.0.0' },
    peerDependencies: { '@opencli/adapter-oclif': 'workspace:~' },
  };
  assert.deepEqual(internalDependencies(manifest), [
    '@opencli/core',
    '@opencli/adapter-yargs',
    '@opencli/adapter-oclif',
  ]);
  assert.deepEqual(
    resolveManifest(
      manifest,
      { '@opencli/core': '1.2.3', '@opencli/adapter-yargs': '2.0.0', '@opencli/adapter-oclif': '1.4.0' },
      '3.0.0',
    ),
    {
      ...manifest,
      version: '3.0.0',
      dependencies: { '@opencli/core': '^1.2.3', '@opencli/adapter-yargs': '2.0.0', chalk: '^5.0.0' },
      peerDependencies: { '@opencli/adapter-oclif': '~1.4.0' },
    },
  );
  assert.throws(() => resolveManifest(manifest, {}, '3.0.0'), /No published version/);
  assert.throws(
    () =>
      resolveManifest({ dependencies: { '@opencli/core': 'workspace:^1.0.0' } }, { '@opencli/core': '2.0.0' }, '3.0.0'),
    /Unsupported workspace range/,
  );
});

test('stages the package that will be published with concrete versions', () => {
  const temp = mkdtempSync(join(tmpdir(), 'opencli-stage-test-'));
  try {
    const source = join(temp, 'source');
    const destination = join(temp, 'staged');
    mkdirSync(join(source, 'dist'), { recursive: true });
    writeFileSync(
      join(source, 'package.json'),
      JSON.stringify({
        name: '@opencli/example',
        version: '0.1.0',
        files: ['dist/*.js'],
        dependencies: { '@opencli/core': 'workspace:*' },
      }),
    );
    writeFileSync(join(source, 'dist/index.js'), 'export function example() {}\n');
    const staged = stagePackage(source, destination, '4.0.0', {
      '@opencli/core': '2.1.0',
    });
    assert.equal(staged.version, '4.0.0');
    assert.equal(staged.dependencies['@opencli/core'], '2.1.0');
    assert.equal(
      JSON.parse(readFileSync(join(destination, 'package.json'), 'utf8')).dependencies['@opencli/core'],
      '2.1.0',
    );
    assert.match(readFileSync(join(destination, 'dist/index.js'), 'utf8'), /example/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('records versions from earlier packages in one release run', () => {
  const temp = mkdtempSync(join(tmpdir(), 'opencli-release-state-test-'));
  try {
    const path = join(temp, 'versions.json');
    writeVersion(path, '@opencli/core', '2.0.0');
    writeVersion(path, '@opencli/adapter-yargs', '1.3.0');
    assert.deepEqual(readVersions(path), { '@opencli/core': '2.0.0', '@opencli/adapter-yargs': '1.3.0' });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
