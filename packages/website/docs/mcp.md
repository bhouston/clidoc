---
title: MCP bridge
sidebar_position: 7
---

# Use a CLI through MCP

`clidoc mcp` turns an OpenCLI document into Model Context Protocol tools. Export a
catalog for inspection, or serve the tools over stdio for a local MCP client.
The bridge supports the bcdxn OpenCLI `1.0.0-alpha.14` dialect used by clidoc's
framework packages. It does not implement nrranjithnr OpenCLISpec `1.0.0`.

## Export and serve

```sh
mycli docgen --output cli.json
clidoc mcp cli.json --output tools.json
clidoc mcp cli.json --serve --executable /absolute/path/to/mycli
```

Exporting writes `{ "tools": [...] }` without executing the described CLI. Each
tool has a deterministic name, the original command as its title, a description,
and a JSON input schema. Hidden commands/flags and command groups are omitted.
Only `--serve` runs a server, and it requires an explicit executable. The
specification's binary name is never used to select an executable.

A client that uses the common `mcpServers` configuration shape can launch it with:

```json
{
  "mcpServers": {
    "mycli": {
      "command": "/absolute/path/to/clidoc",
      "args": [
        "mcp",
        "/absolute/path/to/cli.json",
        "--serve",
        "--executable",
        "/absolute/path/to/mycli",
        "--cwd",
        "/absolute/path/to/project",
        "--timeout-ms",
        "30000",
        "--max-output-bytes",
        "1048576"
      ]
    }
  }
}
```

In serve mode stdout contains only MCP messages. Startup errors go to stderr.
The spec is loaded once; restart the server after changing it. HTTP hosting and
authentication are outside this initial stdio implementation.

## Runnable example

Save this as `greet.mjs`:

```js
const args = process.argv.slice(2);
if (args[0] === '--') args.shift();
console.log(`Hello, ${args[0] ?? 'world'}!`);
```

Save this as `greet.json`:

```json
{
  "opencliVersion": "1.0.0-alpha.14",
  "info": { "title": "Greeting", "binary": "node", "version": "1.0.0" },
  "commands": {
    "node": {
      "summary": "Run the greeting script",
      "args": [{ "name": "script", "required": true }, { "name": "name" }]
    }
  }
}
```

Run `clidoc mcp greet.json --serve --executable node`, then connect with an MCP
client. Discover the generated tool name through `tools/list` and call it with:

```json
{ "arguments": { "script": "/absolute/path/to/greet.mjs", "name": "Ada" } }
```

This example explicitly exposes Node script execution; use only in a trusted
local session. For a normal application, configure the application executable
and describe only the commands you intend to expose.

## Mapping and execution contract

Tool inputs contain two optional objects: `arguments` for positional values and
`flags` for named options. Each becomes required when it contains required
parameters. Unknown properties and invalid types, choices, or array lengths are
rejected before execution. Positional names and flag names can overlap.

| OpenCLI feature              | MCP / argv behavior                                                        |
| ---------------------------- | -------------------------------------------------------------------------- |
| Command path                 | Binary prefix removed; remaining words passed as literal argv entries      |
| Scalar type and choices      | JSON Schema type and enum; no coercion                                     |
| Positional arguments         | Authored order; `--` precedes positional values                            |
| Variadic positional          | Array, flattened in order; must be the final argument                      |
| String/number/integer flag   | `--name=value`                                                             |
| Boolean flag                 | `--name` for true; `--name=false` for false                                |
| Variadic flag                | Array, emitted as repeated `--name=value` entries                          |
| Global flag                  | Included in every tool; a command-local flag of the same name overrides it |
| Default / alternative source | CLI applies defaults, environment and config; bridge does not fill values  |
| Aliases                      | Canonical commands and flag names only                                     |

The executable must support these conventions, including `--` and explicit
boolean values. The spec does not describe every parser's serialization rules;
for CLIs with different conventions, use a wrapper executable. In particular,
not every parser accepts `--flag=false` or interprets repeated flags as arrays.
Required parameters must be supplied even if the CLI could resolve them from a
default or environment variable.

The compiler rejects passthrough arguments, non-final variadic arguments,
variadic boolean flags, hidden required flags, duplicate positional names,
`__proto__` parameter names, and ambiguous command/flag spellings. Command words
and flag names must use ASCII letters, digits, underscores or hyphens and begin
with a letter or digit. Skipping an earlier positional argument while supplying a
later one is rejected. Unsupported cases fail explicitly rather than silently
changing their behavior.

Each invocation uses a fresh child process with `shell: false`, closed stdin, the
configured working directory (default: the server's directory), and inherited
environment. Shell metacharacters remain literal arguments. This is trusted
local code execution, not a sandbox: commands can modify files or contact the
network. Only serve trusted specs and executables, and use your MCP client's
approval controls. The bridge does not claim tools are read-only or idempotent.

Results contain JSON text with `stdout`, `stderr`, `exitCode`, and `signal`.
Nonzero exits, signals, validation failures, launch failures, timeouts, and output
overflow set MCP `isError`. The defaults are 30 seconds and 1 MiB of combined
stdout/stderr per invocation. Limits must be positive integers. Timeout,
cancellation, disconnect, SIGINT, and SIGTERM stop active direct child processes;
programs that spawn detached descendants need their own lifecycle management.
Output is buffered, not streamed, and is discarded on timeout or overflow.

## Library API

```ts
import { parse } from '@clidoc/core';
import { compileMcpTools, createMcpServer, serveMcp } from '@clidoc/cli/mcp';

const document = parse(specText);
const compiled = compileMcpTools(document);
const tools = compiled.map(({ tool }) => tool);
const argv = compiled[0].argv({ arguments: { script: '/path/to/greet.mjs' } });

// For a transport managed by your application:
const server = createMcpServer(document, { executable: '/path/to/mycli' });
await server.connect(transport);
await server.close();

// Or use stdin/stdout (installs SIGINT/SIGTERM cleanup until closed):
const stdioServer = await serveMcp(document, { executable: '/path/to/mycli' });
await stdioServer.close();
```

MCP dependencies live in `@clidoc/cli`; using `@clidoc/core` for documentation
does not pull in the server runtime. The bridge uses the
[official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
and the MCP [tools protocol](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).
