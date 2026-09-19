# Commander demo

Run `pnpm --filter @clidoc/demo-commander build`, then `pnpm --filter @clidoc/demo-commander start greet Ada` to run the command or `pnpm --filter @clidoc/demo-commander start __opencli` to print its OpenCLI document as JSON. `pnpm --filter @clidoc/demo-commander start --opencli` also works as a clidoc-only compatibility alias.

Generate the OpenCLI file with `pnpm --filter @clidoc/demo-commander start docgen --output cli.json`, or render Markdown directly with `pnpm --filter @clidoc/demo-commander start docgen --format markdown --output reference.md`. Install the validator with `npm install -g @clidoc/cli`, then run `clidoc validate cli.json`. The hidden `__opencli` subcommand prints the same document for machine discovery.
