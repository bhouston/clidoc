# clidoc

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fcli)](https://www.npmjs.com/package/@clidoc/cli)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fcli)](https://www.npmjs.com/package/@clidoc/cli)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.dev-blue)](https://clidoc.dev)

Turn CLI definitions into a portable OpenCLI document, then publish Markdown
wherever your documentation lives.

This TypeScript monorepo adopts the [OpenCLI specification](https://github.com/bcdxn/opencli).
It provides framework integrations for Yargs, Commander, and oclif, a command-line tool, and
Docusaurus and VitePress consumers. The clidoc tool documents itself from its
own `yargs-file-commands` definitions.

## Packages

### Main packages

| Package                         | Purpose                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| [`@clidoc/core`](packages/core) | Types, offline JSON Schema validation, JSON/YAML parsing, Markdown, pages and routes |
| [`@clidoc/cli`](packages/cli)   | `validate`, `markdown`, `docgen`, `completion`, and `mcp` commands, plus `__opencli` |

### CLI framework adapters

| Package                                   | Purpose                                                             |
| ----------------------------------------- | ------------------------------------------------------------------- |
| [`@clidoc/yargs`](packages/yargs)         | Yargs command modules, including supported `defineCommand` builders |
| [`@clidoc/commander`](packages/commander) | Configured Commander command trees                                  |
| [`@clidoc/oclif`](packages/oclif)         | oclif manifest command metadata                                     |

### Publishing adapters

| Target                                      | Purpose                                                      |
| ------------------------------------------- | ------------------------------------------------------------ |
| [`@clidoc/docusaurus`](packages/docusaurus) | Generated Markdown pages for the Docusaurus docs plugin      |
| [`@clidoc/vitepress`](packages/vitepress)   | Generated Markdown and matching VitePress sidebar links      |
| [`clidoc markdown`](packages/cli)           | A single Markdown reference document for any other docs site |

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
[upstream OpenCLI's Go libraries](https://github.com/bcdxn/opencli). With no
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
[Yargs](packages/yargs), [Commander](packages/commander), and
[oclif](packages/oclif) framework guides and runnable demos show this.

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

## Validate

`clidoc validate cli.json` checks a JSON or YAML document against the bundled
OpenCLI schema and the upstream logical rules, offline. `@clidoc/core` exposes
the same check as `validate(document)`.

### GitHub Action

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
and pinned validator versions. Its default uses a locked source build. See the
[official CI guide](https://clidoc.dev/docs/github-action/) for a complete
workflow and version selection. This repository runs the hosted action against
its generated CLI specification on Linux and macOS.

The standalone action is also available as the optional HTTPS submodule
[`submodules/clidoc-action`](https://github.com/bhouston/clidoc-action).
Initialize it with `git submodule update --init submodules/clidoc-action` to
work on the action alongside the monorepo. Consuming the hosted action requires
no submodule checkout.

## MCP

Export MCP tool definitions with `clidoc mcp cli.json -o tools.json`, or serve a
trusted local executable with
`clidoc mcp cli.json --serve --executable /absolute/path/to/mycli`.
See the [MCP guide](packages/website/docs/mcp.md) for client configuration,
argument mapping, process limits, and the `@clidoc/cli/mcp` library API.

## Use the pipeline as a library

```ts
import { fromCommander } from '@clidoc/commander';
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

## Development

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

## Compatibility

clidoc implements **OpenCLI `1.0.0-alpha.14`**, pinned to upstream commit
`683d0ca92fc37ccc2626e64db0a8c32f3c4063c0` in [`upstream/opencli`](upstream/opencli).
The core package bundles the schema, so validation works offline. The upstream Go
project keeps its own license; see
[third-party attribution](packages/core/THIRD_PARTY_NOTICES.md).

Command keys are plain `binary sub command` paths, which page titles, routes, and
`commands[...]` lookups rely on. Upstream decorates keys for display, such as
`"petstore pet add <arguments> [flags]"`. Both forms validate, and `clidoc validate`
accepts either.

Validation combines the upstream JSON Schema with the logical checks from upstream
`validate/validate.go`: argument ordering, variadic constraints, `$FILE` config
references, and duplicate flags.

Framework adapters expose what their metadata describes. They do not infer custom
validation, coercion, middleware, or application behavior. Each adapter README lists
its limitations.

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
