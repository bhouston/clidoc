# OpenCLI JS/TS

CLI metadata becomes a portable OpenCLI document, then Markdown.

This VitePress site consumes the same generated document as the Docusaurus demo.
The sidebar is returned by `writeVitePress`, keeping links and pages in sync.

```sh
opencli generate ./definition.js --adapter yargs --output cli.json
opencli markdown cli.json --output reference.md
```

Choose a command in the sidebar to explore the generated reference.
