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
| [`@clidoc/cli`](packages/cli)                             | `generate`, `validate`, `markdown`, and `docgen` commands, plus `__opencli`          |
| [`@clidoc/docusaurus`](packages/docusaurus)               | Generated Markdown pages for the Docusaurus docs plugin                              |
| [`@clidoc/vitepress`](packages/vitepress)                 | Generated Markdown and matching VitePress sidebar links                              |

## Run from source

For repository development, use the Node version in `.nvmrc` and pnpm specified in `package.json`.

```sh
git clone https://github.com/bhouston/clidoc.git
cd clidoc
pnpm install --frozen-lockfile
pnpm build
node packages/cli/dist/bin.js --help
pnpm docs:generate
node packages/cli/dist/bin.js validate docs/generated/clidoc.json
node packages/cli/dist/bin.js markdown docs/generated/clidoc.json
```

The upstream OpenCLI submodule is optional. Already cloned? Run
`git submodule update --init --recursive` to enable tests that compare the bundled
schema and validate upstream examples. Without the submodule, those tests skip
with a warning and the remaining tests run normally.

## Validate specifications in CI

Use [clidoc-action](https://github.com/bhouston/clidoc-action) to reject invalid
OpenCLI specifications in pull requests:

```yaml
- uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6
- uses: bhouston/clidoc-action@61df600ccfb0fd9dbbe7093b7e392b06662fac85 # v1
  with:
    files: opencli.json
    specification: bcdxn
    format: json
```

The action accepts JSON/YAML, multiple files, explicit specification dialects,
and pinned validator versions. Its default uses a locked source build until the
clidoc npm packages are published. See the
[official CI guide](https://clidoc.ben3d.ca/docs/guides/github-action) for a complete
workflow and version selection. This repository runs the hosted action against
its generated CLI specification on Linux and macOS.

The standalone action is also available as the optional HTTPS submodule
[`submodules/clidoc-action`](https://github.com/bhouston/clidoc-action).
Initialize it with `git submodule update --init submodules/clidoc-action` to
work on the action alongside the monorepo. Consuming the hosted action requires
no submodule checkout.

## Generate from your CLI

Add a human-facing `docgen` command to the CLI you document. It should use the
same command metadata as the running CLI and write an OpenCLI document as JSON
or Markdown:

```sh
npm install -g @clidoc/cli
mycli docgen --output cli.json
mycli docgen --format markdown --output reference.md
clidoc validate cli.json
```

For machine discovery, also attach the hidden `__opencli` subcommand, matching
[upstream OpenCLI's Go adapters](https://github.com/bcdxn/opencli). With no
flags it writes one UTF-8 OpenCLI JSON document followed by a newline to
stdout and exits with status 0; `-o`/`--out <file>` (upstream's own flag)
writes it to a file instead. `@clidoc/core` exports an async
`handleOpenCliRequest(argv, document)` helper that checks argv for `__opencli`
before your framework parses the command line, so handlers never run:

```ts
import { handleOpenCliRequest } from '@clidoc/core';

if (!(await handleOpenCliRequest(process.argv.slice(2), buildDocument))) {
  // parse and run the CLI as usual
}
```

For example, `mycli __opencli > mycli.opencli.json` or
`mycli __opencli --out mycli.opencli.json` both capture the document. The
[Yargs](packages/adapter-yargs), [Commander](packages/adapter-commander), and
[oclif](packages/adapter-oclif) adapter guides and runnable demos show this.

As an optional path for trusted local modules, `clidoc generate` imports a
module exporting framework definitions as `default` and CLI metadata as `info`:

```sh
clidoc generate ./definition.mjs --adapter yargs --output cli.json
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

Add author-supplied metadata a generator can't infer &mdash; examples, exit
codes, license, install methods &mdash; with `mergeDocument`:

```ts
import { mergeDocument } from '@clidoc/core';

const documented = mergeDocument(document, {
  info: { license: { name: 'MIT', spdxId: 'MIT' } },
  commands: {
    'my-cli greet': {
      examples: [{ title: 'Basic', content: 'my-cli greet Ada' }],
      exitCodes: [{ code: 1, status: 'BAD_USER_INPUT_ERROR', summary: 'Missing name' }],
    },
  },
});
```

`generatePages(document, { basePath: '/reference' })` returns stable page IDs,
titles, URL paths, and Markdown content. Both site consumers use that mapping.
Use different base paths and dedicated generated directories for multiple CLIs.
Hand-written guides stay as ordinary Markdown alongside generated reference pages.

## Demos and dogfooding

```sh
pnpm build
pnpm --filter @clidoc/demo-yargs start greet Ada --language fr
pnpm --filter @clidoc/demo-commander start greet Ada
pnpm --filter @clidoc/demo-oclif start Ada

pnpm dev
```

`pnpm build` builds every package and demo. `pnpm dev` starts the website and
demo site dev servers together: the main website on port 4000, the
Docusaurus demo on 4001, and the VitePress demo on 4002.

Each CLI demo supports `docgen --output cli.json` for humans and the hidden
`__opencli` subcommand for machine discovery, e.g.
`pnpm --filter @clidoc/demo-yargs start __opencli`. The Yargs
demo uses barebones Yargs; the clidoc tool uses `defineCommand` and
`fileCommands`, following the structure used by
[hdrify](https://github.com/bhouston/hdrify). `clidoc` itself dogfoods this
same workflow: `clidoc docgen` and `clidoc __opencli` describe the `clidoc`
binary.

The [generated CLI reference](docs/generated/cli.md) and
[OpenCLI JSON](docs/generated/clidoc.json) come from the actual command modules.
They are committed, unlike each site's own `outputDir`, so the demo sites and
website build straight from a checkout with no generation step; `pnpm docs:generate`
refreshes them locally, and CI's `docs:build` regenerates them before building
the sites.

## Example document

Trimmed from [`docs/generated/clidoc.json`](docs/generated/clidoc.json), the document clidoc
generates for itself:

```json
{
  "opencliVersion": "1.0.0-alpha.14",
  "info": {
    "title": "clidoc",
    "binary": "clidoc",
    "version": "0.1.0",
    "summary": "Generate, validate, and publish CLI documentation through OpenCLI."
  },
  "commands": {
    "clidoc generate": {
      "summary": "Import a trusted framework definition module and generate OpenCLI JSON",
      "args": [
        {
          "name": "module",
          "required": true,
          "type": "string",
          "summary": "Trusted JS module exporting default metadata and info"
        }
      ],
      "flags": [
        {
          "name": "adapter",
          "type": "string",
          "summary": "Framework adapter",
          "required": true,
          "choices": [{ "value": "yargs" }, { "value": "commander" }, { "value": "oclif" }]
        }
      ]
    },
    "clidoc validate": {
      "summary": "Validate an OpenCLI JSON or YAML document",
      "args": [
        {
          "name": "input",
          "required": true,
          "type": "string",
          "summary": "OpenCLI document filename"
        }
      ]
    }
  }
}
```

## Compatibility and scope

The contract is **OpenCLI `1.0.0-alpha.14`**, pinned to upstream commit
`683d0ca92fc37ccc2626e64db0a8c32f3c4063c0` in [`upstream/opencli`](upstream/opencli).
The core package bundles that schema, so installed packages validate offline
without the submodule. Tests compare the bundled schema and upstream fixtures when
the submodule is checked out.
The upstream Go project retains its own license; see
[third-party attribution](packages/core/THIRD_PARTY_NOTICES.md).

The OpenCLI schema only requires `commands` keys to be strings; it does not mandate a
format. Upstream's Go generator decorates keys for display, e.g.
`"petstore pet add <arguments> [flags]"`. clidoc emits the plain `binary sub command` path
instead, as shown above, because page titles, route slugs, and `commands[...]` lookups all
want that exact string. Both forms validate against the schema, and `clidoc validate`
accepts upstream's decorated documents unchanged.

Framework metadata cannot express every runtime behavior. The adapters document
what their supported metadata exposes; they do not infer custom validation,
coercion, middleware, or application behavior. See each adapter README for limits.
Schema validation follows the upstream JSON Schema and is paired with the logical
checks ported from upstream's `validate/validate.go` (argument ordering, variadic
constraints, `$FILE` config references, duplicate flags), rather than claiming
identical behavior to every semantic check in the Go CLI.

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

The repository follows a standard TypeScript toolchain: pnpm workspaces, TypeScript builds,
Vitest, Oxlint/Oxfmt, Husky/commitlint, MIT licensing, and independent manually dispatched
semantic releases. See [release and deployment setup](docs/releasing.md).

## License

MIT. See [LICENSE](LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
