# clidoc website

The Docusaurus site lives in `packages/website`. Run `pnpm docs:build` at the repository root to regenerate the CLI reference from the CLI definitions, generate the core API pages from TSDoc, and build the site. Run `pnpm --filter @clidoc/website dev` for local development after the references have been generated.

## Cloud Run deployment

Browser smoke test: run `pnpm --filter @clidoc/website test:browser` after `BASE_URL=/ pnpm docs:build` and installing Chromium with `pnpm --filter @clidoc/website exec playwright install chromium`.

The manually dispatched `Deploy clidoc website to Cloud Run` workflow builds a static site container and deploys it to the `clidoc` Cloud Run service. It follows hdrify's reusable workflow pattern. Configure repository secret `GCP_SA_KEY` with a Google service account key that can push to Artifact Registry in `bhouston-general-hosting` and deploy Cloud Run services. The workflow uses `us-central1` and the `shared-docker-registry` repository; update these values if clidoc is hosted in another GCP project. Dispatch from `main` after the secret and GCP service are ready.

The default build URL is `https://bhouston.github.io/clidoc/` for GitHub Pages. Docker sets `BASE_URL=/` for Cloud Run. Set the repository variable `CLIDOC_SITE_URL` to the eventual Cloud Run hostname for canonical links and sitemap; its fallback is the GitHub Pages host. The deployment workflow passes it as the `SITE_URL` Docker build argument.
