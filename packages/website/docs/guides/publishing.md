---
title: Publishing integrations
sidebar_position: 4
---

# Publish from one CLI document

Both publishing integrations and standalone Markdown exports include a **Usage** block for each command derived from the specification. Angle brackets mark values to supply, square brackets mark optional items, and `...` marks repetition. For example:

```text
mycli send <file> [<destination>] [--format <format>] [--verbose]
```

Required flags appear without outer square brackets. Boolean flags have no value placeholder; visible global flags are included alongside command flags. The argument and flag tables provide descriptions and constraints.

## Docusaurus

`@clidoc/docusaurus` generates Markdown documents and sidebar entries while Docusaurus initializes. Point its `input` at an OpenCLI JSON or YAML file and set `outputDir` to a dedicated generated directory beneath `docs`. The [integration README](https://github.com/bhouston/clidoc/tree/main/packages/docusaurus) has a complete configuration example.

Generated files use readable names such as `clidoc.md` and `clidoc-validate.md`. Names that need disambiguation include a deterministic suffix. Page URLs and sidebar IDs remain stable, and regeneration removes old hash filenames recorded in the generated-file manifest.

## VitePress

`@clidoc/vitepress` generates a reference directory and sidebar from the same document. For a command such as `mycli validate` and `basePath: "/reference"`, it writes `reference/commands/validate.md` and links to `/reference/commands/validate` in both the landing page and sidebar. Other command names retain a readable prefix with a deterministic suffix where required by the shared route generator. The [integration README](https://github.com/bhouston/clidoc/tree/main/packages/vitepress) describes its setup.

This site uses the Docusaurus integration for its [CLI reference](/docs/cli/reference).

## Standalone Markdown

`clidoc markdown` and the Commander, oclif, and Yargs `docgen --format markdown` commands use the same renderer, so their command sections include the same usage syntax. They produce a single Markdown document rather than website routes.
