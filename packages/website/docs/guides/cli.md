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

`mycli __opencli` prints the same JSON to stdout for tool discovery. To build
the document in code, use the framework packages' `fromYargs`, `fromCommander`,
or `fromOclif` functions; see the [framework guides](/docs/frameworks/).

Generate shell completions with `clidoc completion bash`, `clidoc completion zsh`,
or `clidoc completion fish`. Add `--input cli.json` to target another CLI instead
of clidoc itself. See [shell completion](./completion.md) for activation and
persistent installation.

To expose a documented CLI to an MCP client, use `clidoc mcp`. See the
[MCP bridge guide](./mcp.md) for export, stdio serving, and client setup.

Automate validation on pull requests with the
[GitHub Actions guide](./github-action.md).
