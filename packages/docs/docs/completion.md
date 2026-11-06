---
title: Shell completion
sidebar_position: 6
---

# Shell completion

Generate completion scripts for Bash, Zsh, or Fish from the same OpenCLI document
that powers your CLI documentation. The scripts are standalone: pressing Tab does
not launch Node, clidoc, or the described CLI, and does not read a schema file.

## Complete clidoc itself

For the current Bash session:

```bash
source <(clidoc completion bash)
```

For Zsh, initialize its completion system first (most Zsh configurations already do):

```zsh
autoload -Uz compinit
compinit
source <(clidoc completion zsh)
```

For the current Fish session:

```fish
clidoc completion fish | source
```

Try `clidoc <Tab>`, `clidoc completion <Tab>`, or `clidoc docgen --format=<Tab>`.

## Complete another CLI

Export its contract and generate a completion script:

```sh
mycli docgen --output mycli.json
clidoc completion bash --input mycli.json --output mycli.bash
```

JSON and YAML are supported. The script registers the executable named by
`info.binary`; use `--binary my-alias` if you invoke it under another name.
For example, `clidoc completion zsh -i mycli.json --binary my-alias -o my-alias.zsh`.
The override changes registration, not the command paths in the input document.

`mycli __opencli --out mycli.json` is an alternative export mechanism for CLIs
implementing OpenCLI discovery. Generation reads the exported file and validates
it; it never runs the target program itself.

## Install persistently

Save a script once and have your shell load it. Regenerate the saved script after
upgrading the CLI or changing its schema.

Bash:

```bash
clidoc completion bash -o ~/.config/clidoc/completion.bash
```

Add `source ~/.config/clidoc/completion.bash` to `~/.bashrc` (or the startup file
your interactive Bash actually reads). Bash 3.2 and newer are supported.

Zsh:

```zsh
clidoc completion zsh -o ~/.config/clidoc/completion.zsh
```

Add `source ~/.config/clidoc/completion.zsh` to `~/.zshrc`, **after** `compinit`.
These scripts use `compdef` directly; they are sourced scripts, not `_clidoc`
autoload files. Zsh 5.9 is tested.

Fish automatically loads files named after commands in its completions directory:

```fish
clidoc completion fish -o ~/.config/fish/completions/clidoc.fish
```

Use `$XDG_CONFIG_HOME/fish/completions/clidoc.fish` instead if your Fish config
lives there. For another CLI, use its executable name, such as `mycli.fish`.
Fish 3.6 and newer are supported. Open a new shell after installing, or source
the saved script to activate it immediately.

`--output` creates parent directories and replaces the specified file. clidoc
never edits your startup files. You can also distribute generated scripts with
your CLI package; users do not need clidoc installed to use them.

## Supported completion behavior

- Nested commands, implicit command groups, and single-word command aliases.
- Global flags at every command level; local flags only on their own command.
- Short and long flag aliases, separate option values, and `--flag=value`.
- String, numeric, and boolean choices; positional and variadic positional choices.
- Hidden commands, their descendants, and hidden flags are omitted from suggestions.
- Option values are consumed before looking for the next subcommand.
- `--` stops flag and subcommand parsing; positional choices still work.
- Shell filename completion is used for values/arguments with no known candidates.

Command keys must start with `info.binary`. Binary names must be simple executable
names, not paths or multiword launchers. Ambiguous sibling aliases, multiword
aliases, and control characters in completion names/choices are rejected.
All supported metadata is emitted as quoted data, not executable shell fragments.

This first version does not interpret combined short flags (`-abc`), attached
short-option values (`-ovalue`), optional option values, framework-specific
multi-value options, or passthrough argument semantics. Repeatable options are
handled as repeated `--flag value` pairs. Command-local flags are not inherited;
declare inherited flags in `global.flags`. Shell descriptions, dynamic choices,
and PowerShell are future work. Choice order follows the schema; the shell may
sort displayed matches.

## Generate scripts in code

```ts
import { generateCompletion, parse } from '@clidoc/core';

const document = parse(schemaText);
const script = generateCompletion(document, {
  shell: 'zsh', // 'bash' | 'zsh' | 'fish'
  binary: 'mycli', // optional; defaults to document.info.binary
});
```

Publish the returned text alongside your CLI, or expose a `completion <shell>`
command using the same in-memory document as your `docgen` command.
