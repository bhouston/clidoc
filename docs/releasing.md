# Release setup and operation

This monorepo publishes packages from `packages/`: `@clidoc/core`,
`@clidoc/yargs`, `@clidoc/commander`,
`@clidoc/oclif`, `@clidoc/cli`, `@clidoc/docusaurus`, and
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
npm publish ./publish/commander --access public
npm publish ./publish/oclif --access public
npm publish ./publish/yargs --access public
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
`gh workflow run release.yml --ref main`. Every dispatch runs CI, then the
release job, which requires all seven baseline tags before semantic-release
runs. Pass `-f dry_run=true` to exercise semantic-release without publishing or
creating tags. Merging a PR does not publish.

## Version baseline

Packages start at `0.1.0`. After the staged `0.1.0` bootstrap publish, create
`<package>-v0.1.0` baseline tags on the exact commit used for staging and push
them. Use the full scoped package name in each tag (for example,
`@clidoc/core-v0.1.0`). These tags keep the first automated release based on
commits after the bootstrap. Without baseline tags, semantic-release treats the
project as unreleased and may compute a different first version.

Create each tag at the exact main commit used for staging and publishing that
package. A baseline only has to be an ancestor of `main`; packages bootstrapped
at different times carry tags on different commits.

```sh
git tag '@clidoc/core-v0.1.0' <bootstrap-commit>
git tag '@clidoc/commander-v0.1.0' <bootstrap-commit>
git tag '@clidoc/oclif-v0.1.0' <bootstrap-commit>
git tag '@clidoc/yargs-v0.1.0' <bootstrap-commit>
git tag '@clidoc/cli-v0.1.0' <bootstrap-commit>
git tag '@clidoc/docusaurus-v0.1.0' <bootstrap-commit>
git tag '@clidoc/vitepress-v0.1.0' <bootstrap-commit>
git push origin \
  '@clidoc/core-v0.1.0' \
  '@clidoc/commander-v0.1.0' \
  '@clidoc/oclif-v0.1.0' \
  '@clidoc/yargs-v0.1.0' \
  '@clidoc/cli-v0.1.0' \
  '@clidoc/docusaurus-v0.1.0' \
  '@clidoc/vitepress-v0.1.0'
```

Never move a baseline tag after activation. Run
`node scripts/check-release-baselines.mjs` to check the tags locally.

### Renamed framework packages

`@clidoc/adapter-yargs`, `@clidoc/adapter-commander`, and `@clidoc/adapter-oclif`
were renamed to `@clidoc/yargs`, `@clidoc/commander`, and `@clidoc/oclif`. On npm
these are new packages with no publish history, so before the next `Release`
dispatch the maintainer must, from a clean `main` checkout:

1. Run `pnpm install --frozen-lockfile` and `pnpm release:bootstrap:stage`, then
   `npm publish ./publish/<name> --access public` for `commander`, `oclif`, and
   `yargs` only; the other packages are already published.
2. Configure the npm trusted publisher for each of the three new packages and
   allow direct `npm publish`, as described above.
3. Tag that commit `@clidoc/commander-v0.1.0`, `@clidoc/oclif-v0.1.0`, and
   `@clidoc/yargs-v0.1.0` and push the tags.
4. Optionally `npm deprecate` the three `@clidoc/adapter-*` packages, pointing at
   their replacements. The old `@clidoc/adapter-*-v0.1.0` tags can stay; nothing
   reads them.

Until step 3 is done, `node scripts/check-release-baselines.mjs` reports the
three missing tags and the `Release` workflow stops before publishing.

## GitHub Pages

The `pages.yml` workflow builds the clidoc website from `packages/website` on
every push to `main` and deploys it to the `github-pages` environment using the
built-in `GITHUB_TOKEN`; no deployment secret is needed. It can also be
dispatched manually with `gh workflow run pages.yml --ref main`.

One-time repository setup (Settings → Pages, or the equivalent API calls):

```sh
gh api repos/bhouston/clidoc/pages -X POST -f build_type=workflow
gh api repos/bhouston/clidoc/pages -X PUT -f cname=clidoc.dev -F https_enforced=true
```

The first command sets the Pages source to **GitHub Actions**. The second sets
the custom domain; a `CNAME` file in the build is ignored for Actions
deployments. Run `https_enforced=true` again after DNS resolves if the first
call reports the certificate is still provisioning.

DNS for `clidoc.dev` is managed on Cloudflare. Point the apex at GitHub Pages
and keep the records **DNS only** (grey cloud) until the GitHub certificate is
issued; proxying can be re-enabled afterwards with SSL/TLS mode
**Full (strict)**:

| Type  | Name  | Value                 |
| ----- | ----- | --------------------- |
| A     | `@`   | `185.199.108.153`     |
| A     | `@`   | `185.199.109.153`     |
| A     | `@`   | `185.199.110.153`     |
| A     | `@`   | `185.199.111.153`     |
| AAAA  | `@`   | `2606:50c0:8000::153` |
| AAAA  | `@`   | `2606:50c0:8001::153` |
| AAAA  | `@`   | `2606:50c0:8002::153` |
| AAAA  | `@`   | `2606:50c0:8003::153` |
| CNAME | `www` | `bhouston.github.io`  |

Remove any records that still point at the retired Cloud Run service.

## Recovery

If npm succeeded but GitHub release creation failed, recover the GitHub
release from the existing tag. Do not republish the same npm version.
Publishing across seven packages is not atomic. If a run partially publishes,
compare npm versions, tags, and workflow logs before retrying. Finish missing
packages from the same release commit.
