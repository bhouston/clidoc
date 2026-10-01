# @clidoc/oclif

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Foclif)](https://www.npmjs.com/package/@clidoc/oclif)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Foclif)](https://www.npmjs.com/package/@clidoc/oclif)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/branch/main/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.dev-blue)](https://clidoc.dev)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/vSYc5CfRWH)

Stop hand-writing your CLI reference docs. Generate them from your [oclif](https://oclif.io/) command manifest so they never drift from `--help`.

`@clidoc/oclif` converts oclif's generated `manifest.json` into an [OpenCLI](https://github.com/bcdxn/opencli) document that you can validate, render to Markdown, and publish to Docusaurus or VitePress.

```sh
npm install @clidoc/oclif @clidoc/core
```

## Why / compared to alternatives

- **Hand-written reference pages** drift as flags change; this reads the definitions your CLI already runs.
- **`--help` only** is terminal text for one command at a time. The OpenCLI document is structured and validated, and renders to a full Markdown reference, shell completions and MCP tool definitions.
- **`oclif readme`** writes command docs into your README and is specific to oclif. clidoc produces a standalone document and full Markdown pages for a docs site, and the same pipeline works for Yargs and Commander CLIs. If a generated README section is all you need, `oclif readme` is already built in.
- It reads metadata only: no handlers run, so generating docs has no side effects. oclif behavior that isn't metadata (custom validation, coercion, middleware) isn't documented; see Limitations.

## Related packages

- [`@clidoc/core`](https://www.npmjs.com/package/@clidoc/core): validate, parse and render the document, plus `mergeDocument`.
- [`@clidoc/cli`](https://www.npmjs.com/package/@clidoc/cli): `clidoc validate`, `markdown`, `completion` and `mcp` commands.
- Publish the result with [`@clidoc/docusaurus`](https://www.npmjs.com/package/@clidoc/docusaurus) or [`@clidoc/vitepress`](https://www.npmjs.com/package/@clidoc/vitepress).
- Other CLI frameworks: [`@clidoc/yargs`](https://www.npmjs.com/package/@clidoc/yargs), [`@clidoc/commander`](https://www.npmjs.com/package/@clidoc/commander).
- [Documentation](https://clidoc.dev/docs/frameworks) and [demos](https://github.com/bhouston/clidoc/tree/main/demos).

## Add `docgen` to your CLI

`@clidoc/oclif/docgen`'s `createDocgenCommand` builds a ready-to-export oclif command: `-o`/`--output <file>` (defaults to stdout) and `--format <json|yaml|markdown>` (default `json`). It lives at its own entry point so importing `fromOclif` from the package root never requires `@oclif/core` to be installed. `infoFromPackageJson` derives the document's title, binary name, and version from your `package.json`.

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

`docgen` is now just another exported command, so your `src/index.ts` entry point needs no changes: `run(process.argv.slice(2))` handles it like any other command.

Generate or refresh the oclif manifest (`manifest.json`) as part of your build — via `oclif manifest` or your own `oclif.config` build step — so `docgen` reflects the current commands. Run `mycli docgen --output cli.json` for JSON (the default), or `mycli docgen --format markdown --output reference.md` to render Markdown directly; omit `--output` to print to stdout. Install the validator with `npm install -g @clidoc/cli` and run `clidoc validate cli.json`.

## Optional: `__opencli` for machine discovery

For machine discovery, matching [upstream OpenCLI's Go libraries](https://github.com/bcdxn/opencli), check argv for the hidden `__opencli` subcommand in your executable entry point before handing arguments to oclif: `handleOpenCliRequest` prints one JSON document to stdout (or writes it to a file with upstream's own `-o`/`--out <file>` flag), and exits 0, so command handlers never run.

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

The [runnable oclif demo](https://github.com/bhouston/clidoc/blob/main/demos/oclif/src/index.ts) builds the manifest inline to stay a single file and wires up `__opencli`; adjust the manifest and `package.json` paths for your project's layout. Consumers can then run `mycli __opencli > mycli.opencli.json` or `mycli __opencli --out mycli.opencli.json` for discovery.

## Limitations

- Flag `deprecated` and `deprecateAliases` (read by oclif's own help output, no equivalent OpenCLI field).
- Custom parsing, hooks, or command runtime behavior can't be inferred from the manifest.
- A flag with both `required: true` and `multiple: true` emits `variadic: true, required: true`.
- The same combination with a default can't be represented at all (the default can satisfy oclif's required check without the flag being present), so `fromOclif` throws a diagnostic for that case.

## Advanced: using `fromOclif` directly

`createDocgenCommand` is a thin convenience layer over `fromOclif`, which does the actual conversion and remains fully supported for callers who want to build their own `docgen` command, run the conversion at a different time, or skip `package.json` entirely:

```ts
import { fromOclif } from '@clidoc/oclif';

const document = fromOclif(manifest, { title: 'My CLI', binary: 'mycli', version: '1.0.0' });
```

`fromOclif` converts the command metadata in oclif's generated `manifest.json` into an OpenCLI `1.0.0-alpha.14` document. Pass the manifest and the CLI title, executable name, and version. `fromOclif` reads metadata only; it does not load commands, parse arguments, or run handlers.

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

See the [`@clidoc/core` README](https://github.com/bhouston/clidoc/tree/main/packages/core#adding-author-supplied-metadata) for the merge rules.

## License

MIT. See [LICENSE](https://github.com/bhouston/clidoc/blob/main/LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
