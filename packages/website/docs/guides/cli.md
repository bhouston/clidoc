---
title: CLI guide
sidebar_position: 2
---

# Work with the clidoc CLI

The [command reference](/docs/cli/reference) is generated from the same definitions the CLI executes.

Have the CLI you document write its own contract, then use clidoc to check and
render it:

```sh
npm install -g @clidoc/cli
mycli docgen --output cli.json
clidoc validate cli.json
clidoc markdown cli.json --output reference.md
```

`validate` and `markdown` automatically detect bcdxn OpenCLI 1.0.0-alpha.14 or opencli-dev OpenCLI 0.1.0 from the document marker. The `generate`, `docgen`, and `__opencli` commands continue to produce bcdxn OpenCLI, clidoc's preferred and default format. See the [specification comparison](/docs/specifications) for the exact support boundary.

## Convert between specifications

`convert` accepts either supported input dialect. Its target defaults to the
preferred bcdxn format and its output defaults to JSON:

```sh
clidoc convert opencli-dev.yaml --allow-lossy --output opencli.json
clidoc convert opencli.json --to opencli-dev --format yaml --output opencli-dev.yaml
```

The first example opts into the expected loss of opencli-dev operation identifiers,
which bcdxn cannot represent. Without `--allow-lossy`, it is a strict review that
reports the loss and writes no output.

Conversion is strict by default. If a feature such as an operation identifier or
structured output has no target equivalent, the command prints diagnostics to
stderr, writes no document, and exits unsuccessfully. Use `--allow-lossy` only
when those reported losses are acceptable:

```sh
clidoc convert opencli-dev.yaml --allow-lossy --output opencli.json
```

Some semantic ambiguities remain hard errors even with `--allow-lossy`, including
ambiguous decorated bcdxn command keys, a runnable bcdxn binary root, and
opencli-dev parent-local flag scope. These cases need author guidance rather than
silently dropping behavior.

An opencli-dev document may omit metadata that bcdxn requires. Its `info.title`
is used as the binary name when `info.binaryName` is absent and the title is a
valid executable name. Otherwise, supply identity at the conversion boundary:

```sh
clidoc convert opencli-dev.yaml \
  --allow-lossy \
  --title "Acme CLI" \
  --binary acme \
  --cli-version 2.0.0 \
  --output acme.opencli.json
```

`--output`/`-o` writes the document to a file; otherwise the successful document
is the only content written to stdout. Diagnostics always go to stderr.
Identity flags apply only to cross-dialect conversion. Same-dialect conversion
returns an unchanged deep copy and rejects `--title`, `--binary`, or
`--cli-version` rather than silently ignoring them.

When converting bcdxn to opencli-dev, clidoc derives deterministic operation IDs
from full command paths. Renaming a source path changes the generated ID.

`mycli __opencli` prints the same JSON to stdout for tool discovery. If you have
a trusted JavaScript module exporting command definitions and `info` metadata,
`clidoc generate ./definition.mjs --adapter yargs --output cli.json` is an
optional way to create the file. The module and supported Yargs builders execute
while loading metadata.
