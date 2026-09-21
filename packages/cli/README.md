# @clidoc/cli

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fcli)](https://www.npmjs.com/package/@clidoc/cli)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fcli)](https://www.npmjs.com/package/@clidoc/cli)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

Generate OpenCLI JSON from framework metadata, validate JSON/YAML documents, and
render Markdown. Node 22.12+; ESM only.

The CLI being documented should provide its own `docgen` command, the human-facing
entry point. Install clidoc globally to validate and render the resulting file:

```sh
npm install -g @clidoc/cli
mycli docgen --output cli.json
clidoc validate cli.json
clidoc markdown cli.json --output reference.md
```

`mycli __opencli` is the hidden, machine-facing discovery subcommand, matching
upstream OpenCLI's Go adapters, including its `-o`/`--out <file>` flag
(`mycli __opencli --out cli.json`); omitted, it writes to stdout like
`clidoc docgen`/`clidoc generate`/`clidoc markdown` do when their own
`--output` is omitted. clidoc dogfoods this exact workflow on itself:
`clidoc docgen` and `clidoc __opencli` both describe the `clidoc` binary. As a
secondary option, trusted command definitions can be imported with
`clidoc generate ./definition.mjs --adapter yargs --output cli.json`. Invalid
input or command usage exits with status 1. `--help` describes command
arguments, and `--version` prints the installed package version.

The generation module must export `info` (`title`, `binary`, `version`) and a
default value: Yargs command modules, a Commander `Command`, or an oclif manifest.
Only import trusted modules: their top-level code and supported Yargs builder
callbacks execute during generation. Command handlers are never invoked.

Commands are separate files registered through `yargs-file-commands`, matching
the `hdrify` approach. `cliDocument()` derives this tool's OpenCLI document from
those same definitions. `runCli(argv)` supports embedding without exiting the
calling process; it rejects on invalid input.

See the [repository guide](../../README.md) and
[generated command reference](../../docs/generated/cli.md).

## Shell completion

Generate standalone Bash, Zsh, and Fish scripts for clidoc or any validated OpenCLI
JSON/YAML document:

```sh
clidoc completion bash                    # clidoc itself; script on stdout
clidoc completion zsh -i mycli.json -o mycli.zsh
clidoc completion fish -o ~/.config/fish/completions/clidoc.fish
```

For Bash, activate with `source <(clidoc completion bash)`. For Zsh, run
`source <(clidoc completion zsh)` after `autoload -Uz compinit; compinit`.
Use `--binary name` to register an alternative executable name. Generated scripts
need neither Node nor clidoc at completion time. Regenerate them after CLI changes.
See the [completion guide](https://clidoc.ben3d.ca/docs/guides/completion) for
persistent installation, supported syntax, and limitations.

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
