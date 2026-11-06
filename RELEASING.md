# Releasing

Releases are manual and maintainer-only. Merging to `main` never publishes.

## Running a Release

```sh
gh workflow run release.yml --ref main                  # release
gh workflow run release.yml --ref main -f dry_run=true  # preview only, publishes nothing
```

When there are no release-worthy commits since the last `v*` tag, the run is a no-op.

## What the Workflow Does

1. Refuses any ref other than `main`.
2. Runs the full CI workflow on the dispatched commit.
3. Stops if `main` has moved since the dispatch.
4. Installs, builds, and runs `pnpm release`, which is semantic-release.
5. semantic-release computes the next version, creates the `v<version>` tag and GitHub Release, and publishes.

Releases run one at a time and never cancel a publish in progress. npm packages publish through npm trusted publishing (GitHub OIDC), so no `NPM_TOKEN` is stored.

## Versioning

The version comes from the Conventional Commits since the last `v*` tag. The highest change wins:

- `feat` produces a minor release.
- `fix` and `perf` produce a patch release.
- `!` or a `BREAKING CHANGE:` footer produces a major release.
- Other types do not trigger a release.

Everything this repository publishes shares one version. `package.json` versions in source are development snapshots; the Git tag and the registry hold the released version. [GitHub Releases](https://github.com/bhouston/clidoc/releases) is the changelog of record.

## One-Time Setup

1. On npmjs.com, open each package's Trusted Publisher settings, choose GitHub Actions, and enter:

   | Field                | Value         |
   | -------------------- | ------------- |
   | Organization or user | `bhouston`    |
   | Repository           | `clidoc`      |
   | Workflow filename    | `release.yml` |
   | Environment name     | `npm`         |

2. Protect `main`: require pull requests and the CI checks, allow merge commits, and block force pushes and deletion.
3. If the repository uploads coverage to Codecov, add the `CODECOV_TOKEN` repository secret.

## Recovery

Publishing is not atomic. If a run fails part way, compare the registry versions, the `v<version>` tag, and the workflow log, then finish what is missing from the same release commit. If publishing succeeded but the GitHub Release failed, create the release from the existing tag. Never republish a version, delete a published version, or move a release tag. Resolve the failure before dispatching another release.

## Repository Specifics

### Published Artifacts

- npm packages, all sharing one version and published in dependency order: `@clidoc/core`, `@clidoc/commander`, `@clidoc/oclif`, `@clidoc/yargs`, `@clidoc/cli`, `@clidoc/docusaurus`, and `@clidoc/vitepress`.
- Each package's npm tarball, attached to the GitHub Release.
- The website at `clidoc.dev`, deployed after each published release (see Website).

Publishing goes through `@anolilab/semantic-release-pnpm`, one plugin instance per package, so `pnpm publish` resolves `workspace:*` dependencies to concrete versions. `@clidoc/website` and the demos are private and never published.

### Required Checks

`main` requires `ci (macos-latest)`, `ci (ubuntu-latest)`, `contribution`, and `Website browser smoke`.

### Website

The Release workflow calls `pages.yml` after each published release. It builds `packages/website` from the new `v<version>` tag, with that version in the CLI reference, and deploys with the built-in `GITHUB_TOKEN`. Dry runs and runs that publish nothing do not deploy. To redeploy the latest release, run `gh workflow run pages.yml --ref main` (optionally with `-f ref=v<version>`).

One-time Pages setup:

```sh
gh api repos/bhouston/clidoc/pages -X POST -f build_type=workflow
gh api repos/bhouston/clidoc/pages -X PUT -f cname=clidoc.dev -F https_enforced=true
```

DNS for `clidoc.dev` is on Cloudflare: the four GitHub Pages `A` records (`185.199.108-111.153`), the four `AAAA` records (`2606:50c0:8000-8003::153`), and `CNAME www` pointing to `bhouston.github.io`. Keep records DNS-only until GitHub issues the certificate, then proxy with SSL mode Full (strict).
