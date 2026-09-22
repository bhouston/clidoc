# @clidoc/commander

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fcommander)](https://www.npmjs.com/package/@clidoc/commander)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fcommander)](https://www.npmjs.com/package/@clidoc/commander)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.dev-blue)](https://clidoc.dev)

Generate an [OpenCLI](https://github.com/bcdxn/opencli) document from your [Commander](https://github.com/tj/commander.js) CLI.

```sh
npm install @clidoc/commander @clidoc/core
```

## Add `docgen` to your CLI

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

Then generate the spec:

```sh
mycli docgen --output cli.json
```

That's it. Add `--format markdown` for Markdown instead of JSON. The [Commander demo](../../demos/commander) is a runnable example.

## Optional: `__opencli` for machine discovery

Let other tools discover your CLI by answering the hidden `__opencli` subcommand before Commander parses:

```ts
import { handleOpenCliRequest } from '@clidoc/core';

if (!(await handleOpenCliRequest(process.argv.slice(2), document))) {
  program.parse();
}
```

```sh
mycli __opencli > mycli.opencli.json
```

## Adding examples and exit codes

Commander metadata has no examples, exit codes, or license. Add them with `mergeDocument`:

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

Use the full command key (`mycli greet`). See the [`@clidoc/core` README](../core/README.md#adding-author-supplied-metadata) for the merge rules.

## Using `fromCommander` directly

```ts
import { fromCommander } from '@clidoc/commander';

const document = fromCommander(program, { title: 'My CLI', binary: 'mycli', version: '1.0.0' });
```

It reads the command tree only; it never parses arguments or runs actions.

## Limitations

- Custom parsers, hooks, and action behavior can't be inferred from the command tree.
- A required-value variadic option (`--items <items...>` + `makeOptionMandatory()`, no default) emits `variadic: true, minItems: 1` as the closest approximation — OpenCLI has no way to mark a variadic flag `required` (schema gap, [tracked upstream](https://github.com/bcdxn/opencli/issues/20)).
- A mandatory optional-value variadic option (`--items [items...]`) can't be represented at all (a present-but-empty flag and an absent flag both need to be distinguishable from "must have values"), so `fromCommander` throws a diagnostic naming the option.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
