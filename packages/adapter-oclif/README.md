# @clidoc/adapter-oclif

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-oclif)](https://www.npmjs.com/package/@clidoc/adapter-oclif)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-oclif)](https://www.npmjs.com/package/@clidoc/adapter-oclif)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

Part of [clidoc](https://clidoc.ben3d.ca), tooling for publishing CLI reference documentation from an [OpenCLI](https://github.com/bcdxn/opencli) document.

`fromOclif` converts the command metadata in oclif's generated `manifest.json` into an OpenCLI `1.0.0-alpha.14` document. Pass the manifest and the CLI title, executable name, and version. The adapter reads metadata only; it does not load commands, parse arguments, or run handlers. Generate or refresh the oclif manifest as part of your build so `__opencli` reflects the current commands.

## Add `docgen` and `__opencli` to your CLI

Add `mycli docgen --output cli.json`, the human-facing command, to write the OpenCLI document from your CLI metadata. For machine discovery, attach the hidden `__opencli` subcommand, matching [upstream OpenCLI's Go adapters](https://github.com/bcdxn/opencli): print only one UTF-8 JSON OpenCLI document followed by a newline to stdout, then exit with status 0. `@clidoc/core` exports `handleOpenCliRequest`, which checks argv for `__opencli` (or the documented `--opencli` compatibility alias) in your executable entry point before handing arguments to oclif, so command handlers never run:

```ts
import { readFileSync } from 'node:fs';
import { run } from '@oclif/core';
import { fromOclif } from '@clidoc/adapter-oclif';
import { handleOpenCliRequest } from '@clidoc/core';

const document = () => {
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
  return fromOclif(manifest, {
    title: 'My CLI',
    binary: 'mycli',
    version: '1.0.0',
  });
};
const args = process.argv.slice(2);
if (!handleOpenCliRequest(args, document)) {
  await run(args);
}
```

Register this oclif command in your command tree so it is included in the
manifest used above:

```ts
// src/commands/docgen.ts
import { writeFile } from 'node:fs/promises';
import { Command, Flags } from '@oclif/core';
import { fromOclif } from '@clidoc/adapter-oclif';
import { readFileSync } from 'node:fs';
import { renderMarkdown } from '@clidoc/core';

export default class Docgen extends Command {
  static override description = 'Write the OpenCLI document to a file';
  static override flags = {
    output: Flags.string({ description: 'Output file', required: true }),
    format: Flags.string({ description: 'Output format', options: ['json', 'markdown'], default: 'json' }),
  };
  async run(): Promise<void> {
    const { flags } = await this.parse(Docgen);
    const manifest = JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8'));
    const document = fromOclif(manifest, {
      title: 'My CLI',
      binary: 'mycli',
      version: '1.0.0',
    });
    await writeFile(
      flags.output,
      flags.format === 'markdown' ? renderMarkdown(document) : `${JSON.stringify(document, null, 2)}\n`,
    );
  }
}
```

The [runnable oclif demo](../../demos/oclif/src/index.ts) implements `docgen` with a required `--output` flag. Adjust the manifest paths for your built executable and command. Run `mycli docgen --output cli.json` for JSON (the default), or `mycli docgen --format markdown --output reference.md` to render Markdown directly. Install the validator with `npm install -g @clidoc/cli` and run `clidoc validate cli.json`. Consumers can also run `mycli __opencli > mycli.opencli.json` for discovery; `mycli --opencli` still works as a clidoc-only alias.

## Supported metadata

The adapter reads command IDs, descriptions, aliases, visibility, flags, arguments, examples, and topics from the generated manifest. It maps supported types, defaults, choices, required status, repeatable flags (`multiple` on both flags and args), flag `env` (to `alternativeSources`), flag `helpValue` (to `hint`), and flag `aliases`/`charAliases` (merged with `char` into `aliases`). Command `examples` (a string, or oclif's `{ command, description }` object) map to spec `examples: [{ title?, content }]`, with `description` becoming `title` and `command` becoming `content`. Argument `default` has no equivalent spec field, so it is folded into the argument's summary as `Default: <value>.`, matching `@clidoc/adapter-commander`. Manifest `topics` synthesise `kind: 'group'` commands keyed by the topic path (e.g. `user` or `user admin`) without overwriting a real command of the same key.

Flag `deprecated` and `deprecateAliases` are read by oclif's own help output but are not mapped to the OpenCLI document; there is no equivalent spec field. It cannot infer custom parsing, hooks, or command runtime behavior from the manifest.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
