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

### Usage

```sh
clidoc completion <shell> [--help] [--version] [--input <input>] [--binary <binary>] [--output <output>]
```

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

### Usage

```sh
clidoc docgen [--help] [--version] [--format <format>] [--output <output>]
```

| Flag | Type | Required | Description |
| --- | --- | --- | --- |
| `--format` | string | No | Output format; Choices: json, yaml, markdown; Default: `json` |
| `--output` | string | No | Output file; defaults to stdout; Aliases: `o` |

## clidoc generate

Import a trusted framework definition module and generate OpenCLI JSON

### Usage

```sh
clidoc generate <module> [--help] [--version] --adapter <adapter> [--output <output>]
```

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `module` | string | Yes | Trusted JS module exporting default metadata and info |

| Flag | Type | Required | Description |
| --- | --- | --- | --- |
| `--adapter` | string | Yes | Framework adapter; Choices: yargs, commander, oclif |
| `--output` | string | No | Output JSON file; defaults to stdout; Aliases: `o` |

## clidoc markdown

Render an OpenCLI document as Markdown

### Usage

```sh
clidoc markdown <input> [--help] [--version] [--output <output>]
```

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | string | Yes | OpenCLI JSON or YAML filename |

| Flag | Type | Required | Description |
| --- | --- | --- | --- |
| `--output` | string | No | Output file; defaults to stdout; Aliases: `o` |

## clidoc mcp

Export MCP tools or serve a trusted CLI over MCP stdio

### Usage

```sh
clidoc mcp <input> [--help] [--version] [--output <output>] [--serve] [--executable <executable>] [--cwd <cwd>] [--timeout-ms <timeout-ms>] [--max-output-bytes <max-output-bytes>]
```

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

### Usage

```sh
clidoc validate <input> [--help] [--version]
```

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | string | Yes | OpenCLI document filename |
