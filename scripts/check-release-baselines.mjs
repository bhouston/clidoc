import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

export const packageDirectories = ['core', 'commander', 'oclif', 'yargs', 'cli', 'docusaurus', 'vitepress'];

export function baselineTags(readManifest = readFileSync) {
  return packageDirectories.map((directory) => {
    const { name, version } = JSON.parse(readManifest(`packages/${directory}/package.json`, 'utf8'));
    if (!name?.startsWith('@clidoc/') || !version) throw new Error(`Invalid package manifest: ${directory}`);
    return `${name}-v${version}`;
  });
}

export function missingTags(
  tags,
  verify = (tag) =>
    spawnSync('git', ['rev-parse', '--verify', `refs/tags/${tag}^{commit}`], { stdio: 'ignore' }).status === 0,
) {
  return tags.filter((tag) => !verify(tag));
}

export function baselineCommits(
  tags,
  resolve = (tag) => {
    const result = spawnSync('git', ['rev-parse', `refs/tags/${tag}^{commit}`], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Cannot resolve baseline ${tag}`);
    return result.stdout.trim();
  },
) {
  return new Set(tags.map(resolve));
}

if (process.argv[1]?.endsWith('/check-release-baselines.mjs')) {
  const missing = missingTags(baselineTags());
  if (missing.length) {
    console.error(
      `Missing release baseline tags: ${missing.join(', ')}. Bootstrap and publish these packages before enabling automated releases.`,
    );
    process.exitCode = 1;
  } else {
    for (const commit of baselineCommits(baselineTags())) {
      if (spawnSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD']).status !== 0) {
        console.error(`Release baseline commit ${commit} is not an ancestor of HEAD.`);
        process.exitCode = 1;
      }
    }
  }
}
