# OpenCLI JS/TS

Generate, validate, and publish CLI documentation through OpenCLI.

Binary: `opencli` · Version: `0.1.0`

## opencli generate

Import a trusted framework definition module and generate OpenCLI JSON

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `module` | string | Yes | Trusted JS module exporting default metadata and info |

| Flag | Type | Required | Description |
| --- | --- | --- | --- |
| `--adapter` | string | Yes | Framework adapter; Choices: yargs, commander, oclif |
| `--output` | string | No | Output JSON file; defaults to stdout; Aliases: `o` |

## opencli markdown

Render an OpenCLI document as Markdown

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | string | Yes | OpenCLI JSON or YAML filename |

| Flag | Type | Required | Description |
| --- | --- | --- | --- |
| `--output` | string | No | Output file; defaults to stdout; Aliases: `o` |

## opencli validate

Validate an OpenCLI JSON or YAML document

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | string | Yes | OpenCLI document filename |
