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

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
