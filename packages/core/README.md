# @opencli/core

TypeScript types, offline JSON Schema validation, YAML/JSON parsing, and Markdown documentation generation for [OpenCLI 1.0.0-alpha.14](https://github.com/bcdxn/opencli). The published package bundles the exact schema pinned in `upstream/opencli/spec.schema.json`.

```ts
import { parse, validate, renderMarkdown, generatePages } from '@opencli/core';

const document = parse(sourceText); // JSON or YAML; throws on invalid input
const result = validate(document); // { valid, errors }
const markdown = renderMarkdown(document);
const pages = generatePages(document, { basePath: '/cli' });
```

`generatePages` returns a landing page and one page per visible command. Each page has `id`, `title`, `path`, and Markdown `content`. Command routes use readable ASCII slugs with stable hash suffixes, and landing links use the generated base path. The bundled JSON Schema is also available at `@opencli/core/schema`.
