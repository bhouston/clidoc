import { fileURLToPath } from 'node:url';

const prepare = fileURLToPath(new URL('./scripts/release-prep.mjs', import.meta.url));
const record = fileURLToPath(new URL('./scripts/release-record.mjs', import.meta.url));

export default {
  branches: ['main'],
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    prepare,
    ['@semantic-release/npm', { pkgRoot: process.env.OPENCLI_RELEASE_PKG_ROOT ?? '.' }],
    record,
    [
      '@semantic-release/github',
      { assets: ['CHANGELOG.md'], successComment: false, failComment: false, releasedLabels: false },
    ],
  ],
};
