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

The workflow runs on GitHub-hosted Ubuntu with `id-token: write` and the Node
version from `.nvmrc`. It uses OIDC; do not configure a long-lived npm token.
The built-in `GITHUB_TOKEN` creates tags and GitHub Releases. The first publish of a new package cannot use trusted publishing. From a clean
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
initial publish, configure its trusted publisher. The `publish/` output is a
local artifact and should not be committed.

## GitHub configuration

Keep `main` as the integration branch. Enable merge commits and disable squash
merges. Protect `main` with required PRs and the checks `Quality
(macos-latest)`, `Quality (ubuntu-latest)`, and `PR policy`. Repository rules
must allow the Actions token to create package version tags.

The `Release` workflow runs only through manual dispatch on `main`:
`gh workflow run release.yml --ref main`. Use `-f dry_run=true` to verify a
release without publishing. Merging a PR does not publish.

## Version baseline

Packages start at `0.1.0`. After the staged `0.1.0` bootstrap publish, create
`<package>-v0.1.0` baseline tags on the exact commit used for staging and push
them. Use the full scoped package name in each tag (for example,
`@clidoc/core-v0.1.0`). These tags keep the first automated release based on
commits after the bootstrap. Without baseline tags, semantic-release treats the
project as unreleased and may compute a different first version.

## GitHub Pages

In repository Settings → Pages, set the source to **GitHub Actions**. The
`pages.yml` workflow builds the Docusaurus demo from `main` and deploys it to
the `github-pages` environment. Enable Pages and allow that environment before
expecting the first deployment. The workflow uses the repository's built-in
`GITHUB_TOKEN`; no separate deployment secret is needed.

## Recovery

If npm succeeded but GitHub release creation failed, recover the GitHub
release from the existing tag. Do not republish the same npm version.
