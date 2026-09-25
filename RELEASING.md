# Releasing

Releases are manual and maintainer-only. Merging to `main` never publishes.

## Running a release

```sh
gh workflow run release.yml --ref main            # publish
gh workflow run release.yml --ref main -f dry_run=true   # validate only
```

The workflow re-runs CI, builds, and runs `pnpm release` (`semantic-release`).
Semantic-release analyzes Conventional Commits since the last `v*` tag: `feat`
produces a minor, `fix`/`perf` a patch, and `!`/`BREAKING CHANGE:` a major; the
highest change wins. All seven published packages (`@clidoc/core`,
`@clidoc/commander`, `@clidoc/oclif`, `@clidoc/yargs`, `@clidoc/cli`,
`@clidoc/docusaurus`, `@clidoc/vitepress`) share one version and publish in
dependency order via `pnpm publish` (through `@anolilab/semantic-release-pnpm`,
one plugin instance per package), which resolves `workspace:*` internal
dependencies to a resolved semver range natively — no staging step needed.
Publishing uses npm trusted publishing (OIDC); no npm token is stored. Source
`package.json` versions are development snapshots; the authoritative released
version is the Git tag (`v<version>`) and npm version. Demos and
`@clidoc/website` are private and never published.

Each GitHub Release contains generated release notes and every package's npm
tarball; there is no `CHANGELOG.md` (the GitHub Releases page is the changelog
of record).

## One-time activation

1. On npmjs.com, open Settings → Trusted Publisher for each of the seven
   packages above. Select GitHub Actions and enter organization/user
   `bhouston`, repository `clidoc`, workflow filename `release.yml`,
   environment name blank.
2. `@clidoc/core` and `@clidoc/cli` are already published at `1.0.0`; the
   other five packages are published at `0.1.0` even though their
   `package.json` now reads `1.0.0` (the shared baseline version). **No
   `v1.0.0` tag exists yet.** Before the first dispatch, the maintainer must
   either:
   - tag the commit these packages were bumped to `1.0.0` from as `v1.0.0`
     (`git tag v1.0.0 <commit> && git push origin v1.0.0`) so semantic-release
     resumes from there, or
   - accept that the first release starts fresh at `1.0.0`, which will
     conflict with the already-published `@clidoc/core@1.0.0` and
     `@clidoc/cli@1.0.0` npm versions (npm publish is not overwritable) unless
     those two packages' next Conventional Commit changes bump past `1.0.0`.
3. `main` is protected: PRs required, merge commits only, and the checks
   `ci (macos-latest)`, `ci (ubuntu-latest)`, `contribution`, and `Website
browser smoke`.

## GitHub Pages

`pages.yml` builds `packages/website` on every push to `main` and deploys with
the built-in `GITHUB_TOKEN`. One-time setup:

```sh
gh api repos/bhouston/clidoc/pages -X POST -f build_type=workflow
gh api repos/bhouston/clidoc/pages -X PUT -f cname=clidoc.dev -F https_enforced=true
```

DNS for `clidoc.dev` is on Cloudflare: the four GitHub Pages `A` records
(`185.199.108-111.153`), the four `AAAA` records (`2606:50c0:8000-8003::153`),
and `CNAME www → bhouston.github.io`. Keep records DNS-only until the GitHub
certificate is issued, then proxy with SSL mode Full (strict).

## Recovery

Publishing is not atomic across packages. If a run fails part way, compare npm
versions, the `v<version>` tag, and the workflow log, then finish the missing
packages from the same release commit. If npm succeeded but the GitHub
Release failed, create the release from the existing tag; never republish an
npm version.
