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

`mycli --opencli` prints the same JSON to stdout for tool discovery. If you have
a trusted JavaScript module exporting command definitions and `info` metadata,
`clidoc generate ./definition.mjs --adapter yargs --output cli.json` is an
optional way to create the file. The module and supported Yargs builders execute
while loading metadata.
