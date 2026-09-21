# clidoc

Generate, validate, and publish CLI documentation through OpenCLI.

Binary: `clidoc` · Version: `0.1.0`

## Global flags

| Flag | Type | Required | Description |
| --- | --- | --- | --- |
| `--help` | boolean | No | Show help |
| `--version` | boolean | No | Show version number |

## clidoc completion

Generate a standalone shell completion script

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `shell` | string | Yes | Target shell; Choices: bash, zsh, fish |

| Flag | Type | Required | Description |
| --- | --- | --- | --- |
| `--input` | string | No | OpenCLI JSON or YAML file; defaults to clidoc itself; Aliases: `i` |
| `--binary` | string | No | Executable name override for completion registration |
| `--output` | string | No | Output file; defaults to stdout; Aliases: `o` |

## clidoc docgen

Write clidoc’s own OpenCLI document

| Flag | Type | Required | Description |
| --- | --- | --- | --- |
| `--format` | string | No | Output format; Choices: json, yaml, markdown; Default: `json` |
| `--output` | string | No | Output file; defaults to stdout; Aliases: `o` |

## clidoc generate

Import a trusted framework definition module and generate OpenCLI JSON

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `module` | string | Yes | Trusted JS module exporting default metadata and info |

| Flag | Type | Required | Description |
| --- | --- | --- | --- |
| `--adapter` | string | Yes | Framework adapter; Choices: yargs, commander, oclif |
| `--output` | string | No | Output JSON file; defaults to stdout; Aliases: `o` |

## clidoc markdown

Render an OpenCLI document as Markdown

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | string | Yes | OpenCLI JSON or YAML filename |

| Flag | Type | Required | Description |
| --- | --- | --- | --- |
| `--output` | string | No | Output file; defaults to stdout; Aliases: `o` |

## clidoc validate

Validate an OpenCLI JSON or YAML document

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | string | Yes | OpenCLI document filename |
