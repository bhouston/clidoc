# Commander demo

Run `pnpm --filter @clidoc/demo-commander build`, then `pnpm --filter @clidoc/demo-commander start -- greet Ada` to run the command or `pnpm --filter @clidoc/demo-commander start -- --opencli` to print its OpenCLI document as JSON.

Generate the OpenCLI file with `pnpm --filter @clidoc/demo-commander start -- docgen --output cli.json`. Install the renderer with `npm install -g @clidoc/cli`, then run `clidoc validate cli.json` and `clidoc markdown cli.json --output reference.md`. Standalone `--opencli` prints the same document for discovery.
