---
title: Core library
sidebar_position: 3
---

# Parse, validate, and render

`@clidoc/core` exposes the OpenCLI schema and the operations used by the CLI and documentation integrations.

```ts
import { parse, renderMarkdown, validate } from '@clidoc/core';

const document = parse(source); // JSON or YAML; throws for invalid input
const result = validate(document);
const markdown = renderMarkdown(document);
```

Use [`generatePages`](/docs/api/functions/generatePages) for a landing page and one page per visible command. See the [API reference](/docs/api/reference) for signatures and TSDoc descriptions generated from the source.
