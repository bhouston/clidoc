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

The existing `parse`, `validate`, `OpenCliDocument`, and adapter APIs remain bcdxn-only. This preserves compatibility and keeps [bcdxn OpenCLI 1.0.0-alpha.14](/docs/specifications/bcdxn) as the preferred generation format. clidoc currently reads and renders [opencli-dev OpenCLI 0.1.0](/docs/specifications/opencli-dev), but adapters do not generate it and the core library does not yet convert between formats.

Use [`generatePages`](/docs/api) for a landing page and one page per visible command. See the [API reference](/docs/api) for signatures and TSDoc descriptions generated from the source.
