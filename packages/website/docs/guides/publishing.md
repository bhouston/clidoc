---
title: Publishing integrations
sidebar_position: 4
---

# Publish from one CLI document

## Docusaurus

`@clidoc/docusaurus` generates Markdown documents and sidebar entries while Docusaurus initializes. Point its `input` at an OpenCLI JSON or YAML file and set `outputDir` to a dedicated generated directory beneath `docs`. The [integration README](https://github.com/bhouston/clidoc/tree/main/packages/docusaurus) has a complete configuration example.

## VitePress

`@clidoc/vitepress` generates a reference directory and sidebar from the same document. The [integration README](https://github.com/bhouston/clidoc/tree/main/packages/vitepress) describes its setup.

This site uses the Docusaurus integration for its [CLI reference](./docs/cli/reference).
