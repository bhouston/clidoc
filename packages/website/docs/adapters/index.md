---
title: Framework adapters
sidebar_position: 5
---

# Generate from existing command definitions

clidoc adapters convert framework definitions into an OpenCLI document. The resulting document can be validated, rendered, and published through either [documentation integration](/docs/guides/publishing).

- [Commander](#commander)
- [oclif](#oclif)
- [yargs](#yargs)

Each adapter exports a `createDocgenCommand` helper that adds a `mycli docgen --output cli.json` command to your CLI, wired to `--output`/`--format`. The snippets below register `docgen` and read the title, binary name, and version from your `package.json`. Install the validator with `npm install -g @clidoc/cli`, then run `clidoc validate cli.json` and `clidoc markdown cli.json --output reference.md`.

For consistent discovery by documentation tools, you can optionally add the hidden `mycli __opencli` subcommand to your CLI too. Check for exactly that argument before normal argument parsing, print only one UTF-8 JSON OpenCLI document followed by a newline to stdout, and exit with status 0. Do not run handlers. Report errors on stderr and exit nonzero. Each adapter's README has the `handleOpenCliRequest` snippet that wires this up.

## Commander

```sh
npm install @clidoc/adapter-commander @clidoc/core commander
```

[GitHub](https://github.com/bhouston/clidoc/tree/main/packages/adapter-commander) · [npm](https://www.npmjs.com/package/@clidoc/adapter-commander)

```ts
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createDocgenCommand, fromCommander } from '@clidoc/adapter-commander';
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

More information, including supported command features, `mergeDocument`, and `__opencli`, is in the [README](https://www.npmjs.com/package/@clidoc/adapter-commander) of the npm module.

## oclif

```sh
npm install @clidoc/adapter-oclif @clidoc/core @oclif/core
```

[GitHub](https://github.com/bhouston/clidoc/tree/main/packages/adapter-oclif) · [npm](https://www.npmjs.com/package/@clidoc/adapter-oclif)

`createDocgenCommand` lives at `@clidoc/adapter-oclif/docgen` so that importing `fromOclif` never requires `@oclif/core`. Generate `manifest.json` with `oclif manifest` as part of your build. `docgen` is exported as an ordinary command, so `src/index.ts` needs no changes.

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

More information, including supported command features, `mergeDocument`, and `__opencli`, is in the [README](https://www.npmjs.com/package/@clidoc/adapter-oclif) of the npm module.

## yargs

```sh
npm install @clidoc/adapter-yargs @clidoc/core yargs
```

[GitHub](https://github.com/bhouston/clidoc/tree/main/packages/adapter-yargs) · [npm](https://www.npmjs.com/package/@clidoc/adapter-yargs)

`fromYargs` discovers the registered top-level commands straight from the configured `yargs(...)` instance.

```ts
import { readFileSync } from 'node:fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createDocgenCommand, fromYargs } from '@clidoc/adapter-yargs';
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

More information, including supported command features, `mergeDocument`, and `__opencli`, is in the [README](https://www.npmjs.com/package/@clidoc/adapter-yargs) of the npm module.
