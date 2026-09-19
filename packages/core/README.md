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

`generatePages` returns a landing page and one page per visible command. Each page has `id`, `title`, `path`, and Markdown `content`. Command routes use readable ASCII slugs with stable hash suffixes, and landing links use the generated base path. The bundled JSON Schema is also available at `@clidoc/core/schema`.

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
