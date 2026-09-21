# @clidoc/adapter-yargs

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-yargs)](https://www.npmjs.com/package/@clidoc/adapter-yargs)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-yargs)](https://www.npmjs.com/package/@clidoc/adapter-yargs)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

An [OpenCLI](https://github.com/bcdxn/opencli) spec generator for [Yargs](https://yargs.js.org/). clidoc is a JavaScript suite of tools for generating, transforming, and publishing OpenCLI specifications, with wide compatibility across the standard ecosystem tooling.

## Add `docgen` and `__opencli` to your CLI

`createDocgenCommand` builds a ready-to-register `docgen` command module: `-o`/`--output <file>` (defaults to stdout) and `--format <json|markdown>` (default `json`). `infoFromPackageJson` derives the document's title, binary name, and version from your `package.json`. For machine discovery, attach the hidden `__opencli` subcommand, matching [upstream OpenCLI's Go adapters](https://github.com/bcdxn/opencli): `handleOpenCliRequest` checks argv for `__opencli` before Yargs parses arguments, prints one JSON document to stdout (or writes it to a file with upstream's own `-o`/`--out <file>` flag), and exits 0, so command handlers never run.

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

Run `mycli docgen --output cli.json` for JSON (the default), or `mycli docgen --format markdown --output reference.md` to render Markdown directly; omit `--output` to print to stdout. Install the validator with `npm install -g @clidoc/cli` and run `clidoc validate cli.json`. Consumers can also run `mycli __opencli > mycli.opencli.json` or `mycli __opencli --out mycli.opencli.json` for discovery. See the [Yargs demo](../../demos/yargs) for a runnable example.

## Supported metadata

Standard Yargs command modules and `defineCommand` results from `yargs-file-commands` work. Command patterns provide names and positional arguments: the command name is every leading pattern token that is not a positional (`<...>` / `[...]`), so `'config set <key> <value>'` becomes `config set`, not just `config`. The special `$0` default-command token maps to the binary itself and contributes no word of its own. The adapter reads descriptions, aliases, declarative option maps, and synchronous builder calls to `.option()`, `.options()`, `.positional()`, and `.command()`. Chained `.alias()`, `.describe()`, `.default()`, `.choices()`, `.demandOption()`, `.boolean()`, `.string()`, `.number()`, `.array()`, and `.count()` calls contribute option metadata. Common parser configuration calls such as `.strict()`, `.help()`, `.version()`, and `.demandCommand()` are accepted; `.check()` and `.middleware()` callbacks are never invoked. Unsupported builder methods report their name and suggest using `.option()` or extending the adapter. Nested `.command()` calls inside a builder are recursed into and produce dotted-word keys (e.g. `demo config set`); a parent command that has no flags or args of its own and exists only to register children is marked `kind: 'group'`. It maps supported value types, defaults, choices, and required, hidden, and array/variadic flags; `count` options map to `integer`, and any other unrecognised option type falls back to `string`. Builder callbacks run to collect this metadata, so use trusted modules; asynchronous builders are unsupported. Custom parsing, coercion, validation, and middleware behavior cannot be inferred from command metadata.

For an array option with `demandOption: true`, the adapter throws a diagnostic naming the option. Yargs accepts a present array flag with zero values, but OpenCLI rejects `required: true` on variadic flags and `minItems: 1` would incorrectly require a value. Change the source definition or document that option separately before publishing.

## Advanced: using `fromYargs` directly

`createDocgenCommand` is a thin convenience layer over `fromYargs`, which does the actual conversion and remains fully supported for callers who want to build their own `docgen` command, run the conversion at a different time, or skip `package.json` entirely:

```ts
import { fromYargs } from '@clidoc/adapter-yargs';

const document = fromYargs([greet], { title: 'My CLI', binary: 'mycli', version: '1.0.0' });
```

`fromYargs` converts Yargs command modules into an OpenCLI `1.0.0-alpha.14` document. Pass the same modules that register your commands, plus the CLI title, executable name, and version. The adapter reads their metadata; it does not parse arguments or run handlers. Supply modules explicitly because a live Yargs instance does not expose all command metadata through a stable public API.

## Adding examples and exit codes

`fromYargs` only knows what Yargs' command metadata exposes, so `examples`, `exitCodes`, and
metadata like `info.license` never appear in the generated document. Add them with `@clidoc/core`'s
`mergeDocument` before writing the document out in `docgen`:

```ts
import { mergeDocument } from '@clidoc/core';

const document = () =>
  mergeDocument(fromYargs([greet, docgen], info), {
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
