# @clidoc/adapter-yargs

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-yargs)](https://www.npmjs.com/package/@clidoc/adapter-yargs)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-yargs)](https://www.npmjs.com/package/@clidoc/adapter-yargs)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.dev-blue)](https://clidoc.dev)

An [OpenCLI](https://github.com/bcdxn/opencli) spec generator for [Yargs](https://yargs.js.org/). clidoc is a JavaScript suite of tools for generating, transforming, and publishing OpenCLI specifications, with wide compatibility across the standard ecosystem tooling.

## Add `docgen` to your CLI

`createDocgenCommand` builds a ready-to-register `docgen` command module: `-o`/`--output <file>` (defaults to stdout) and `--format <json|markdown>` (default `json`). `infoFromPackageJson` derives the document's title, binary name, and version from your `package.json`.

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

// generate an OpenCLI document from the same commands
const document = () => fromYargs(parser, info);
// add a docgen command that returns the document on demand
parser.command(createDocgenCommand(document)).demandCommand().parse();
```

Run `mycli docgen --output cli.json` for JSON (the default), or `mycli docgen --format markdown --output reference.md` to render Markdown directly; omit `--output` to print to stdout. Install the validator with `npm install -g @clidoc/cli` and run `clidoc validate cli.json`. See the [Yargs demo](../../demos/yargs) for a runnable example.

## Optional: `__opencli` for machine discovery

For machine discovery, matching [upstream OpenCLI's Go adapters](https://github.com/bcdxn/opencli), check argv for the hidden `__opencli` subcommand before Yargs parses arguments instead of calling `.parse()` directly: `handleOpenCliRequest` prints one JSON document to stdout (or writes it to a file with upstream's own `-o`/`--out <file>` flag), and exits 0, so command handlers never run.

```ts
import { handleOpenCliRequest } from '@clidoc/core';

if (!(await handleOpenCliRequest(hideBin(process.argv), document))) {
  parser.parse();
}
```

Consumers can then run `mycli __opencli > mycli.opencli.json` or `mycli __opencli --out mycli.opencli.json` for discovery.

## Supported metadata

- Standard Yargs command modules and `defineCommand` results from `yargs-file-commands`.
- Command name and positionals from the command pattern: every leading non-positional token is the name (`'config set <key> <value>'` → `config set`), and `$0` maps to the binary with no word of its own.
- Descriptions, aliases, and declarative option maps from `.option()`, `.options()`, `.positional()`, and `.command()`.
- Option metadata from chained `.alias()`, `.describe()`, `.default()`, `.choices()`, `.demandOption()`, `.boolean()`, `.string()`, `.number()`, `.array()`, and `.count()`.
- Parser config calls `.strict()`, `.help()`, `.version()`, and `.demandCommand()` (accepted, not inspected further).
- Value types, defaults, choices, and required/hidden/array flags; `count` maps to `integer`, unrecognised types fall back to `string`.
- Nested `.command()` calls, recursed into dotted-word keys (e.g. `demo config set`); a parent with no flags/args of its own is marked `kind: 'group'`.

Not supported:

- `.check()` and `.middleware()` callbacks are never invoked.
- Asynchronous builders (builder callbacks run synchronously to collect metadata — use trusted modules).
- Custom parsing, coercion, validation, and middleware behavior.
- Unsupported builder methods report their name and suggest `.option()` or extending the adapter.
- A required array option (`demandOption: true`) can't be expressed faithfully — OpenCLI has no way to mark a variadic flag `required` (schema gap, [tracked upstream](https://github.com/bcdxn/opencli/issues/20)), so the adapter throws a diagnostic naming the option instead of emitting an incorrect `minItems: 1`.

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
