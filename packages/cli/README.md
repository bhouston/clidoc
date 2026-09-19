# @opencli/cli

Generate OpenCLI JSON from framework metadata, validate JSON/YAML documents, and
render Markdown. Node 22.12+; ESM only.

```sh
opencli generate ./definition.mjs --adapter yargs --output cli.json
opencli validate cli.json
opencli markdown cli.json --output reference.md
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
