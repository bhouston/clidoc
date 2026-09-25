import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import config from '../release.config.js';
import { baselineCommits, baselineTags, missingTags } from './check-release-baselines.mjs';
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

test('all seven public packages require their initial version tags', () => {
  const tags = baselineTags();
  assert.equal(tags.length, 7);
  assert.equal(new Set(tags).size, 7);
  assert.deepEqual(
    missingTags(tags, (tag) => tag !== '@clidoc/core-v0.1.0'),
    ['@clidoc/core-v0.1.0'],
  );
  assert.deepEqual(
    [...baselineCommits(tags, (tag) => (tag === tags[0] ? 'other' : 'bootstrap'))],
    ['other', 'bootstrap'],
  );
});

test('release workflow always runs semantic-release after checks', () => {
  const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
  assert.match(workflow, /release:\n\s+needs: \[guard, checks\]\n\s+runs-on:/);
  assert.match(workflow, /run: pnpm release \$\{\{ inputs\.dry_run && '--dry-run' \|\| '' \}\}/);
});
