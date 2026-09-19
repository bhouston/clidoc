# clidoc website

The Docusaurus site lives in `packages/website`. Run `pnpm docs:build` at the repository root to regenerate the CLI reference from the CLI definitions, generate the core API pages from TSDoc, and build the site. Run `pnpm --filter @clidoc/website dev` for local development after the references have been generated.

## Cloud Run deployment

The manually dispatched `Deploy clidoc website to Cloud Run` workflow builds a static site container and deploys it to the `clidoc` Cloud Run service. It follows hdrify's reusable workflow pattern. Configure repository secret `GCP_SA_KEY` with a Google service account key that can push to Artifact Registry in `bhouston-general-hosting` and deploy Cloud Run services. The workflow uses `us-central1` and the `shared-docker-registry` repository; update these values if clidoc is hosted in another GCP project. Dispatch from `main` after the secret and GCP service are ready.

The site uses `https://clidoc.dev` as its production URL. Update `url` in `docusaurus.config.js` if the custom domain changes.
