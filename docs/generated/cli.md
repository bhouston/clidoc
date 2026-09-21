# clidoc

Generate, validate, and publish CLI documentation through OpenCLI.

Binary: `clidoc` · Version: `0.1.0`

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

## clidoc mcp

Export MCP tools or serve a trusted CLI over MCP stdio

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | string | Yes | OpenCLI JSON or YAML filename |

| Flag | Type | Required | Description |
| --- | --- | --- | --- |
| `--output` | string | No | Tool catalog output file; defaults to stdout; Aliases: `o` |
| `--serve` | boolean | No | Serve MCP over stdin/stdout; Default: `false` |
| `--executable` | string | No | Trusted executable to run; required with --serve |
| `--cwd` | string | No | Working directory for CLI invocations |
| `--timeout-ms` | number | No | Invocation timeout in milliseconds (default: 30000) |
| `--max-output-bytes` | number | No | Combined stdout/stderr limit (default: 1048576) |

## clidoc validate

Validate an OpenCLI JSON or YAML document

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | string | Yes | OpenCLI document filename |
