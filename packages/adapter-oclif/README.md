# @clidoc/adapter-oclif

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-oclif)](https://www.npmjs.com/package/@clidoc/adapter-oclif)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-oclif)](https://www.npmjs.com/package/@clidoc/adapter-oclif)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.dev-blue)](https://clidoc.dev)

An [OpenCLI](https://github.com/bcdxn/opencli) spec generator for [oclif](https://oclif.io/). clidoc is a JavaScript suite of tools for generating, transforming, and publishing OpenCLI specifications, with wide compatibility across the standard ecosystem tooling.

## Add `docgen` to your CLI

`@clidoc/adapter-oclif/docgen`'s `createDocgenCommand` builds a ready-to-export oclif command: `-o`/`--output <file>` (defaults to stdout) and `--format <json|markdown>` (default `json`). It lives at its own entry point so importing `fromOclif` from the package root never requires `@oclif/core` to be installed. `infoFromPackageJson` derives the document's title, binary name, and version from your `package.json`.

```ts
// src/commands/docgen.ts
import { readFileSync } from 'node:fs';
import { createDocgenCommand } from '@clidoc/adapter-oclif/docgen';
import { infoFromPackageJson } from '@clidoc/core';

export default createDocgenCommand(() => ({
  manifest: JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8')),
  info: infoFromPackageJson(JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))),
}));
```

`docgen` is now just another exported command, so your `src/index.ts` entry point needs no changes: `run(process.argv.slice(2))` handles it like any other command.

Generate or refresh the oclif manifest (`manifest.json`) as part of your build — via `oclif manifest` or your own `oclif.config` build step — so `docgen` reflects the current commands. Run `mycli docgen --output cli.json` for JSON (the default), or `mycli docgen --format markdown --output reference.md` to render Markdown directly; omit `--output` to print to stdout. Install the validator with `npm install -g @clidoc/cli` and run `clidoc validate cli.json`.

## Optional: `__opencli` for machine discovery

For machine discovery, matching [upstream OpenCLI's Go adapters](https://github.com/bcdxn/opencli), check argv for the hidden `__opencli` subcommand in your executable entry point before handing arguments to oclif: `handleOpenCliRequest` prints one JSON document to stdout (or writes it to a file with upstream's own `-o`/`--out <file>` flag), and exits 0, so command handlers never run.

```ts
// src/index.ts
import { readFileSync } from 'node:fs';
import { run } from '@oclif/core';
import { fromOclif } from '@clidoc/adapter-oclif';
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

The [runnable oclif demo](../../demos/oclif/src/index.ts) builds the manifest inline to stay a single file and wires up `__opencli`; adjust the manifest and `package.json` paths for your project's layout. Consumers can then run `mycli __opencli > mycli.opencli.json` or `mycli __opencli --out mycli.opencli.json` for discovery.

## Supported metadata

- Command IDs, descriptions, aliases, visibility, flags, arguments, examples, and topics from the generated manifest.
- Types, defaults, choices, required status, repeatable flags (`multiple` on flags and args).
- Flag `env` → `alternativeSources`; flag `helpValue` → `hint`; flag `aliases`/`charAliases` merged with `char` into `aliases`.
- Command `examples` (a string, or oclif's `{ command, description }` object) → `examples: [{ title?, content }]` (`description` → `title`, `command` → `content`).
- Argument `default`, folded into the argument's summary as `Default: <value>.` (no dedicated OpenCLI field, matching `@clidoc/adapter-commander`).
- Manifest `topics`, synthesised as `kind: 'group'` commands keyed by the topic path (e.g. `user` or `user admin`), without overwriting a real command of the same key.

Not supported:

- Flag `deprecated` and `deprecateAliases` (read by oclif's own help output, no equivalent OpenCLI field).
- Custom parsing, hooks, or command runtime behavior can't be inferred from the manifest.
- A flag with both `required: true` and `multiple: true` and no default emits `variadic: true, minItems: 1` as the closest approximation — OpenCLI has no way to mark a variadic flag `required` (schema gap, [tracked upstream](https://github.com/bcdxn/opencli/issues/20)).
- The same combination with a default can't be represented at all (the default can satisfy oclif's required check without the flag being present), so the adapter throws a diagnostic for that case.

## Advanced: using `fromOclif` directly

`createDocgenCommand` is a thin convenience layer over `fromOclif`, which does the actual conversion and remains fully supported for callers who want to build their own `docgen` command, run the conversion at a different time, or skip `package.json` entirely:

```ts
import { fromOclif } from '@clidoc/adapter-oclif';

const document = fromOclif(manifest, { title: 'My CLI', binary: 'mycli', version: '1.0.0' });
```

`fromOclif` converts the command metadata in oclif's generated `manifest.json` into an OpenCLI `1.0.0-alpha.14` document. Pass the manifest and the CLI title, executable name, and version. The adapter reads metadata only; it does not load commands, parse arguments, or run handlers.

## Adding examples and exit codes

`fromOclif` only knows what the generated manifest exposes, so `examples`, `exitCodes`, and
metadata like `info.license` never appear in the generated document. Add them with
`@clidoc/core`'s `mergeDocument` before writing the document out in `docgen`:

```ts
import { mergeDocument } from '@clidoc/core';

const document = mergeDocument(fromOclif(manifest, { title: 'My CLI', binary: 'mycli', version: '1.0.0' }), {
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
