# @clidoc/adapter-yargs

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-yargs)](https://www.npmjs.com/package/@clidoc/adapter-yargs)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-yargs)](https://www.npmjs.com/package/@clidoc/adapter-yargs)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

Part of [clidoc](https://clidoc.ben3d.ca), tooling for publishing CLI reference documentation from an [OpenCLI](https://github.com/bcdxn/opencli) document.

`fromYargs` converts Yargs command modules into an OpenCLI `1.0.0-alpha.14` document. Pass the same modules that register your commands, plus the CLI title, executable name, and version. The adapter reads their metadata; it does not parse arguments or run handlers. Supply modules explicitly because a live Yargs instance does not expose all command metadata through a stable public API.

## Add `--opencli` to your CLI

Reserve the **exact top-level** `mycli --opencli` invocation as a discovery command. Print only one UTF-8 JSON OpenCLI document followed by a newline to stdout, then exit with status 0. Report errors on stderr and exit nonzero; do not run command handlers. Check for the exact invocation before Yargs parses arguments; other invocations continue through the normal CLI.

```ts
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fromYargs } from '@clidoc/adapter-yargs';
import { command as greet } from './commands/greet.js';

const commands = [greet];
const info = { title: 'My CLI', binary: 'mycli', version: '1.0.0' };
const args = hideBin(process.argv);

if (args.length === 1 && args[0] === '--opencli') {
  process.stdout.write(`${JSON.stringify(fromYargs(commands, info))}\n`);
} else {
  const cli = yargs(args);
  for (const command of commands) cli.command(command);
  cli.demandCommand().parse();
}
```

Consumers can run `mycli --opencli > mycli.opencli.json`, then validate or render the JSON with `@clidoc/cli`. See the [Yargs demo](../../demos/yargs) for a runnable example.

## Supported metadata

Standard Yargs command modules and `defineCommand` results from `yargs-file-commands` work. Command patterns provide names and positional arguments. The adapter reads descriptions, aliases, declarative option maps, and synchronous builder calls to `.option()`, `.options()`, and `.positional()`. It maps supported types, defaults, choices, and required, hidden, and array flags. Builder callbacks run to collect this metadata, so use trusted modules; asynchronous builders are unsupported. Custom parsing, coercion, validation, and middleware behavior cannot be inferred from command metadata.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
