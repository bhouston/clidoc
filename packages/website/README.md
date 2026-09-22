# clidoc website

The Docusaurus site lives in `packages/website` and uses [clidoc.dev](https://clidoc.dev/) as its canonical URL. Run `pnpm docs:build` at the repository root to regenerate the CLI reference from the CLI definitions, generate the core API pages from TSDoc, and build the site. Run `pnpm --filter @clidoc/website dev` for local development after the references have been generated. Set `SITE_URL` or `BASE_URL` when building for a different host or path.

## GitHub Pages deployment

Browser smoke test: run `pnpm --filter @clidoc/website test:browser` after `SITE_URL=http://127.0.0.1 BASE_URL=/ pnpm docs:build` and installing Chromium with `pnpm --filter @clidoc/website exec playwright install chromium`.

The `Deploy website to GitHub Pages` workflow (`.github/workflows/pages.yml`) runs on every push to `main` and can also be dispatched manually. It runs `pnpm docs:build`, uploads `packages/website/build` as a Pages artifact, and deploys it to the `github-pages` environment with the built-in `GITHUB_TOKEN`. No container, registry, or cloud credentials are involved.

Builds use `https://clidoc.dev/` for canonical links and the sitemap. See [release setup](../../docs/releasing.md#github-pages) for the one-time Pages, custom domain, and Cloudflare DNS configuration.
