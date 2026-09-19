# oclif demo

Run `pnpm --filter @clidoc/demo-oclif build`, then `pnpm --filter @clidoc/demo-oclif start -- greet Ada` to run the command or `pnpm --filter @clidoc/demo-oclif start -- --opencli` to print its OpenCLI document as JSON. The conversion reads the same metadata shape emitted into oclif's `manifest.json`.

Generate the OpenCLI file with `pnpm --filter @clidoc/demo-oclif start -- docgen --output cli.json`, or render Markdown directly with `pnpm --filter @clidoc/demo-oclif start -- docgen --format markdown --output reference.md`. Install the validator with `npm install -g @clidoc/cli`, then run `clidoc validate cli.json`. Standalone `--opencli` prints the same document for discovery.
