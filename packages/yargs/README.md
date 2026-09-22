# @clidoc/yargs

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fyargs)](https://www.npmjs.com/package/@clidoc/yargs)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fyargs)](https://www.npmjs.com/package/@clidoc/yargs)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.dev-blue)](https://clidoc.dev)

Generate an [OpenCLI](https://github.com/bcdxn/opencli) document from your [Yargs](https://yargs.js.org/) CLI.

```sh
npm install @clidoc/yargs @clidoc/core
```

## Add `docgen` to your CLI

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

Then generate the spec:

```sh
mycli docgen --output cli.json
```

That's it. Add `--format markdown` for Markdown instead of JSON. The [Yargs demo](../../demos/yargs) is a runnable example.

## Optional: `__opencli` for machine discovery

Let other tools discover your CLI by answering the hidden `__opencli` subcommand before Yargs parses:

```ts
import { handleOpenCliRequest } from '@clidoc/core';

if (!(await handleOpenCliRequest(hideBin(process.argv), () => document))) {
  parser.parse();
}
```

```sh
mycli __opencli > mycli.opencli.json
```

## Adding examples and exit codes

Yargs metadata has no examples, exit codes, or license. Add them with `mergeDocument`:

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

Use the full command key (`mycli greet`). See the [`@clidoc/core` README](../core/README.md#adding-author-supplied-metadata) for the merge rules.

## Using `fromYargs` directly

`fromYargs` also accepts an array of command modules and explicit info:

```ts
import { fromYargs } from '@clidoc/yargs';

const document = fromYargs([greet], { title: 'My CLI', binary: 'mycli', version: '1.0.0' });
```

It reads metadata only; it never parses arguments or runs handlers.

## Limitations

- `.check()` and `.middleware()` callbacks are never invoked.
- Asynchronous builders (builder callbacks run synchronously to collect metadata — use trusted modules).
- Custom parsing, coercion, validation, and middleware behavior.
- Unsupported builder methods report their name and suggest `.option()` or extending `fromYargs`.
- A required array option (`demandOption: true`) can't be expressed faithfully — OpenCLI has no way to mark a variadic flag `required` (schema gap, [tracked upstream](https://github.com/bcdxn/opencli/issues/20)), so `fromYargs` throws a diagnostic naming the option instead of emitting an incorrect `minItems: 1`.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
