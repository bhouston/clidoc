# clidoc

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fcli)](https://www.npmjs.com/package/@clidoc/cli)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fcli)](https://www.npmjs.com/package/@clidoc/cli)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

Turn CLI definitions into a portable OpenCLI document, then publish Markdown
wherever your documentation lives.

This TypeScript monorepo adopts the [OpenCLI specification](https://github.com/bcdxn/opencli).
It provides adapters for Yargs, Commander, and oclif, a command-line tool, and
Docusaurus and VitePress consumers. The clidoc tool documents itself from its
own `yargs-file-commands` definitions.

## Packages

| Package                                                   | Purpose                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [`@clidoc/core`](packages/core)                           | Types, offline JSON Schema validation, JSON/YAML parsing, Markdown, pages and routes |
| [`@clidoc/adapter-yargs`](packages/adapter-yargs)         | Yargs command modules, including supported `defineCommand` builders                  |
| [`@clidoc/adapter-commander`](packages/adapter-commander) | Configured Commander command trees                                                   |
| [`@clidoc/adapter-oclif`](packages/adapter-oclif)         | oclif manifest command metadata                                                      |
| [`@clidoc/cli`](packages/cli)                             | `generate`, `validate`, and `markdown` commands                                      |
| [`@clidoc/docusaurus`](packages/docusaurus)               | Generated Markdown pages for the Docusaurus docs plugin                              |
| [`@clidoc/vitepress`](packages/vitepress)                 | Generated Markdown and matching VitePress sidebar links                              |

Packages are not published by creating or merging a PR. Use the workspace
commands below until a maintainer runs the first release.

## Run from source

Use the Node version in `.nvmrc` and pnpm specified in `package.json`.

```sh
git clone --recurse-submodules https://github.com/bhouston/clidoc.git
cd clidoc
pnpm install --frozen-lockfile
pnpm build
node packages/cli/dist/bin.js --help
pnpm docs:generate
node packages/cli/dist/bin.js validate docs/generated/clidoc.json
node packages/cli/dist/bin.js markdown docs/generated/clidoc.json
```

Already cloned? Run `git submodule update --init --recursive` before the tests.

## Generate from your CLI

For CLI authors, expose the exact top-level `mycli --opencli` invocation. It
prints only one UTF-8 OpenCLI JSON document followed by a newline to stdout and
exits with status 0. Check for exactly that argument before your framework
parses the command line; do not run handlers. Report errors on stderr and exit
nonzero. Let other invocations use normal parsing. This gives tools a consistent
discovery command: `mycli --opencli > mycli.opencli.json`. The
[Yargs](packages/adapter-yargs), [Commander](packages/adapter-commander), and
[oclif](packages/adapter-oclif) adapter guides show the entry-point code.

You can also generate a document from a trusted local module that exports its
framework definitions as `default` and CLI metadata as `info`:

```js
// definition.mjs — ordinary Yargs command metadata
export const info = {
  title: 'Example CLI',
  binary: 'example',
  version: '1.0.0',
};

export default [
  {
    command: 'greet <name>',
    describe: 'Greet a person',
    builder: {
      language: { type: 'string', choices: ['en', 'fr'], default: 'en' },
    },
  },
];
```

```sh
node packages/cli/dist/bin.js generate ./definition.mjs --adapter yargs --output cli.json
node packages/cli/dist/bin.js validate cli.json
node packages/cli/dist/bin.js markdown cli.json --output reference.md
```

For Commander, export a configured `Command`; for oclif, export its manifest
object. Importing a definition module executes its top-level JavaScript, and
supported Yargs builder callbacks run to collect metadata. Use trusted modules.
Adapters do not parse user arguments or invoke command handlers.

## Use the pipeline as a library

```ts
import { fromCommander } from '@clidoc/adapter-commander';
import { renderMarkdown, validate } from '@clidoc/core';

const document = fromCommander(program, {
  title: 'My CLI',
  binary: 'my-cli',
  version: '1.0.0',
});
const result = validate(document);
if (!result.valid) throw new Error(result.errors.join('\n'));
const markdown = renderMarkdown(document);
```

`generatePages(document, { basePath: '/reference' })` returns stable page IDs,
titles, URL paths, and Markdown content. Both site consumers use that mapping.
Use different base paths and dedicated generated directories for multiple CLIs.
Hand-written guides stay as ordinary Markdown alongside generated reference pages.

## Demos and dogfooding

```sh
pnpm --filter @clidoc/demo-yargs build
pnpm --filter @clidoc/demo-yargs start greet Ada --language fr
pnpm --filter @clidoc/demo-commander build
pnpm --filter @clidoc/demo-commander start greet Ada
pnpm --filter @clidoc/demo-oclif build
pnpm --filter @clidoc/demo-oclif start Ada

pnpm docs:build
pnpm --filter @clidoc/demo-docusaurus dev
# Or:
pnpm --filter @clidoc/demo-vitepress dev
```

Each CLI demo accepts standalone `--opencli` to print its document. The Yargs demo uses
barebones Yargs; the clidoc tool uses `defineCommand` and `fileCommands`, following
the structure used by [hdrify](https://github.com/bhouston/hdrify).

The [generated CLI reference](docs/generated/cli.md) and
[OpenCLI JSON](docs/generated/clidoc.json) come from the actual command modules.
`pnpm docs:generate` refreshes them; both sites consume the same JSON.

## Compatibility and scope

The contract is **OpenCLI `1.0.0-alpha.14`**, pinned to upstream commit
`683d0ca92fc37ccc2626e64db0a8c32f3c4063c0` in [`upstream/opencli`](upstream/opencli).
The core package bundles that schema, so installed packages validate offline
without the submodule. Tests compare the bundled schema and upstream fixtures.
The upstream Go project retains its own license; see
[third-party attribution](packages/core/THIRD_PARTY_NOTICES.md).

Framework metadata cannot express every runtime behavior. The adapters document
what their supported metadata exposes; they do not infer custom validation,
coercion, middleware, or application behavior. See each adapter README for limits.
Schema validation follows the upstream JSON Schema, rather than claiming identical
behavior to every semantic check in the Go CLI.

This first implementation focuses on the CLI-to-Markdown pipeline. OpenAPI and
TypeDoc ingestion, a standalone embeddable React viewer, additional site platforms,
and an integrated preview server remain extensions to that pipeline.

## Contributing and releasing

Follow [CONTRIBUTING.md](CONTRIBUTING.md): issue first, issue-numbered branch,
Conventional Commits, checks, then a PR against `main`.

```sh
pnpm lint
pnpm tsc
pnpm test --coverage
pnpm audit --audit-level=high
pnpm package:check
pnpm docs:build
```

The repository follows `vitest-gpu`: pnpm workspaces, TypeScript builds, Vitest,
Oxlint/Oxfmt, Husky/commitlint, MIT licensing, and independent manually dispatched
semantic releases. See [release and deployment setup](docs/releasing.md).

## License

MIT. See [LICENSE](LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
