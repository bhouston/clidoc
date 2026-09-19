# clidoc website

The Docusaurus site lives in `packages/website`. Run `pnpm docs:build` at the repository root to regenerate the CLI reference from the CLI definitions, generate the core API pages from TSDoc, and build the site. Run `pnpm --filter @clidoc/website dev` for local development after the references have been generated.

## Cloud Run deployment

Browser smoke test: run `pnpm --filter @clidoc/website test:browser` after `BASE_URL=/ pnpm docs:build` and installing Chromium with `pnpm --filter @clidoc/website exec playwright install chromium`.

The manually dispatched `Deploy clidoc website to Cloud Run` workflow builds a static site container and deploys it to the `clidoc` Cloud Run service. It follows hdrify's reusable workflow pattern. Configure repository secret `GCP_SA_KEY` with a Google service account key that can push to Artifact Registry in `bhouston-general-hosting` and deploy Cloud Run services. The workflow uses `us-central1` and the `shared-docker-registry` repository; update these values if clidoc is hosted in another GCP project. Dispatch from `main` after the secret and GCP service are ready.

The default build URL is `https://bhouston.github.io/clidoc/` for GitHub Pages. Docker sets `BASE_URL=/` for Cloud Run. The deployment workflow reports the Cloud Run URL in its run summary and checks that the public homepage responds with clidoc content. Set the repository variable `CLIDOC_SITE_URL` to that URL (for example, `gh variable set CLIDOC_SITE_URL --body 'https://clidoc-…run.app'`), then dispatch the deployment workflow again from `main`. This rebuilds canonical links and the sitemap with the Cloud Run hostname. Until then, the Docker build uses the GitHub Pages host as its fallback `SITE_URL`.
