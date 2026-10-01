# @clidoc/commander

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fcommander)](https://www.npmjs.com/package/@clidoc/commander)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fcommander)](https://www.npmjs.com/package/@clidoc/commander)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/branch/main/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.dev-blue)](https://clidoc.dev)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/vSYc5CfRWH)

Stop hand-writing your CLI reference docs. Generate them from your [Commander](https://github.com/tj/commander.js) command tree so they never drift from `--help`.

`@clidoc/commander` converts your configured `Command` tree into an [OpenCLI](https://github.com/bcdxn/opencli) document that you can validate, render to Markdown, and publish to Docusaurus or VitePress.

```sh
npm install @clidoc/commander @clidoc/core commander
```

## Why / compared to alternatives

- **Hand-written reference pages** drift as flags change; this reads the definitions your CLI already runs.
- **`--help` only** is terminal text for one command at a time. The OpenCLI document is structured and validated, and renders to a full Markdown reference, shell completions and MCP tool definitions.
- It reads metadata only: no handlers run, so generating docs has no side effects. Commander behavior that isn't metadata (custom validation, coercion, middleware) isn't documented; see Limitations.

## Related packages

- [`@clidoc/core`](https://www.npmjs.com/package/@clidoc/core): validate, parse and render the document, plus `mergeDocument`.
- [`@clidoc/cli`](https://www.npmjs.com/package/@clidoc/cli): `clidoc validate`, `markdown`, `completion` and `mcp` commands.
- Publish the result with [`@clidoc/docusaurus`](https://www.npmjs.com/package/@clidoc/docusaurus) or [`@clidoc/vitepress`](https://www.npmjs.com/package/@clidoc/vitepress).
- Other CLI frameworks: [`@clidoc/yargs`](https://www.npmjs.com/package/@clidoc/yargs), [`@clidoc/oclif`](https://www.npmjs.com/package/@clidoc/oclif).
- [Documentation](https://clidoc.dev/docs/frameworks) and [demos](https://github.com/bhouston/clidoc/tree/main/demos).

## Add `docgen` to your CLI

`createDocgenCommand` builds a ready-to-register `docgen` command: `-o`/`--output <file>` (defaults to stdout) and `--format <json|yaml|markdown>` (default `json`). `infoFromPackageJson` derives the document's title, binary name, and version from your `package.json`.

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

Run `mycli docgen --output cli.json` for JSON (the default), or `mycli docgen --format markdown --output reference.md` to render Markdown directly; omit `--output` to print to stdout. Install the validator with `npm install -g @clidoc/cli` and run `clidoc validate cli.json`. See the [Commander demo](https://github.com/bhouston/clidoc/tree/main/demos/commander) for a runnable example.

## Optional: `__opencli` for machine discovery

For machine discovery, matching [upstream OpenCLI's Go libraries](https://github.com/bcdxn/opencli), attach the hidden `__opencli` subcommand instead of calling `program.parse()` directly: `handleOpenCliRequest` checks argv for `__opencli` before Commander parses arguments, prints one JSON document to stdout (or writes it to a file with upstream's own `-o`/`--out <file>` flag), and exits 0, so command handlers never run.

```ts
import { handleOpenCliRequest } from '@clidoc/core';

if (!(await handleOpenCliRequest(process.argv.slice(2), document))) {
  program.parse();
}
```

Consumers can then run `mycli __opencli > mycli.opencli.json` or `mycli __opencli --out mycli.opencli.json` for discovery.

## Limitations

- Custom parsers, hooks, and action behavior can't be inferred from the command tree.
- A mandatory variadic option (`--items <items...>` + `makeOptionMandatory()`) emits `variadic: true, required: true`.
- A mandatory optional-value variadic option (`--items [items...]`) can't be represented at all (a present-but-empty flag and an absent flag both need to be distinguishable from "must have values"), so `fromCommander` throws a diagnostic naming the option.

## Advanced: using `fromCommander` directly

`createDocgenCommand` is a thin convenience layer over `fromCommander`, which does the actual conversion and remains fully supported for callers who want to build their own `docgen` command, run the conversion at a different time, or skip `package.json` entirely:

```ts
import { fromCommander } from '@clidoc/commander';

const document = fromCommander(program, { title: 'My CLI', binary: 'mycli', version: '1.0.0' });
```

`fromCommander` converts a configured Commander `Command` tree into an OpenCLI `1.0.0-alpha.14` document. Configure the tree once and pass its root command with the CLI title, executable name, and version. `fromCommander` traverses commands and reads their metadata without parsing arguments or running actions.

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

See the [`@clidoc/core` README](https://github.com/bhouston/clidoc/tree/main/packages/core#adding-author-supplied-metadata) for the merge rules.

## License

MIT. See [LICENSE](https://github.com/bhouston/clidoc/tree/main/LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
