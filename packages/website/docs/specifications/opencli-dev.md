---
title: opencli-dev OpenCLI
sidebar_position: 2
---

# opencli-dev OpenCLI 0.1.0

[opencli-dev/opencli](https://github.com/opencli-dev/opencli) defines a separate format identified by `opencli: 0.1.0`. It uses a nested command tree and reusable components rather than bcdxn's flat command map. This page describes the [schema](https://github.com/opencli-dev/opencli/blob/c932fedb238e522124aaeb7fa907777ecbdb906b/schema/opencli.schema.json) and [semantic checks](https://github.com/opencli-dev/opencli/blob/c932fedb238e522124aaeb7fa907777ecbdb906b/tools/opencli/lint/lint.go) pinned at `c932fed`.

Its strengths include explicit hierarchy, operation identifiers, reusable commands and values, JSON Schema output contracts, standard-input metadata, deprecation, counters, sensitivity, flag groups, and output-format selection. Its argument defaults and flag scope differ from bcdxn, it permits less flexible aliases, and no equivalent to bcdxn's `__opencli` discovery convention was found in the inspected revision.

clidoc can automatically detect, validate, and render this format through the core library, CLI, Docusaurus integration, and VitePress integration:

```sh
clidoc validate opencli.yaml
clidoc markdown opencli.yaml --output reference.md
```

```ts
import { detectDialect, parseDocument, renderMarkdown, validateDocument } from '@clidoc/core';

const document = parseDocument(source);
if (detectDialect(document) === 'opencli-dev') {
  const result = validateDocument(document);
  const markdown = renderMarkdown(document);
}
```

Framework adapters and generation commands do not produce opencli-dev documents, and clidoc does not currently convert documents between specifications. bcdxn remains the default output format.

Validation covers the 0.1.0 structure and the semantic rules needed for reliable rendering, including component resolution, command-reference cycle limits, operation identifier uniqueness, argument ordering, flag relationships, and output selectors. Embedded schemas retain local JSON Pointer references; external references and anchors are rejected. A hidden parent command hides its subtree, and command paths remain relative when the document omits executable metadata. Validation is designed for clidoc interoperability and does not claim behavioral parity with every upstream generator.
