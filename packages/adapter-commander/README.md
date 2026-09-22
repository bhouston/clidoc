# @clidoc/adapter-commander

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-commander)](https://www.npmjs.com/package/@clidoc/adapter-commander)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-commander)](https://www.npmjs.com/package/@clidoc/adapter-commander)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.dev-blue)](https://clidoc.dev)

An [OpenCLI](https://github.com/bcdxn/opencli) spec generator for [Commander](https://github.com/tj/commander.js). clidoc is a JavaScript suite of tools for generating, transforming, and publishing OpenCLI specifications, with wide compatibility across the standard ecosystem tooling.

## Add `docgen` to your CLI

`createDocgenCommand` builds a ready-to-register `docgen` command: `-o`/`--output <file>` (defaults to stdout) and `--format <json|markdown>` (default `json`). `infoFromPackageJson` derives the document's title, binary name, and version from your `package.json`.

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

Run `mycli docgen --output cli.json` for JSON (the default), or `mycli docgen --format markdown --output reference.md` to render Markdown directly; omit `--output` to print to stdout. Install the validator with `npm install -g @clidoc/cli` and run `clidoc validate cli.json`. See the [Commander demo](../../demos/commander) for a runnable example.

## Optional: `__opencli` for machine discovery

For machine discovery, matching [upstream OpenCLI's Go adapters](https://github.com/bcdxn/opencli), attach the hidden `__opencli` subcommand instead of calling `program.parse()` directly: `handleOpenCliRequest` checks argv for `__opencli` before Commander parses arguments, prints one JSON document to stdout (or writes it to a file with upstream's own `-o`/`--out <file>` flag), and exits 0, so command handlers never run.

```ts
import { handleOpenCliRequest } from '@clidoc/core';

if (!(await handleOpenCliRequest(process.argv.slice(2), document))) {
  program.parse();
}
```

Consumers can then run `mycli __opencli > mycli.opencli.json` or `mycli __opencli --out mycli.opencli.json` for discovery.

## Supported metadata

- Nested commands, descriptions, aliases, registered arguments and options — including required/variadic status, choices, simple defaults, and hidden options and commands.
- `command.summary()` → `summary`, `command.description()` → `description` when both are set; description-only commands map to `summary`.
- A `--foo`/`--no-foo` pair merges into one boolean flag `foo` (negation noted in its summary); a standalone `--no-foo` keeps the name `no-foo`, with its summary stating it sets `foo` to `false` and Commander's default.
- `Option.env()` → `alternativeSources` with type `$ENV`.
- A command with subcommands and no arguments/options of its own → `kind: 'group'` (a parent with options stays an ordinary command, since groups can't carry flags).
- Argument defaults, folded into the argument's summary (no dedicated OpenCLI field).

Not supported:

- Custom parsers, hooks, and action behavior can't be inferred from the command tree.
- A required-value variadic option (`--items <items...>` + `makeOptionMandatory()`, no default) emits `variadic: true, minItems: 1` as the closest approximation — OpenCLI has no way to mark a variadic flag `required` (schema gap, [tracked upstream](https://github.com/bcdxn/opencli/issues/20)).
- A mandatory optional-value variadic option (`--items [items...]`) can't be represented at all (a present-but-empty flag and an absent flag both need to be distinguishable from "must have values"), so the adapter throws a diagnostic naming the option.

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
      'mycli greet': {
        examples: [{ title: 'Basic', content: 'mycli greet Ada' }],
        exitCodes: [{ code: 1, status: 'BAD_USER_INPUT_ERROR', summary: 'Missing name' }],
      },
    },
  });
```

Use the full generated command key (`mycli greet`) to add metadata to the existing command.

See the [`@clidoc/core` README](../core/README.md#adding-author-supplied-metadata) for the merge rules.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
