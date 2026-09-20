# Yargs demo

Run `pnpm --filter @clidoc/demo-yargs build`, then `pnpm --filter @clidoc/demo-yargs start greet Ada` to run the command or `pnpm --filter @clidoc/demo-yargs start __opencli` to print its OpenCLI document as JSON.

Generate the OpenCLI file with `pnpm --filter @clidoc/demo-yargs start docgen --output cli.json`, or render Markdown directly with `pnpm --filter @clidoc/demo-yargs start docgen --format markdown --output reference.md`. Install the validator with `npm install -g @clidoc/cli`, then run `clidoc validate cli.json`. The hidden `__opencli` subcommand prints the same document for machine discovery.
