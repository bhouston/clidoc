---
title: Framework adapters
sidebar_position: 5
---

# Generate from existing command definitions

clidoc adapters convert framework definitions into an OpenCLI document. The resulting document can be validated, rendered, and published through either documentation integration.

First, add `mycli docgen --output cli.json` to write a document derived from the same framework definitions as your CLI. Each adapter exports a `createDocgenCommand` helper that builds this command for you, wired to `--output`/`--format`, so you only need to register it. Install the validator with `npm install -g @clidoc/cli`, then run `clidoc validate cli.json` and `clidoc markdown cli.json --output reference.md`.

For consistent discovery by documentation tools, add the hidden `mycli __opencli` subcommand to your CLI. Check for exactly that argument before normal argument parsing, print only one UTF-8 JSON OpenCLI document followed by a newline to stdout, and exit with status 0. Do not run handlers. Report errors on stderr and exit nonzero. For example, `mycli __opencli > mycli.opencli.json` captures the document for validation and rendering.

| Framework | Package                     | Entry point                                                                                |
| --------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| Commander | `@clidoc/adapter-commander` | [`fromCommander`](https://github.com/bhouston/clidoc/tree/main/packages/adapter-commander) |
| oclif     | `@clidoc/adapter-oclif`     | [`fromOclif`](https://github.com/bhouston/clidoc/tree/main/packages/adapter-oclif)         |
| yargs     | `@clidoc/adapter-yargs`     | [`fromYargs`](https://github.com/bhouston/clidoc/tree/main/packages/adapter-yargs)         |

Each snippet below registers `docgen`, answers `__opencli`, and reads the title, binary name, and version from your `package.json`. Read each adapter's README for its supported command features and how to add examples and exit codes with `mergeDocument`.

## Commander

```ts
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createDocgenCommand, fromCommander } from '@clidoc/adapter-commander';
import { handleOpenCliRequest, infoFromPackageJson } from '@clidoc/core';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const info = infoFromPackageJson(pkg);

const program = new Command(info.binary);
program
  .command('greet <name>')
  .description('Greet a person')
  .action((name: string) => {
    console.log(`Hello, ${name}!`);
  });

const document = () => fromCommander(program, info);
program.addCommand(createDocgenCommand(document));

if (!(await handleOpenCliRequest(process.argv.slice(2), document))) {
  program.parse();
}
```

## oclif

`createDocgenCommand` lives at `@clidoc/adapter-oclif/docgen` so that importing `fromOclif` never requires `@oclif/core`. Generate `manifest.json` with `oclif manifest` as part of your build.

```ts
// src/commands/docgen.ts
import { readFileSync } from 'node:fs';
import { createDocgenCommand } from '@clidoc/adapter-oclif/docgen';
import { infoFromPackageJson } from '@clidoc/core';

export default createDocgenCommand(() => ({
  manifest: JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8')),
  info: infoFromPackageJson(JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))),
}));
```

```ts
// src/index.ts
import { readFileSync } from 'node:fs';
import { run } from '@oclif/core';
import { fromOclif } from '@clidoc/adapter-oclif';
import { handleOpenCliRequest, infoFromPackageJson } from '@clidoc/core';

const document = () => {
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  return fromOclif(manifest, infoFromPackageJson(pkg));
};
const args = process.argv.slice(2);
if (!(await handleOpenCliRequest(args, document))) {
  await run(args);
}
```

## yargs

Pass the same command modules you register with yargs.

```ts
import { readFileSync } from 'node:fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createDocgenCommand, fromYargs } from '@clidoc/adapter-yargs';
import { handleOpenCliRequest, infoFromPackageJson } from '@clidoc/core';
import { command as greet } from './commands/greet.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const info = infoFromPackageJson(pkg);

const document = () => fromYargs([greet, docgen], info);
const docgen = createDocgenCommand(document);

const args = hideBin(process.argv);
if (!(await handleOpenCliRequest(args, document))) {
  yargs(args).command(greet).command(docgen).demandCommand().parse();
}
```
