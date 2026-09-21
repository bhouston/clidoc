---
title: bcdxn OpenCLI
sidebar_position: 1
---

# bcdxn OpenCLI 1.0.0-alpha.14

[bcdxn/opencli](https://github.com/bcdxn/opencli) is the original specification adopted by clidoc. It identifies documents with `opencliVersion: 1.0.0-alpha.14` and represents commands as a map keyed by full invocation strings. This page describes the [schema pinned at `683d0ca`](https://github.com/bcdxn/opencli/blob/683d0ca92fc37ccc2626e64db0a8c32f3c4063c0/spec.schema.json).

This is clidoc's **preferred specification**. All framework adapters and generation commands produce it, and existing APIs such as `parse`, `validate`, `OpenCliDocument`, `mergeDocument`, and `handleOpenCliRequest` remain specific to it. The hidden `__opencli` discovery command follows the convention established by this project.

Its strengths include installation methods, configuration-file metadata, environment and file alternatives for flags, multiple aliases, typed choices with descriptions, bounded repeated values, passthrough arguments, and extension fields. The flat command map is easy to render, but it carries less explicit hierarchy and fewer structured input/output contracts than opencli-dev.

Generate and consume a document with the default workflow:

```sh
mycli docgen --output cli.json
clidoc validate cli.json
clidoc markdown cli.json --output reference.md
```

In TypeScript, the established APIs remain available:

```ts
import { parse, renderMarkdown, validate } from '@clidoc/core';

const document = parse(source);
const result = validate(document);
const markdown = renderMarkdown(document);
```

clidoc validates against its bundled schema and additional logical rules. The package works offline; checking out the upstream submodule is only needed for repository tests that compare the bundled schema and fixtures with the pinned source.
