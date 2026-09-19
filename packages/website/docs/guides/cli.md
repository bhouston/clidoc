---
title: CLI guide
sidebar_position: 2
---

# Work with the clidoc CLI

Install with `npm install --global @clidoc/cli`, then run `clidoc --help` to see available commands. The [command reference](./docs/cli/reference) is generated from the same definitions the CLI executes.

```sh
clidoc generate --help
clidoc validate --help
clidoc markdown --help
```

Use `generate` with a supported command definition, `validate` to check an OpenCLI JSON or YAML document against the vendored specification, and `markdown` to render a checked document for a README or another documentation site.
