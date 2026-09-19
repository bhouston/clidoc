---
slug: /
title: OpenCLI JS/TS
sidebar_position: 0
---

# One CLI contract. Documentation everywhere.

OpenCLI brings Yargs, Commander, and oclif metadata into a shared, validated
JSON contract. Markdown is the publishing format, so generated reference pages
can live alongside your hand-written guides.

This site is built with Docusaurus. Its CLI reference is generated from the
same `yargs-file-commands` definitions that run the OpenCLI tool.

## Start with your CLI

1. Export your command definitions and an `info` object from a JavaScript module.
2. Run `opencli generate ./definition.js --adapter yargs --output cli.json`.
3. Run `opencli validate cli.json`.
4. Run `opencli markdown cli.json --output reference.md`, or use a site consumer.

Browse **OpenCLI JS/TS** in the sidebar for the generated command reference.

## More than one publishing platform

The repository also includes a VitePress demo. Both sites consume the same
OpenCLI document and keep the source CLI independent of the publishing stack.
