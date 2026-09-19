# Release setup and operation

This monorepo publishes packages from `packages/`: `@clidoc/core`,
`@clidoc/adapter-yargs`, `@clidoc/adapter-commander`,
`@clidoc/adapter-oclif`, `@clidoc/cli`, `@clidoc/docusaurus`, and
`@clidoc/vitepress`. The demos under `demos/` are private and never published.
`pnpm release` runs `semantic-release -e semantic-release-monorepo` once per
package in dependency order. Commits touching each package determine its version
independently. Tags have the form `<package>-v<version>`. The release runner
creates a temporary package staging directory for each publish. It copies the
files included by `npm pack`, writes the computed release version, and resolves
`workspace:` dependencies to concrete versions from packages already published
in the same run or from npm. `@semantic-release/npm` publishes the staged
package through npm trusted publishing. Source package versions remain unchanged.
If a required dependency has never been published, release the dependency first.
The `pnpm package:check` gate verifies that staging produces publishable manifests
without `workspace:` ranges.

## npm trusted publisher

For each package, open Settings → Trusted publishing on npm, choose GitHub
Actions, and enter:

| Field                | Value         |
| -------------------- | ------------- |
| Organization or user | `bhouston`    |
| Repository           | `clidoc`      |
| Workflow filename    | `release.yml` |
| Environment          | Leave blank   |

For configurations created after September 3, 2026, npm initially permits
`npm stage publish`. Explicitly allow direct `npm publish` for **each of the
seven packages**, since this workflow publishes directly. Each package's
`repository.url` matches `github.com/bhouston/clidoc`.

The workflow runs on GitHub-hosted Ubuntu with `id-token: write` and the Node
version from `.nvmrc`. It uses OIDC; do not configure a long-lived npm token.
The built-in `GITHUB_TOKEN` creates tags and GitHub Releases. The first publish
of a new package cannot use trusted publishing. Sign into npm with an account
authorized for `@clidoc` and satisfying npm's 2FA requirement, or use an
appropriate publishing token. Confirm that the scope allows public packages.
From a clean
checkout of `main`, run `pnpm install --frozen-lockfile` and
`pnpm release:bootstrap:stage`. This builds all packages and creates
`publish/<package>/` directories with concrete dependency versions. Review each
`publish/<package>/package.json`, then publish from those staged directories in
dependency order with an npm account authorized for the `@clidoc` scope:

```sh
npm publish ./publish/core --access public
npm publish ./publish/adapter-commander --access public
npm publish ./publish/adapter-oclif --access public
npm publish ./publish/adapter-yargs --access public
npm publish ./publish/cli --access public
npm publish ./publish/docusaurus --access public
npm publish ./publish/vitepress --access public
```

Each staged package starts at the source version `0.1.0`. Do not publish from
`packages/`: those manifests still contain `workspace:` ranges. After each
initial publish, configure its trusted publisher and allow direct publishing.
The `publish/` output is a
local artifact and should not be committed.

## GitHub configuration

Keep `main` as the integration branch. Enable merge commits and disable squash
merges. Protect `main` with required PRs and the checks `Quality
(macos-latest)`, `Quality (ubuntu-latest)`, `PR policy`, `Website browser smoke`,
and `Website container build`. Repository rules
must allow the Actions token to create package version tags.

The `Release` workflow runs only through manual dispatch on `main`:
`gh workflow run release.yml --ref main`. Publishing remains disabled until
the repository Actions variable `NPM_RELEASE_ENABLED` is `true`. Keep it unset
until all seven packages are bootstrapped publicly, their trusted publishers
allow direct publishing, and the baseline tags exist. Then activate with
`gh variable set NPM_RELEASE_ENABLED --body true`. Run
`gh workflow run release.yml --ref main -f dry_run=true` to preview after
activation. Before activation, dispatches run CI but skip the release job,
including semantic-release: npm cannot verify OIDC for an unpublished package.
After activation, dry runs require all seven baseline tags and exercise
semantic-release without publishing or creating tags. Merging a PR does not publish.

## Version baseline

Packages start at `0.1.0`. After the staged `0.1.0` bootstrap publish, create
`<package>-v0.1.0` baseline tags on the exact commit used for staging and push
them. Use the full scoped package name in each tag (for example,
`@clidoc/core-v0.1.0`). These tags keep the first automated release based on
commits after the bootstrap. Without baseline tags, semantic-release treats the
project as unreleased and may compute a different first version.

Create all seven tags at the exact main commit used for staging and publishing:

```sh
git tag '@clidoc/core-v0.1.0' <bootstrap-commit>
git tag '@clidoc/adapter-commander-v0.1.0' <bootstrap-commit>
git tag '@clidoc/adapter-oclif-v0.1.0' <bootstrap-commit>
git tag '@clidoc/adapter-yargs-v0.1.0' <bootstrap-commit>
git tag '@clidoc/cli-v0.1.0' <bootstrap-commit>
git tag '@clidoc/docusaurus-v0.1.0' <bootstrap-commit>
git tag '@clidoc/vitepress-v0.1.0' <bootstrap-commit>
git push origin \
  '@clidoc/core-v0.1.0' \
  '@clidoc/adapter-commander-v0.1.0' \
  '@clidoc/adapter-oclif-v0.1.0' \
  '@clidoc/adapter-yargs-v0.1.0' \
  '@clidoc/cli-v0.1.0' \
  '@clidoc/docusaurus-v0.1.0' \
  '@clidoc/vitepress-v0.1.0'
```

Never move a baseline tag after activation. Run
`node scripts/check-release-baselines.mjs` to check the tags locally.

## GitHub Pages

In repository Settings → Pages, set the source to **GitHub Actions**. The
`pages.yml` workflow builds the clidoc website from `packages/website` on
`main` and deploys it to the `github-pages` environment. Enable Pages and allow that environment before
expecting the first deployment. The workflow uses the repository's built-in
`GITHUB_TOKEN`; no separate deployment secret is needed.

## Recovery

If npm succeeded but GitHub release creation failed, recover the GitHub
release from the existing tag. Do not republish the same npm version.
Publishing across seven packages is not atomic. If a run partially publishes,
compare npm versions, tags, and workflow logs before retrying. Finish missing
packages from the same release commit.
