---
slug: /
title: clidoc
sidebar_position: 0
---

# One CLI contract. Documentation everywhere.

clidoc brings Yargs, Commander, and oclif metadata into a shared, validated
OpenCLI document. Markdown is the publishing format, so generated reference pages
can live alongside your hand-written guides.

This site is built with Docusaurus. Its CLI reference is generated from the
same `yargs-file-commands` definitions that run the clidoc tool.

## Start with your CLI

1. Add a `docgen --output cli.json` command to the CLI you document.
2. Run `mycli docgen --output cli.json`.
3. Install the renderer with `npm install -g @clidoc/cli`.
4. Run `clidoc validate cli.json`.
5. Run `clidoc markdown cli.json --output reference.md`, or use a site consumer.

The exact `mycli --opencli` invocation can print the same document for discovery.

Browse **clidoc** in the sidebar for the generated command reference.

## More than one publishing platform

The repository also includes a VitePress demo. Both sites consume the same
OpenCLI document and keep the source CLI independent of the publishing stack.
