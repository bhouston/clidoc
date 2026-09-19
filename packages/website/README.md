# clidoc website

The Docusaurus site lives in `packages/website` and uses [clidoc.ben3d.ca](https://clidoc.ben3d.ca/) as its canonical URL. Run `pnpm docs:build` at the repository root to regenerate the CLI reference from the CLI definitions, generate the core API pages from TSDoc, and build the site. Run `pnpm --filter @clidoc/website dev` for local development after the references have been generated. Set `SITE_URL` or `BASE_URL` when building for a different host or path.

## Cloud Run deployment

Browser smoke test: run `pnpm --filter @clidoc/website test:browser` after `SITE_URL=http://127.0.0.1 BASE_URL=/ pnpm docs:build` and installing Chromium with `pnpm --filter @clidoc/website exec playwright install chromium`.

The manually dispatched `Deploy clidoc website to Cloud Run` workflow builds a static site container and deploys it to the `clidoc` Cloud Run service. It follows hdrify's reusable workflow pattern. Configure repository secret `GCP_SA_KEY` with a Google service account key that can push to Artifact Registry in `bhouston-general-hosting` and deploy Cloud Run services. The workflow uses `us-central1` and the `shared-docker-registry` repository; update these values if clidoc is hosted in another GCP project. Dispatch from `main` after the secret and GCP service are ready.

Builds use `https://clidoc.ben3d.ca/` for canonical links and the sitemap. The deployment workflow reports the Cloud Run URL in its run summary and checks that the public homepage responds with clidoc content. Point the custom domain at the Cloud Run service through its hosting configuration. If deploying to another hostname, set the repository variable `CLIDOC_SITE_URL` before dispatching the workflow; it overrides the default canonical URL. The manually dispatched GitHub Pages workflow also builds with the clidoc domain as the canonical URL.
