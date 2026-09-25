import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// Packages published to npm, in dependency order (core first; every other
// package depends on it, and cli additionally depends on yargs, so cli
// comes after yargs). workspace:* ranges are resolved to concrete semver
// natively by `pnpm publish`, which @anolilab/semantic-release-pnpm uses.
const packages = [
  'packages/core',
  'packages/commander',
  'packages/oclif',
  'packages/yargs',
  'packages/cli',
  'packages/docusaurus',
  'packages/vitepress',
];

export default {
  branches: ['main'],
  repositoryUrl: 'https://github.com/bhouston/clidoc.git',
  tagFormat: 'v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
    // pkgRoot only (no tarballDir): @anolilab/semantic-release-pnpm's tarballDir option
    // shells out to `pnpm pack <pkgRoot>`, which pnpm packs from the cwd instead — pack
    // explicitly below, once all packages have their final bumped version.
    ...packages.map((path) => ['@anolilab/semantic-release-pnpm', { pkgRoot: path }]),
    {
      prepare: () => {
        // Absolute destination: `pnpm --dir <path>` changes pnpm's cwd, so a relative
        // destination would land inside each package instead of the repo-root
        // `release-artifacts` that @semantic-release/github globs for its release assets.
        const tarballDir = resolve('release-artifacts');
        for (const path of packages) {
          execFileSync('pnpm', ['--dir', path, 'pack', '--pack-destination', tarballDir], {
            stdio: 'inherit',
          });
        }
      },
    },
    [
      '@semantic-release/github',
      {
        assets: ['release-artifacts/*.tgz'],
        successComment: false,
        failComment: false,
        releasedLabels: false,
      },
    ],
  ],
};
