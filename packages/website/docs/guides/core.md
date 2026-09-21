---
title: Core library
sidebar_position: 3
---

# Parse, validate, and render

`@clidoc/core` exposes the OpenCLI schemas and the operations used by the CLI and documentation integrations. Use `parseDocument` and `validateDocument` when accepting either supported specification:

```ts
import { detectDialect, parseDocument, renderMarkdown, validateDocument } from '@clidoc/core';

const document = parseDocument(source); // JSON or YAML; throws for invalid input
const dialect = detectDialect(document); // 'bcdxn' or 'opencli-dev'
const result = validateDocument(document);
const markdown = renderMarkdown(document);
```

The existing `parse`, `validate`, `OpenCliDocument`, and adapter APIs remain bcdxn-only. This preserves compatibility and keeps [bcdxn OpenCLI 1.0.0-alpha.14](/docs/specifications/bcdxn) as the preferred generation format. clidoc reads and renders [opencli-dev OpenCLI 0.1.0](/docs/specifications/opencli-dev), but adapters do not generate it directly.

## Convert documents

`convertDocument` converts between the two supported specifications. Its target
defaults to bcdxn:

```ts
import { ConversionError, convertDocument, parseDocument } from '@clidoc/core';

const source = parseDocument(sourceText);

try {
  const { document, diagnostics } = convertDocument(source, {
    to: 'bcdxn',
    allowLossy: true,
  });
} catch (error) {
  if (error instanceof ConversionError) console.error(error.diagnostics);
}
```

Strict conversion rejects mappings that would lose information. Set
`allowLossy: true` to receive a converted document plus diagnostics for accepted
losses. Ambiguities that cannot produce reliable target semantics remain errors.
For opencli-dev input without the metadata bcdxn requires, pass
`info: { title, binary, version }`. Same-dialect conversion returns a deep clone
and preserves authored fields; identity overrides on a same-dialect conversion
are rejected. If opencli-dev `info.binaryName` is absent, its `info.title` is used
as the bcdxn binary name when valid.

bcdxn-to-opencli-dev conversion derives deterministic `operationId` values from
full command paths. Renaming a source path changes its generated identifier.

Use [`generatePages`](/docs/api) for a landing page and one page per visible command. See the [API reference](/docs/api) for signatures and TSDoc descriptions generated from the source.
