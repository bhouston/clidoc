# Releasing

Releases are manual and maintainer-only. Merging to `main` never publishes.

## Running a release

```sh
gh workflow run release.yml --ref main            # publish
gh workflow run release.yml --ref main -f dry_run=true   # validate only
```

The workflow re-runs CI, checks that every package has a baseline tag, builds,
and runs `pnpm release`. That runs `semantic-release -e semantic-release-monorepo`
once per package under `packages/` in dependency order. Each package is versioned
from the commits that touch it and tagged `<package>-v<version>`, for example
`@clidoc/core-v1.2.0`. Packages are staged with concrete versions in place of
`workspace:` ranges and published to npm with trusted publishing (OIDC); no npm
token is stored. Source `package.json` versions are never bumped. Demos are
private and never published.

## Bootstrapping a new or renamed package

Trusted publishing cannot create a package, so the first version is published by
hand. From a clean `main` checkout:

1. `pnpm install --frozen-lockfile && pnpm release:bootstrap:stage`, then
   `npm publish ./publish/<dir> --access public` for each new package, using an
   npm account authorized for `@clidoc`. Do not publish from `packages/` and do
   not commit `publish/`.
2. On npm, open the package's Settings → Trusted publishing, choose GitHub
   Actions, and enter user `bhouston`, repository `clidoc`, workflow
   `release.yml`, environment blank. Also allow direct `npm publish`; new
   configurations default to `npm stage publish` only.
3. Tag the commit you staged from and push the tag:

   ```sh
   git tag '@clidoc/<name>-v0.1.0' <commit>
   git push origin '@clidoc/<name>-v0.1.0'
   ```

`node scripts/check-release-baselines.mjs` lists any package still missing its
tag; the Release workflow refuses to run until none are missing. Never move a
baseline tag. Tags for retired package names can stay; nothing reads them.

## GitHub configuration

`main` is protected: PRs required, merge commits only, and the checks
`Quality (macos-latest)`, `Quality (ubuntu-latest)`, `PR policy`, and
`Website browser smoke`. Repository rules must let the Actions token push
`<package>-v*` tags.

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
versions, tags, and the workflow log, then finish the missing packages from the
same release commit. If npm succeeded but the GitHub Release failed, create the
release from the existing tag; never republish an npm version.
