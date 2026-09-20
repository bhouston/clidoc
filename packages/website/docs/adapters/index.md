---
title: Framework adapters
sidebar_position: 5
---

# Generate from existing command definitions

clidoc adapters convert framework definitions into an OpenCLI document. The resulting document can be validated, rendered, and published through either documentation integration.

First, add `mycli docgen --output cli.json` to write a document derived from the same framework definitions as your CLI. Install the validator with `npm install -g @clidoc/cli`, then run `clidoc validate cli.json` and `clidoc markdown cli.json --output reference.md`.

For consistent discovery by documentation tools, add the hidden `mycli __opencli` subcommand to your CLI. Check for exactly that argument before normal argument parsing, print only one UTF-8 JSON OpenCLI document followed by a newline to stdout, and exit with status 0. Do not run handlers. Report errors on stderr and exit nonzero. For example, `mycli __opencli > mycli.opencli.json` captures the document for validation and rendering.

| Framework | Package                     | Entry point                                                                                |
| --------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| Commander | `@clidoc/adapter-commander` | [`fromCommander`](https://github.com/bhouston/clidoc/tree/main/packages/adapter-commander) |
| oclif     | `@clidoc/adapter-oclif`     | [`fromOclif`](https://github.com/bhouston/clidoc/tree/main/packages/adapter-oclif)         |
| yargs     | `@clidoc/adapter-yargs`     | [`fromYargs`](https://github.com/bhouston/clidoc/tree/main/packages/adapter-yargs)         |

Read each adapter's README for a complete entry-point example and its supported command features.
