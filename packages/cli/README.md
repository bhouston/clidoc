# @clidoc/cli

[![npm version](https://img.shields.io/npm/v/%40clidoc%2Fcli)](https://www.npmjs.com/package/@clidoc/cli)
[![npm downloads](https://img.shields.io/npm/dw/%40clidoc%2Fcli)](https://www.npmjs.com/package/@clidoc/cli)
[![CI](https://github.com/bhouston/clidoc/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/bhouston/clidoc/graph/badge.svg)](https://codecov.io/gh/bhouston/clidoc)
[![Documentation](https://img.shields.io/badge/docs-clidoc.ben3d.ca-blue)](https://clidoc.ben3d.ca)

Generate OpenCLI JSON from framework metadata, validate JSON/YAML documents, and
render Markdown. Node 22.12+; ESM only.

```sh
clidoc generate ./definition.mjs --adapter yargs --output cli.json
clidoc validate cli.json
clidoc markdown cli.json --output reference.md
```

Omit `--output` to print the result. Invalid input or command usage exits with
status 1. `--help` describes command arguments.

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

## License

MIT. See [LICENSE](../../LICENSE).

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
