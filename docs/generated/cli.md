# clidoc

Generate, validate, and publish CLI documentation through OpenCLI.

Binary: `clidoc` · Version: `0.1.0`

## clidoc convert

Convert between supported OpenCLI dialects; defaults to the preferred bcdxn format

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | string | Yes | OpenCLI JSON or YAML filename |

| Flag | Type | Required | Description |
| --- | --- | --- | --- |
| `--to` | string | No | Target specification; bcdxn is the preferred default; Choices: bcdxn, opencli-dev; Default: `bcdxn` |
| `--format` | string | No | Output serialization format; Choices: json, yaml; Default: `json` |
| `--output` | string | No | Output file; defaults to stdout; Aliases: `o` |
| `--allow-lossy` | boolean | No | Allow reported metadata losses; unresolved semantics still fail; Default: `false` |
| `--title` | string | No | Override the target CLI title |
| `--binary` | string | No | Override the target executable name |
| `--cli-version` | string | No | Override the described CLI version (not the specification version) |

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
