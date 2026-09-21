# @clidoc/adapter-commander

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-commander)](https://www.npmjs.com/package/@clidoc/adapter-commander)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-commander)](https://www.npmjs.com/package/@clidoc/adapter-commander)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

An [OpenCLI](https://github.com/bcdxn/opencli) spec generator for [Commander](https://github.com/tj/commander.js). clidoc is a JavaScript suite of tools for generating, transforming, and publishing OpenCLI specifications, with wide compatibility across the standard ecosystem tooling.

## Add `docgen` and `__opencli` to your CLI

`createDocgenCommand` builds a ready-to-register `docgen` command: `-o`/`--output <file>` (defaults to stdout) and `--format <json|markdown>` (default `json`). `infoFromPackageJson` derives the document's title, binary name, and version from your `package.json`. For machine discovery, attach the hidden `__opencli` subcommand, matching [upstream OpenCLI's Go adapters](https://github.com/bcdxn/opencli): `handleOpenCliRequest` checks argv for `__opencli` before Commander parses arguments, prints one JSON document to stdout (or writes it to a file with upstream's own `-o`/`--out <file>` flag), and exits 0, so command handlers never run.

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

Run `mycli docgen --output cli.json` for JSON (the default), or `mycli docgen --format markdown --output reference.md` to render Markdown directly; omit `--output` to print to stdout. Install the validator with `npm install -g @clidoc/cli` and run `clidoc validate cli.json`. Consumers can also run `mycli __opencli > mycli.opencli.json` or `mycli __opencli --out mycli.opencli.json` for discovery. See the [Commander demo](../../demos/commander) for a runnable example.

## Supported metadata

The adapter traverses nested commands and reads descriptions, aliases, registered arguments, and options, including required and variadic status, choices, simple defaults, and hidden options and commands. `command.summary()` maps to `summary` and `command.description()` to `description` when both are set; a command with only a description keeps mapping it to `summary`. A `--foo`/`--no-foo` pair on the same command is merged into a single boolean flag named `foo`, with the negation noted in its summary; a standalone `--no-foo` keeps the invocable name `no-foo`, with its summary explaining that it sets `foo` to `false` and stating the default value of Commander's backing `foo` property. `Option.env()` maps to `alternativeSources` with type `$ENV`. A command with subcommands and no arguments or options of its own is marked `kind: 'group'`; the OpenCLI validator rejects groups that carry flags, so a parent with options stays an ordinary command. Argument defaults have no dedicated field in the OpenCLI spec, so they are appended to the argument's summary instead. Custom parsers, hooks, and action behavior cannot be inferred from the command tree.

## Advanced: using `fromCommander` directly

`createDocgenCommand` is a thin convenience layer over `fromCommander`, which does the actual conversion and remains fully supported for callers who want to build their own `docgen` command, run the conversion at a different time, or skip `package.json` entirely:

```ts
import { fromCommander } from '@clidoc/adapter-commander';

const document = fromCommander(program, { title: 'My CLI', binary: 'mycli', version: '1.0.0' });
```

`fromCommander` converts a configured Commander `Command` tree into an OpenCLI `1.0.0-alpha.14` document. Configure the tree once and pass its root command with the CLI title, executable name, and version. The adapter traverses commands and reads their metadata without parsing arguments or running actions.

## Adding examples and exit codes

`fromCommander` only knows what the Commander command tree exposes, so `examples`, `exitCodes`,
and metadata like `info.license` never appear in the generated document. Add them with
`@clidoc/core`'s `mergeDocument` before writing the document out in `docgen`:

```ts
import { mergeDocument } from '@clidoc/core';

const document = () =>
  mergeDocument(fromCommander(program, info), {
    info: { license: { name: 'MIT', spdxId: 'MIT' } },
    commands: {
      greet: {
        examples: [{ title: 'Basic', content: 'mycli greet Ada' }],
        exitCodes: [{ code: 1, status: 'BAD_USER_INPUT_ERROR', summary: 'Missing name' }],
      },
    },
  });
```

See the [`@clidoc/core` README](../core/README.md#adding-author-supplied-metadata) for the merge rules.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
