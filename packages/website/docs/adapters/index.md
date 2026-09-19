---
title: Framework adapters
sidebar_position: 5
---

# Generate from existing command definitions

clidoc adapters convert framework definitions into an OpenCLI document. The resulting document can be validated, rendered, and published through either documentation integration.

| Framework | Package | Entry point |
| --- | --- | --- |
| Commander | `@clidoc/adapter-commander` | [`fromCommander`](https://github.com/bhouston/clidoc/tree/main/packages/adapter-commander) |
| oclif | `@clidoc/adapter-oclif` | [`fromOclif`](https://github.com/bhouston/clidoc/tree/main/packages/adapter-oclif) |
| yargs | `@clidoc/adapter-yargs` | [`fromYargs`](https://github.com/bhouston/clidoc/tree/main/packages/adapter-yargs) |

Read each adapter's README for its supported command features and example usage.
