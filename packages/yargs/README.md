# @clidoc/yargs

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fyargs)](https://www.npmjs.com/package/@clidoc/yargs)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fyargs)](https://www.npmjs.com/package/@clidoc/yargs)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/branch/main/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.dev-blue)](https://clidoc.dev)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/vSYc5CfRWH)

Stop hand-writing your CLI reference docs. Generate them from your [Yargs](https://yargs.js.org/) command definitions so they never drift from `--help`.

`@clidoc/yargs` converts your commands into an [OpenCLI](https://github.com/bcdxn/opencli) document that you can validate, render to Markdown, and publish to Docusaurus or VitePress.

```sh
npm install @clidoc/yargs @clidoc/core yargs
```

## Why / compared to alternatives

- **Hand-written reference pages** drift as flags change; this reads the definitions your CLI already runs.
- **`--help` only** is terminal text for one command at a time. The OpenCLI document is structured and validated, and renders to a full Markdown reference, shell completions and MCP tool definitions.
- It reads metadata only: no handlers run, so generating docs has no side effects. Yargs behavior that isn't metadata (custom validation, coercion, middleware) isn't documented; see Limitations.

## Related packages

- [`@clidoc/core`](https://www.npmjs.com/package/@clidoc/core): validate, parse and render the document, plus `mergeDocument`.
- [`@clidoc/cli`](https://www.npmjs.com/package/@clidoc/cli): `clidoc validate`, `markdown`, `completion` and `mcp` commands.
- Publish the result with [`@clidoc/docusaurus`](https://www.npmjs.com/package/@clidoc/docusaurus) or [`@clidoc/vitepress`](https://www.npmjs.com/package/@clidoc/vitepress).
- Other CLI frameworks: [`@clidoc/commander`](https://www.npmjs.com/package/@clidoc/commander), [`@clidoc/oclif`](https://www.npmjs.com/package/@clidoc/oclif).
- [Documentation](https://clidoc.dev/docs/frameworks) and [demos](https://github.com/bhouston/clidoc/tree/main/demos).

## Add `docgen` to your CLI

`createDocgenCommand` builds a ready-to-register `docgen` command module: `-o`/`--output <file>` (defaults to stdout) and `--format <json|yaml|markdown>` (default `json`). `infoFromPackageJson` derives the document's title, binary name, and version from your `package.json`.

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

Run `mycli docgen --output cli.json` for JSON (the default), or `mycli docgen --format markdown --output reference.md` to render Markdown directly; omit `--output` to print to stdout. Install the validator with `npm install -g @clidoc/cli` and run `clidoc validate cli.json`. See the [Yargs demo](https://github.com/bhouston/clidoc/tree/main/demos/yargs) for a runnable example.

## Optional: `__opencli` for machine discovery

For machine discovery, matching [upstream OpenCLI's Go libraries](https://github.com/bcdxn/opencli), check argv for the hidden `__opencli` subcommand before Yargs parses arguments instead of calling `.parse()` directly: `handleOpenCliRequest` prints one JSON document to stdout (or writes it to a file with upstream's own `-o`/`--out <file>` flag), and exits 0, so command handlers never run.

```ts
import { handleOpenCliRequest } from '@clidoc/core';

if (!(await handleOpenCliRequest(hideBin(process.argv), () => document))) {
  parser.parse();
}
```

Consumers can then run `mycli __opencli > mycli.opencli.json` or `mycli __opencli --out mycli.opencli.json` for discovery.

## Limitations

- `.check()` and `.middleware()` callbacks are never invoked.
- Builder callbacks run to collect metadata, so use trusted modules. `fromYargs` rejects asynchronous builders; use [`fromYargsAsync`](#asynchronous-builders) for those.
- Custom parsing, coercion, validation, and middleware behavior.
- Unsupported builder methods report their name and suggest `.option()` or extending `fromYargs`.
- A required array option (`demandOption: true`) emits `variadic: true, required: true`.
- An array-typed option's `default` can't be expressed either — OpenCLI flag defaults are a single string, number, or boolean — so `fromYargs` throws a diagnostic naming the option instead of emitting an invalid document. Apply the default in your handler instead (e.g. `argv.rules ?? ['basic']`).

## Asynchronous builders

`fromYargs` runs builders synchronously. If a builder is `async`, for example one that lazily imports its subcommands as [yargs-file-commands](https://github.com/bhouston/yargs-file-commands) does, use `fromYargsAsync`. It takes the same arguments, awaits each builder, and includes the options and subcommands registered after an `await`. `createDocgenCommand` accepts an async `getDocument`, so the document is built only when `docgen` runs and normal startup stays lazy:

```ts
import { createDocgenCommand, fromYargsAsync } from '@clidoc/yargs';
import { fileCommands } from 'yargs-file-commands';

const commands = await fileCommands({ commandDirs });
const docgen = createDocgenCommand(() => fromYargsAsync([...commands, docgen], info));

await yargs(hideBin(process.argv)).command(commands).command(docgen).parseAsync();
```

Pass the command modules rather than the parser here: Yargs doesn't expose its registered commands while a handler is running.

## Advanced: passing an explicit command-modules array

`fromYargs` accepts an array of command modules in place of a live instance, for callers who want to build a document from modules that were never registered on a parser, run the conversion at a different time, or skip `package.json` entirely:

```ts
import { fromYargs } from '@clidoc/yargs';

const document = fromYargs([greet], { title: 'My CLI', binary: 'mycli', version: '1.0.0' });
```

`fromYargs` converts Yargs command metadata into an OpenCLI `1.0.0-alpha.14` document, from either a live instance or an explicit array of the same modules that register your commands, plus the CLI title, executable name, and version. `fromYargs` reads metadata only; it does not parse arguments or run handlers.

## Adding examples and exit codes

`fromYargs` only knows what Yargs' command metadata exposes, so `examples`, `exitCodes`, and
metadata like `info.license` never appear in the generated document. Add them with `@clidoc/core`'s
`mergeDocument`, replacing the plain `fromYargs(parser, info)` call above with:

```ts
import { mergeDocument } from '@clidoc/core';

document = mergeDocument(fromYargs(parser, info), {
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

See the [`@clidoc/core` README](https://github.com/bhouston/clidoc/tree/main/packages/core#adding-author-supplied-metadata) for the merge rules.

## License

MIT. See [LICENSE](https://github.com/bhouston/clidoc/tree/main/LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
