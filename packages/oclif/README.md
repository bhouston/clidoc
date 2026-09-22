# @clidoc/oclif

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Foclif)](https://www.npmjs.com/package/@clidoc/oclif)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Foclif)](https://www.npmjs.com/package/@clidoc/oclif)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.dev-blue)](https://clidoc.dev)

Generate an [OpenCLI](https://github.com/bcdxn/opencli) document from your [oclif](https://oclif.io/) CLI.

```sh
npm install @clidoc/oclif @clidoc/core
```

## Add `docgen` to your CLI

Export `docgen` like any other oclif command. Generate `manifest.json` with `oclif manifest` in your build.

```ts
// src/commands/docgen.ts
import { readFileSync } from 'node:fs';
import { createDocgenCommand } from '@clidoc/oclif/docgen';
import { infoFromPackageJson } from '@clidoc/core';

export default createDocgenCommand(() => ({
  manifest: JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8')),
  info: infoFromPackageJson(JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))),
}));
```

Then generate the spec:

```sh
mycli docgen --output cli.json
```

That's it. Add `--format markdown` for Markdown instead of JSON. The [oclif demo](../../demos/oclif) is a runnable example.

## Optional: `__opencli` for machine discovery

Let other tools discover your CLI by answering the hidden `__opencli` subcommand before oclif runs:

```ts
// src/index.ts
import { readFileSync } from 'node:fs';
import { run } from '@oclif/core';
import { fromOclif } from '@clidoc/oclif';
import { handleOpenCliRequest, infoFromPackageJson } from '@clidoc/core';

const document = () => {
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  return fromOclif(manifest, infoFromPackageJson(pkg));
};
const args = process.argv.slice(2);
if (!(await handleOpenCliRequest(args, document))) {
  await run(args);
}
```

```sh
mycli __opencli > mycli.opencli.json
```

## Adding examples and exit codes

The manifest has no examples, exit codes, or license. Add them with `mergeDocument`:

```ts
import { mergeDocument } from '@clidoc/core';

const document = mergeDocument(fromOclif(manifest, info), {
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

## Using `fromOclif` directly

```ts
import { fromOclif } from '@clidoc/oclif';

const document = fromOclif(manifest, { title: 'My CLI', binary: 'mycli', version: '1.0.0' });
```

It reads the manifest only; it never loads commands, parses arguments, or runs handlers. `createDocgenCommand` lives at `@clidoc/oclif/docgen` so that the package root has no `@oclif/core` dependency.

## Limitations

- Flag `deprecated` and `deprecateAliases` (read by oclif's own help output, no equivalent OpenCLI field).
- Custom parsing, hooks, or command runtime behavior can't be inferred from the manifest.
- A flag with both `required: true` and `multiple: true` and no default emits `variadic: true, minItems: 1` as the closest approximation — OpenCLI has no way to mark a variadic flag `required` (schema gap, [tracked upstream](https://github.com/bcdxn/opencli/issues/20)).
- The same combination with a default can't be represented at all (the default can satisfy oclif's required check without the flag being present), so `fromOclif` throws a diagnostic for that case.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
