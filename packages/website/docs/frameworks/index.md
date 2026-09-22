---
title: Framework integrations
sidebar_position: 5
---

# Generate from existing command definitions

clidoc framework packages convert command definitions into an OpenCLI document. The resulting document can be validated, rendered, and published through either documentation integration.

First, add `mycli docgen --output cli.json` to write a document derived from the same framework definitions as your CLI. Each framework package exports a `createDocgenCommand` helper that builds this command for you, wired to `--output`/`--format`, so you only need to register it. Install the validator with `npm install -g @clidoc/cli`, then run `clidoc validate cli.json` and `clidoc markdown cli.json --output reference.md`.

For consistent discovery by documentation tools, you can optionally add the hidden `mycli __opencli` subcommand to your CLI too. Check for exactly that argument before normal argument parsing, print only one UTF-8 JSON OpenCLI document followed by a newline to stdout, and exit with status 0. Do not run handlers. Report errors on stderr and exit nonzero. For example, `mycli __opencli > mycli.opencli.json` captures the document for validation and rendering. See each package's README for the `handleOpenCliRequest` snippet that wires this up.

| Framework | Package             | Entry point                                                                        |
| --------- | ------------------- | ---------------------------------------------------------------------------------- |
| Commander | `@clidoc/commander` | [`fromCommander`](https://github.com/bhouston/clidoc/tree/main/packages/commander) |
| oclif     | `@clidoc/oclif`     | [`fromOclif`](https://github.com/bhouston/clidoc/tree/main/packages/oclif)         |
| yargs     | `@clidoc/yargs`     | [`fromYargs`](https://github.com/bhouston/clidoc/tree/main/packages/yargs)         |

Each snippet below registers `docgen` and reads the title, binary name, and version from your `package.json`. Read each package's README for its supported command features, how to add examples and exit codes with `mergeDocument`, and how to add `__opencli`.

## Commander

```ts
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createDocgenCommand, fromCommander } from '@clidoc/commander';
import { infoFromPackageJson } from '@clidoc/core';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const info = infoFromPackageJson(pkg);

const program = new Command(info.binary);
program
  .command('greet <name>')
  .description('Greet a person')
  .action((name: string) => {
    console.log(`Hello, ${name}!`);
  });

// generate an OpenCLI document from the same commands
const document = () => fromCommander(program, info);
// add a docgen command that returns the document on demand
program.addCommand(createDocgenCommand(document));
program.parse();
```

## oclif

`createDocgenCommand` lives at `@clidoc/oclif/docgen` so that importing `fromOclif` never requires `@oclif/core`. Generate `manifest.json` with `oclif manifest` as part of your build. `docgen` is exported as an ordinary command, so `src/index.ts` needs no changes.

```ts
// src/commands/docgen.ts
import { readFileSync } from 'node:fs';
import { createDocgenCommand } from '@clidoc/oclif/docgen';
import { infoFromPackageJson } from '@clidoc/core';

export default createDocgenCommand(() => ({
  manifest: JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8')),
  info: infoFromPackageJson(JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))),
}));
```

## yargs

`fromYargs` discovers the registered top-level commands straight from the configured `yargs(...)` instance.

```ts
import { readFileSync } from 'node:fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createDocgenCommand, fromYargs } from '@clidoc/yargs';
import { infoFromPackageJson } from '@clidoc/core';
import { command as greet } from './commands/greet.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const info = infoFromPackageJson(pkg);

const parser = yargs(hideBin(process.argv)).command(greet);

let document;
parser.command(createDocgenCommand(() => document)).demandCommand();
// generate the document once every command, including docgen, is registered
document = fromYargs(parser, info);

parser.parse();
```
