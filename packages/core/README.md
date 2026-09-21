# @clidoc/core

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fcore)](https://www.npmjs.com/package/@clidoc/core)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fcore)](https://www.npmjs.com/package/@clidoc/core)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

TypeScript types, offline JSON Schema validation, YAML/JSON parsing, and Markdown documentation generation for [OpenCLI 1.0.0-alpha.14](https://github.com/bcdxn/opencli). The published package bundles the exact schema pinned in `upstream/opencli/spec.schema.json`.

```ts
import { parse, validate, renderMarkdown, generatePages } from '@clidoc/core';

const document = parse(sourceText); // JSON or YAML; throws on invalid input
const result = validate(document); // { valid, errors }
const markdown = renderMarkdown(document);
const pages = generatePages(document, { basePath: '/cli' });
```

`generatePages` returns a landing page and one page per visible command. Each page has `id`, `title`, `path`, and Markdown `content`. A command named `<binary> foo-bar` keeps the readable `/commands/foo-bar` route when its suffix is lowercase ASCII letters, digits, and single hyphens (up to 64 characters). Other names use a normalized readable prefix (up to 64 characters), a reserved `~`, and a SHA-256 digest of the full command name. Each route depends only on its command name, so adding unrelated commands does not change existing URLs. The generator rejects a digest collision before returning any pages. This replaces the previous collision-dependent hash suffixes, so URLs for names outside the readable form may change. Landing links use the generated base path. The bundled JSON Schema is also available at `@clidoc/core/schema`.

`validate` checks documents against the vendored JSON Schema and, once that passes, against the logical rules ported from upstream's `validate/validate.go`: positional arguments must not place a required argument after an optional one, `minItems`/`maxItems` are only valid on variadic arguments and flags (with `minItems <= maxItems`), `$FILE` alternative sources must have a matching file declared in `global.config`, flag names and aliases must be unique per command, variadic flags cannot be `required`, and group commands cannot declare `args` or `flags`. Errors use the same `instancePath message` shape as schema errors.

## Adding author-supplied metadata

Adapters generate a document from what your CLI's argument parser already knows, so things like
`examples`, `exitCodes`, `info.license`/`contact`, `install`, and `global` config are usually
missing. Add them with `mergeDocument`, then re-validate:

```ts
import { mergeDocument } from '@clidoc/core';

const documented = mergeDocument(document, {
  info: { license: { name: 'MIT', spdxId: 'MIT' } },
  install: [{ name: 'npm', command: 'npm i -g my-cli' }],
  commands: {
    'my-cli greet': {
      examples: [{ title: 'Basic', content: 'my-cli greet Ada' }],
      exitCodes: [{ code: 1, status: 'BAD_USER_INPUT_ERROR', summary: 'Missing name' }],
      flags: [{ name: 'language', alternativeSources: [{ type: '$ENV', property: 'LANG' }] }],
    },
  },
});
```

Plain objects (`info`, `global`, each command) merge recursively. Arrays replace the base array,
except `examples` and `exitCodes`, which append, and `flags`/`args`, which are merged item-by-item
matched by `name` &mdash; so you can add `alternativeSources` or a `summary` to one generated flag
without repeating the rest of it. Commands not present in the generated document are added as-is.
`mergeDocument` throws an `Error` listing every problem if the merged result fails schema
validation.

## Shell completion generation

`generateCompletion(document, { shell: 'bash' | 'zsh' | 'fish', binary?: string })`
validates an OpenCLI document and returns a standalone completion script. It
supports nested commands, aliases, global/local flags, option and positional
choices, and hidden entries, with no runtime dependency on Node or the target CLI.
The optional `binary` overrides only the registered executable name. See the
[completion guide](https://clidoc.ben3d.ca/docs/guides/completion) for activation,
supported syntax, and limitations.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
