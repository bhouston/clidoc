# clidoc

CLI metadata becomes a portable OpenCLI document, then Markdown.

This VitePress site consumes the same generated document as the Docusaurus demo.
The sidebar is returned by `writeVitePress`, keeping links and pages in sync.

```sh
npm install -g @clidoc/cli
mycli docgen --output cli.json
clidoc validate cli.json
clidoc markdown cli.json --output reference.md
```

`mycli __opencli` prints the same document for discovery.

Choose a command in the sidebar to explore the generated reference.
