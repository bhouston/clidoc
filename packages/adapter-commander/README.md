# @clidoc/adapter-commander

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-commander)](https://www.npmjs.com/package/@clidoc/adapter-commander)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-commander)](https://www.npmjs.com/package/@clidoc/adapter-commander)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

Part of [clidoc](https://clidoc.ben3d.ca), tooling for publishing CLI reference documentation from an [OpenCLI](https://github.com/bcdxn/opencli) document.

`fromCommander` converts a configured Commander `Command` tree into an OpenCLI `1.0.0-alpha.14` document. Configure the tree once and pass its root command with the CLI title, executable name, and version. The adapter traverses commands and reads their metadata without parsing arguments or running actions.

## Add `--opencli` to your CLI

Reserve the **exact top-level** `mycli --opencli` invocation as a discovery command. Print only one UTF-8 JSON OpenCLI document followed by a newline to stdout, then exit with status 0. Report errors on stderr and exit nonzero; do not run command handlers. Check for the exact invocation before Commander parses arguments; other invocations continue through the normal CLI.

```ts
import { Command } from 'commander';
import { fromCommander } from '@clidoc/adapter-commander';

const program = new Command('mycli');
program
  .command('greet <name>')
  .description('Greet a person')
  .action((name: string) => {
    console.log(`Hello, ${name}!`);
  });

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--opencli') {
  const document = fromCommander(program, {
    title: 'My CLI',
    binary: 'mycli',
    version: '1.0.0',
  });
  process.stdout.write(`${JSON.stringify(document)}\n`);
} else {
  program.parse(process.argv);
}
```

Consumers can run `mycli --opencli > mycli.opencli.json`, then validate or render the JSON with `@clidoc/cli`. See the [Commander demo](../../demos/commander) for a runnable example.

## Supported metadata

The adapter traverses nested commands and reads descriptions, aliases, registered arguments, and options, including required and variadic status, choices, simple defaults, and hidden options. Custom parsers, hooks, and action behavior cannot be inferred from the command tree.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
