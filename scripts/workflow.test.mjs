import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import config from '../release.config.js';
import { readFileSync } from 'node:fs';

// PR policy is now enforced by the canonical scripts/check-pr.mjs + .github/workflows/pr-policy.yml.

for (const [message, expected] of [
  ['fix: handle empty output', 'patch'],
  ['feat: add export', 'minor'],
  ['feat!: remove old API', 'major'],
  ['fix: change API\n\nBREAKING CHANGE: remove legacy arguments', 'major'],
  ['chore: update workflow', null],
]) {
  test(`release analysis: ${message.split('\n')[0]}`, async () => {
    const actual = await analyzeCommits(config.plugins[0][1], {
      cwd: process.cwd(),
      commits: [{ hash: 'test', message }],
      logger: { log() {} },
    });
    assert.equal(actual, expected);
  });
}

test('release branch is only main', () => assert.deepEqual(config.branches, ['main']));

test('all seven public packages publish once, in dependency order, before cli', () => {
  const pkgRoots = config.plugins
    .filter((plugin) => Array.isArray(plugin) && plugin[0] === '@anolilab/semantic-release-pnpm')
    .map(([, options]) => options.pkgRoot);
  assert.deepEqual(pkgRoots, [
    'packages/core',
    'packages/commander',
    'packages/oclif',
    'packages/yargs',
    'packages/cli',
    'packages/docusaurus',
    'packages/vitepress',
  ]);
  assert.ok(pkgRoots.indexOf('packages/core') < pkgRoots.indexOf('packages/cli'), 'core must publish before cli');
  assert.ok(pkgRoots.indexOf('packages/yargs') < pkgRoots.indexOf('packages/cli'), 'yargs must publish before cli');
});

test('release workflow always runs semantic-release after checks', () => {
  const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
  assert.match(workflow, /release:\n\s+needs: \[guard, checks\]\n\s+runs-on:/);
  assert.match(workflow, /run: pnpm release \$\{\{ inputs\.dry_run && '--dry-run' \|\| '' \}\}/);
});
