# @clidoc/adapter-oclif

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fadapter-oclif)](https://www.npmjs.com/package/@clidoc/adapter-oclif)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fadapter-oclif)](https://www.npmjs.com/package/@clidoc/adapter-oclif)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

Part of [clidoc](https://clidoc.ben3d.ca), tooling for publishing CLI reference documentation from an [OpenCLI](https://github.com/bcdxn/opencli) document.

`fromOclif` converts the command metadata in oclif's generated `manifest.json` into an OpenCLI `1.0.0-alpha.14` document. Pass the manifest and the CLI title, executable name, and version. The adapter reads metadata only; it does not load commands, parse arguments, or run handlers. Generate or refresh the oclif manifest as part of your build so `--opencli` reflects the current commands.

## Add `docgen` and `--opencli` to your CLI

Add `mycli docgen --output cli.json` to write the OpenCLI document from your CLI metadata. Reserve the **exact top-level** `mycli --opencli` invocation as a discovery command. Print only one UTF-8 JSON OpenCLI document followed by a newline to stdout, then exit with status 0. Report errors on stderr and exit nonzero; do not run command handlers. Check for the exact invocation in your executable entry point before handing arguments to oclif; other invocations continue through the normal CLI.

```ts
import { readFileSync } from 'node:fs';
import { run } from '@oclif/core';
import { fromOclif } from '@clidoc/adapter-oclif';

const document = () => {
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
  return fromOclif(manifest, {
    title: 'My CLI',
    binary: 'mycli',
    version: '1.0.0',
  });
};
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--opencli') {
  process.stdout.write(`${JSON.stringify(document())}\n`);
} else {
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

The [runnable oclif demo](../../demos/oclif/src/index.ts) implements `docgen` with a required `--output` flag. Adjust the manifest paths for your built executable and command. Run `mycli docgen --output cli.json` for JSON (the default), or `mycli docgen --format markdown --output reference.md` to render Markdown directly. Install the validator with `npm install -g @clidoc/cli` and run `clidoc validate cli.json`. Consumers can also run `mycli --opencli > mycli.opencli.json` for discovery.

## Supported metadata

The adapter reads command IDs, descriptions, aliases, visibility, flags, and arguments from the generated manifest. It maps supported types, defaults, choices, required status, and repeatable flags. It cannot infer custom parsing, hooks, or command runtime behavior from the manifest.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
