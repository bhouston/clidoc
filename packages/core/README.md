# @clidoc/core

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fcore)](https://www.npmjs.com/package/@clidoc/core)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fcore)](https://www.npmjs.com/package/@clidoc/core)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

TypeScript types, offline validation, YAML/JSON parsing, and Markdown documentation generation for two independent OpenCLI specifications. [bcdxn OpenCLI 1.0.0-alpha.14](https://github.com/bcdxn/opencli) is preferred and remains the default for generated output. [opencli-dev OpenCLI 0.1.0](https://github.com/opencli-dev/opencli) is supported as input for validation and documentation rendering.

```ts
import { parse, validate, renderMarkdown, generatePages } from '@clidoc/core';

const document = parse(sourceText); // JSON or YAML; throws on invalid input
const result = validate(document); // { valid, errors }
const markdown = renderMarkdown(document);
const pages = generatePages(document, { basePath: '/cli' });
```

The established `parse`, `validate`, and `OpenCliDocument` APIs are bcdxn-only.
Use the dialect-aware APIs when accepting either supported format:

```ts
import { detectDialect, parseDocument, renderMarkdown, validateDocument } from '@clidoc/core';

const document = parseDocument(sourceText);
const dialect = detectDialect(document); // 'bcdxn' or 'opencli-dev'
const result = validateDocument(document);
const markdown = renderMarkdown(document);
```

`renderMarkdown` and `generatePages` accept either supported document type.
Adapters and generation APIs continue to return bcdxn documents. Convert explicitly
when another representation is needed:

```ts
import { convertDocument, parseDocument } from '@clidoc/core';

const source = parseDocument(sourceText);
const converted = convertDocument(source, { to: 'bcdxn', allowLossy: true });

for (const diagnostic of converted.diagnostics) {
  console.warn(`${diagnostic.path}: ${diagnostic.message}`);
}
```

The target defaults to `bcdxn`. Conversion is strict by default and throws a
`ConversionError` with structured diagnostics before returning a document when a
mapping would lose information. Set `allowLossy: true` to accept reported losses.
Hard semantic ambiguities still fail because discarding information cannot make
the result dependable. If opencli-dev input omits metadata required by bcdxn,
provide `info: { title, binary, version }`. Converting to the same dialect returns
a deep clone that preserves the document; passing identity overrides for a
same-dialect conversion is an error. When opencli-dev `info.binaryName` is absent,
its `info.title` supplies the bcdxn binary name if it is valid.

Conversion from bcdxn creates deterministic opencli-dev `operationId` values from
full command paths. They remain stable while the paths do, but renaming a source
command changes its generated identifier.

`generatePages` returns a landing page and one page per visible command. Each page has `id`, `title`, `path`, and Markdown `content`. A command named `<binary> foo-bar` keeps the readable `/commands/foo-bar` route when its suffix is lowercase ASCII letters, digits, and single hyphens (up to 64 characters). Other names use a normalized readable prefix (up to 64 characters), a reserved `~`, and a SHA-256 digest of the full command name. Each route depends only on its command name, so adding unrelated commands does not change existing URLs. The generator rejects a digest collision before returning any pages. This replaces the previous collision-dependent hash suffixes, so URLs for names outside the readable form may change. Landing links use the generated base path. The bundled JSON Schema is also available at `@clidoc/core/schema`.

`validate` checks bcdxn documents against the vendored JSON Schema and, once that passes, against the logical rules ported from upstream's `validate/validate.go`: positional arguments must not place a required argument after an optional one, `minItems`/`maxItems` are only valid on variadic arguments and flags (with `minItems <= maxItems`), `$FILE` alternative sources must have a matching file declared in `global.config`, flag names and aliases must be unique per command, variadic flags cannot be `required`, and group commands cannot declare `args` or `flags`. Errors use the same `instancePath message` shape as schema errors.

`validateDocument` selects those rules for bcdxn or the independently authored
opencli-dev 0.1.0 compatibility schema and semantic checks. opencli-dev component
references are local, command cycles and excessive expansion are rejected, and
embedded JSON Schemas support resolvable local JSON Pointers. External references
and anchors are rejected. Rendering keeps command paths relative
when executable metadata is absent, and hiding a parent hides its subtree. These
checks support dependable documentation; they do not claim exact parity with every
upstream generator.

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

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
