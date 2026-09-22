# @clidoc/cli

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fcli)](https://www.npmjs.com/package/@clidoc/cli)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fcli)](https://www.npmjs.com/package/@clidoc/cli)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.dev-blue)](https://clidoc.dev)

Validate, render, and publish OpenCLI documents from the command line.

```sh
npm install -g @clidoc/cli
```

```sh
mycli docgen --output cli.json
clidoc validate cli.json
clidoc markdown cli.json --output reference.md
```

`mycli docgen` comes from a framework adapter: [Yargs](../yargs), [Commander](../commander), or [oclif](../oclif). clidoc uses this same workflow to document itself. See the [command reference](https://clidoc.dev/docs/cli/reference).

## Shell completion

```sh
clidoc completion bash                    # clidoc itself; script on stdout
clidoc completion zsh -i mycli.json -o mycli.zsh
clidoc completion fish -o ~/.config/fish/completions/clidoc.fish
```

Activate with `source <(clidoc completion bash)`, or for Zsh `source <(clidoc completion zsh)` after `autoload -Uz compinit; compinit`. See the [completion guide](https://clidoc.dev/docs/completion).

## MCP

```sh
clidoc mcp cli.json --output tools.json
clidoc mcp cli.json --serve --executable /absolute/path/to/mycli
```

Exporting never runs the CLI. Serving requires an explicit trusted executable. Library users can import `compileMcpTools`, `createMcpServer`, and `serveMcp` from `@clidoc/cli/mcp`. See the [MCP guide](https://clidoc.dev/docs/mcp).

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
