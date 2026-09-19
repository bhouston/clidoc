import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { internalDependencies, readVersions, resolveManifest, stagePackage, writeVersion } from './release-package.mjs';

test('resolves dependency ranges against versions actually published', () => {
  const manifest = {
    name: '@clidoc/cli',
    version: '0.1.0',
    dependencies: { '@clidoc/core': 'workspace:^', '@clidoc/adapter-yargs': 'workspace:*', chalk: '^5.0.0' },
    peerDependencies: { '@clidoc/adapter-oclif': 'workspace:~' },
  };
  assert.deepEqual(internalDependencies(manifest), ['@clidoc/core', '@clidoc/adapter-yargs', '@clidoc/adapter-oclif']);
  assert.deepEqual(
    resolveManifest(
      manifest,
      { '@clidoc/core': '1.2.3', '@clidoc/adapter-yargs': '2.0.0', '@clidoc/adapter-oclif': '1.4.0' },
      '3.0.0',
    ),
    {
      ...manifest,
      version: '3.0.0',
      dependencies: { '@clidoc/core': '^1.2.3', '@clidoc/adapter-yargs': '2.0.0', chalk: '^5.0.0' },
      peerDependencies: { '@clidoc/adapter-oclif': '~1.4.0' },
    },
  );
  assert.throws(() => resolveManifest(manifest, {}, '3.0.0'), /No published version/);
  assert.throws(
    () =>
      resolveManifest({ dependencies: { '@clidoc/core': 'workspace:^1.0.0' } }, { '@clidoc/core': '2.0.0' }, '3.0.0'),
    /Unsupported workspace range/,
  );
});

test('stages the package that will be published with concrete versions', () => {
  const temp = mkdtempSync(join(tmpdir(), 'clidoc-stage-test-'));
  try {
    const source = join(temp, 'source');
    const destination = join(temp, 'staged');
    mkdirSync(join(source, 'dist'), { recursive: true });
    writeFileSync(
      join(source, 'package.json'),
      JSON.stringify({
        name: '@clidoc/example',
        version: '0.1.0',
        files: ['dist/*.js'],
        dependencies: { '@clidoc/core': 'workspace:*' },
      }),
    );
    writeFileSync(join(source, 'dist/index.js'), 'export function example() {}\n');
    const staged = stagePackage(source, destination, '4.0.0', {
      '@clidoc/core': '2.1.0',
    });
    assert.equal(staged.version, '4.0.0');
    assert.equal(staged.dependencies['@clidoc/core'], '2.1.0');
    assert.equal(
      JSON.parse(readFileSync(join(destination, 'package.json'), 'utf8')).dependencies['@clidoc/core'],
      '2.1.0',
    );
    assert.match(readFileSync(join(destination, 'dist/index.js'), 'utf8'), /example/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('records versions from earlier packages in one release run', () => {
  const temp = mkdtempSync(join(tmpdir(), 'clidoc-release-state-test-'));
  try {
    const path = join(temp, 'versions.json');
    writeVersion(path, '@clidoc/core', '2.0.0');
    writeVersion(path, '@clidoc/adapter-yargs', '1.3.0');
    assert.deepEqual(readVersions(path), { '@clidoc/core': '2.0.0', '@clidoc/adapter-yargs': '1.3.0' });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
