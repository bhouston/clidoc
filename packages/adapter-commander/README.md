# @clidoc/adapter-commander

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-commander)](https://www.npmjs.com/package/@clidoc/adapter-commander)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-commander)](https://www.npmjs.com/package/@clidoc/adapter-commander)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

Part of [clidoc](https://clidoc.ben3d.ca), tooling for publishing CLI reference documentation from an [OpenCLI](https://github.com/bcdxn/opencli) document.

`fromCommander` converts a configured Commander `Command` tree into an OpenCLI `1.0.0-alpha.14` document. Configure the tree once and pass its root command with the CLI title, executable name, and version. The adapter traverses commands and reads their metadata without parsing arguments or running actions.

## Add `docgen` and `__opencli` to your CLI

Add `mycli docgen --output cli.json`, the human-facing command, to write the OpenCLI document from your CLI metadata. For machine discovery, attach the hidden `__opencli` subcommand, matching [upstream OpenCLI's Go adapters](https://github.com/bcdxn/opencli): print only one UTF-8 JSON OpenCLI document followed by a newline to stdout, then exit with status 0. `@clidoc/core` exports `handleOpenCliRequest`, which checks argv for `__opencli` (or the documented `--opencli` compatibility alias) before Commander parses arguments, so command handlers never run:

```ts
import { writeFile } from 'node:fs/promises';
import { Command, Option } from 'commander';
import { fromCommander } from '@clidoc/adapter-commander';
import { handleOpenCliRequest, renderMarkdown } from '@clidoc/core';

const program = new Command('mycli');
program
  .command('greet <name>')
  .description('Greet a person')
  .action((name: string) => {
    console.log(`Hello, ${name}!`);
  });

program
  .command('docgen')
  .description('Write the OpenCLI document to a file')
  .requiredOption('--output <file>', 'Output file')
  .addOption(new Option('--format <format>', 'Output format').choices(['json', 'markdown']).default('json'))
  .action(async (options: { output: string; format: 'json' | 'markdown' }) => {
    const generated = document();
    await writeFile(
      options.output,
      options.format === 'markdown' ? renderMarkdown(generated) : `${JSON.stringify(generated, null, 2)}\n`,
    );
  });
const document = () =>
  fromCommander(program, {
    title: 'My CLI',
    binary: 'mycli',
    version: '1.0.0',
  });
const args = process.argv.slice(2);
if (!handleOpenCliRequest(args, document)) {
  program.parse(process.argv);
}
```

Run `mycli docgen --output cli.json` for JSON (the default), or `mycli docgen --format markdown --output reference.md` to render Markdown directly. Install the validator with `npm install -g @clidoc/cli` and run `clidoc validate cli.json`. Consumers can also run `mycli __opencli > mycli.opencli.json` for discovery; `mycli --opencli` still works as a clidoc-only alias. See the [Commander demo](../../demos/commander) for a runnable example.

## Supported metadata

The adapter traverses nested commands and reads descriptions, aliases, registered arguments, and options, including required and variadic status, choices, simple defaults, and hidden options and commands. `command.summary()` maps to `summary` and `command.description()` to `description` when both are set; a command with only a description keeps mapping it to `summary`. A `--foo`/`--no-foo` pair on the same command is merged into a single boolean flag named `foo`, with the negation noted in its summary; a standalone `--no-foo` maps to a boolean flag defaulting to `true`. `Option.env()` maps to `alternativeSources` with type `$ENV`. A command with subcommands and no arguments or options of its own is marked `kind: 'group'`; the OpenCLI validator rejects groups that carry flags, so a parent with options stays an ordinary command. Argument defaults have no dedicated field in the OpenCLI spec, so they are appended to the argument's summary instead. Custom parsers, hooks, and action behavior cannot be inferred from the command tree.

## Adding examples and exit codes

`fromCommander` only knows what the Commander command tree exposes, so `examples`, `exitCodes`,
and metadata like `info.license` never appear in the generated document. Add them with
`@clidoc/core`'s `mergeDocument` before writing the document out in `docgen`:

```ts
import { mergeDocument } from '@clidoc/core';

const document = () =>
  mergeDocument(fromCommander(program, { title: 'My CLI', binary: 'mycli', version: '1.0.0' }), {
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
