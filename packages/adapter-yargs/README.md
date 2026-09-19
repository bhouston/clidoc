# @clidoc/adapter-yargs

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-yargs)](https://www.npmjs.com/package/@clidoc/adapter-yargs)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-yargs)](https://www.npmjs.com/package/@clidoc/adapter-yargs)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

Part of [clidoc](https://clidoc.ben3d.ca), tooling for publishing CLI reference documentation from an [OpenCLI](https://github.com/bcdxn/opencli) document.

`fromYargs` converts Yargs command modules into an OpenCLI `1.0.0-alpha.14` document. Pass the same modules that register your commands, plus the CLI title, executable name, and version. The adapter reads their metadata; it does not parse arguments or run handlers. Supply modules explicitly because a live Yargs instance does not expose all command metadata through a stable public API.

## Add `docgen` and `--opencli` to your CLI

Add `mycli docgen --output cli.json` to write the OpenCLI document from your CLI metadata. Reserve the **exact top-level** `mycli --opencli` invocation as a discovery command. Print only one UTF-8 JSON OpenCLI document followed by a newline to stdout, then exit with status 0. Report errors on stderr and exit nonzero; do not run command handlers. Check for the exact invocation before Yargs parses arguments; other invocations continue through the normal CLI.

```ts
import { writeFile } from 'node:fs/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fromYargs } from '@clidoc/adapter-yargs';
import { renderMarkdown } from '@clidoc/core';
import { command as greet } from './commands/greet.js';

const docgen = {
  command: 'docgen',
  describe: 'Write the OpenCLI document to a file',
  builder: {
    output: { type: 'string' as const, demandOption: true },
    format: { type: 'string' as const, choices: ['json', 'markdown'] as const, default: 'json' },
  },
  async handler(argv: { output: string; format: 'json' | 'markdown' }) {
    const generated = document();
    await writeFile(
      argv.output,
      argv.format === 'markdown' ? renderMarkdown(generated) : `${JSON.stringify(generated, null, 2)}\n`,
    );
  },
};
const commands = [greet, docgen];
const info = { title: 'My CLI', binary: 'mycli', version: '1.0.0' };
const args = hideBin(process.argv);
const document = () => fromYargs(commands, info);

if (args.length === 1 && args[0] === '--opencli') {
  process.stdout.write(`${JSON.stringify(document())}\n`);
} else {
  const cli = yargs(args);
  for (const command of commands) cli.command(command);
  cli.demandCommand().parse();
}
```

Run `mycli docgen --output cli.json` for JSON (the default), or `mycli docgen --format markdown --output reference.md` to render Markdown directly. Install the validator with `npm install -g @clidoc/cli` and run `clidoc validate cli.json`. Consumers can also run `mycli --opencli > mycli.opencli.json` for discovery. See the [Yargs demo](../../demos/yargs) for a runnable example.

## Supported metadata

Standard Yargs command modules and `defineCommand` results from `yargs-file-commands` work. Command patterns provide names and positional arguments: the command name is every leading pattern token that is not a positional (`<...>` / `[...]`), so `'config set <key> <value>'` becomes `config set`, not just `config`. The special `$0` default-command token maps to the binary itself and contributes no word of its own. The adapter reads descriptions, aliases, declarative option maps, and synchronous builder calls to `.option()`, `.options()`, `.positional()`, and `.command()`. Nested `.command()` calls inside a builder are recursed into and produce dotted-word keys (e.g. `demo config set`); a parent command that has no flags or args of its own and exists only to register children is marked `kind: 'group'`. It maps supported value types, defaults, choices, and required, hidden, and array/variadic flags; `count` options map to `integer`, and any other unrecognised option type falls back to `string`. Builder callbacks run to collect this metadata, so use trusted modules; asynchronous builders are unsupported. Custom parsing, coercion, validation, and middleware behavior cannot be inferred from command metadata.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
