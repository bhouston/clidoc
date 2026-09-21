import { createHash } from 'node:crypto';
import { validate } from './index.js';
import type { CommandItemObject, FlagItemObject, OpenCliDocument } from './types.js';

/** Shells supported by standalone completion scripts. */
export type CompletionShell = 'bash' | 'zsh' | 'fish';
export type CompletionOptions = { shell: CompletionShell; binary?: string };
// Tables use c=child transition, s=subcommands, o=options, f=flag values, a=arguments.
// Numeric command states let aliases share a subtree without duplicating scripts.
type Entry = { mode: string; values: string[] };
type Node = { command: CommandItemObject; children: Map<string, number> };

function compile(document: OpenCliDocument): Map<string, Entry> {
  const binary = document.info.binary;
  const nodes: Node[] = [{ command: {}, children: new Map() }];
  const paths = new Map<string, number>([[binary, 0]]);
  const commands = Object.entries(document.commands ?? {}).toSorted(([a], [b]) => a.localeCompare(b));
  for (const [path, command] of commands) {
    if (path !== binary && !path.startsWith(`${binary} `))
      throw new Error(`Completion command must start with ${binary}: ${path}`);
    let parent = 0;
    let full = binary;
    for (const part of path.slice(binary.length).trim().split(/\s+/).filter(Boolean)) {
      full += ` ${part}`;
      let id = paths.get(full);
      if (id === undefined) {
        id = nodes.length;
        nodes.push({ command: {}, children: new Map() });
        nodes[parent]!.children.set(part, id);
        paths.set(full, id);
      }
      parent = id;
    }
    nodes[parent]!.command = command;
  }
  // Aliases identify a sibling command and share its complete descendant tree.
  for (const node of nodes) {
    for (const id of new Set(node.children.values())) {
      for (const alias of nodes[id]!.command.aliases ?? []) {
        if (!alias || /\s/.test(alias)) throw new Error('Completion command aliases must be single words');
        const existing = node.children.get(alias);
        if (existing !== undefined && existing !== id) throw new Error(`Ambiguous completion alias: ${alias}`);
        node.children.set(alias, id);
      }
    }
  }
  const table = new Map<string, Entry>();
  const put = (key: string, mode: string, values: string[] = []) => table.set(key, { mode, values });
  for (const [id, node] of nodes.entries()) {
    const children = [...node.children].filter(([, child]) => !nodes[child]!.command.hidden);
    put(
      `s:${id}`,
      '',
      children.map(([name]) => name),
    );
    for (const [name, child] of children) put(`c:${id}:${name}`, String(child));
    const flags = new Map<string, FlagItemObject>();
    for (const flag of [...(document.global?.flags ?? []), ...(node.command.flags ?? [])]) {
      flags.set(`--${flag.name}`, flag);
      for (const alias of flag.aliases ?? []) flags.set(`${alias.length === 1 ? '-' : '--'}${alias}`, flag);
    }
    put(
      `o:${id}`,
      '',
      [...flags].filter(([, flag]) => !flag.hidden).map(([name]) => name),
    );
    for (const [name, flag] of flags)
      put(
        `f:${id}:${name}`,
        flag.type === 'boolean' ? 'boolean' : 'value',
        (flag.choices ?? []).map((choice) => String(choice.value)),
      );
    for (const [position, arg] of (node.command.args ?? []).entries())
      put(
        `a:${id}:${position}`,
        arg.variadic ? 'repeat' : 'argument',
        (arg.choices ?? []).map((choice) => String(choice.value)),
      );
  }
  return table;
}

/** Generate a validated, deterministic script with no runtime dependency on clidoc or the target CLI. */
export function generateCompletion(document: OpenCliDocument, options: CompletionOptions): string {
  const result = validate(document);
  if (!result.valid) throw new Error(`Invalid OpenCLI document: ${result.errors.join('; ')}`);
  if (!['bash', 'zsh', 'fish'].includes(options.shell))
    throw new Error(`Unsupported completion shell: ${options.shell}`);
  const binary = options.binary ?? document.info.binary;
  if (!/^[a-zA-Z0-9_][a-zA-Z0-9_.+-]*$/.test(binary))
    throw new Error('Completion binary must be a single executable name (letters, digits, _, ., +, -)');
  const table = compile(document);
  const text = [
    ...Object.keys(document.commands ?? {}),
    ...[...table].flatMap(([key, entry]) => [key, ...entry.values]),
  ];
  // eslint-disable-next-line no-control-regex -- Shell completion data must not contain control characters.
  if (text.some((value) => /[\x00-\x1f\x7f]/.test(value)))
    throw new Error('Completion names and choices cannot contain control characters');
  const name = `_clidoc_${createHash('sha256').update(binary).digest('hex').slice(0, 16)}`;
  const shell = options.shell;
  const fish = shell === 'fish';
  const quote = (value: string) =>
    `'${fish ? value.replace(/\\/g, '\\\\').replace(/'/g, "\\'") : value.replace(/'/g, "'\\''")}'`;
  const cases = [...table]
    .map(([key, { mode, values }]) =>
      fish
        ? `    case ${quote(key.replace(/[\\*?[\]]/g, '\\$&'))}\n      set mode ${quote(mode)}\n      set reply ${values.map(quote).join(' ')}`
        : `    ${quote(key)}) mode=${quote(mode)}; reply=(${values.map(quote).join(' ')});;`,
    )
    .join('\n');
  const header = '# Generated by clidoc. Regenerate after changing the CLI schema.\n';
  return header + (fish ? fishScript(name, binary, cases) : shScript(name, binary, cases, shell));
}

function shScript(name: string, binary: string, cases: string, shell: 'bash' | 'zsh'): string {
  const bash = shell === 'bash';
  return `${name}_lookup() {
  mode=''; reply=()
  case "$1" in
${cases}
  esac
}
${name}() {
  ${bash ? '' : 'emulate -L zsh'}
  local state=0 pos=0 ended=0 pending='' cur word key mode prefix='' candidate i
  local -a reply candidates tokens
  ${
    bash
      ? `COMPREPLY=()
  # Bash splits '=' at COMP_WORDBREAKS; reconstruct tokens up to the cursor.
  for ((i=1; i<=COMP_CWORD; i++)); do
    word="\${COMP_WORDS[i]}"
    if [[ "$word" == '=' && \${#tokens[@]} -gt 0 ]]; then
      tokens[\${#tokens[@]}-1]+='='
    elif [[ \${#tokens[@]} -gt 0 && "\${tokens[\${#tokens[@]}-1]}" == *= ]]; then
      tokens[\${#tokens[@]}-1]+="$word"
    else
      tokens+=("$word")
    fi
  done
  cur="\${tokens[\${#tokens[@]}-1]}"
  unset "tokens[\${#tokens[@]}-1]"`
      : `tokens=("\${(@)words[2,CURRENT-1]}")
  (( CURRENT > 2 )) || tokens=()
  cur="\${words[CURRENT]}"`
  }
  for word in "\${tokens[@]}"; do
    if [[ -n "$pending" ]]; then pending=''; continue; fi
    if [[ "$ended" == 0 && "$word" == '--' ]]; then ended=1; continue; fi
    if [[ "$ended" == 0 && "$word" == -* ]]; then
      ${name}_lookup "f:$state:\${word%%=*}"
      if [[ "$mode" == value && "$word" != *=* ]]; then pending="f:$state:$word"; fi
      continue
    fi
    if [[ "$ended" == 0 && "$pos" == 0 ]]; then
      ${name}_lookup "c:$state:$word"
      if [[ -n "$mode" ]]; then state="$mode"; continue; fi
    fi
    ${name}_lookup "a:$state:$pos"
    [[ "$mode" == repeat ]] || pos=$((pos + 1))
  done
  if [[ -n "$pending" ]]; then
    ${name}_lookup "$pending"
    candidates=("\${reply[@]}")
  elif [[ "$ended" == 0 && "$cur" == --*=* ]]; then
    key="\${cur%%=*}"
    prefix="$key="
    cur="\${cur#*=}"
    ${name}_lookup "f:$state:$key"
    candidates=("\${reply[@]}")
  elif [[ "$ended" == 0 && "$cur" == -* ]]; then
    ${name}_lookup "o:$state"
    candidates=("\${reply[@]}")
  else
    ${name}_lookup "a:$state:$pos"
    candidates=("\${reply[@]}")
    if [[ "$ended" == 0 && "$pos" == 0 ]]; then
      ${name}_lookup "s:$state"
      candidates+=("\${reply[@]}")
    fi
  fi
  ${
    bash
      ? `for candidate in "\${candidates[@]}"; do
    [[ "$candidate" == "$cur"* ]] && COMPREPLY+=("$prefix$candidate")
  done
  if [[ \${#candidates[@]} == 0 && "$cur" != -* ]]; then
    while IFS= read -r candidate; do COMPREPLY+=("$prefix$candidate"); done < <(compgen -f -- "$cur")
  fi
  # Readline replaces only the value when '=' is a word break.
  if [[ -n "$prefix" && "$COMP_WORDBREAKS" == *'='* ]]; then
    for ((i=0; i<\${#COMPREPLY[@]}; i++)); do COMPREPLY[i]="\${COMPREPLY[i]#*=}"; done
  fi`
      : `if (( \${#candidates[@]} )); then
    [[ -z "$prefix" ]] || compset -P '*='
    compadd -- "\${candidates[@]}"
  elif [[ "$cur" != -* ]]; then
    [[ -z "$prefix" ]] || compset -P '*='
    _files
  fi`
  }
  return 0
}
${bash ? `complete -o filenames -F ${name} -- '${binary}'` : `compdef ${name} '${binary}'`}
`;
}

function fishScript(name: string, binary: string, cases: string): string {
  // Fish's no-scope-shadowing allows the helper to update caller-local reply/mode.
  const lookup = (key: string) => `${name}_lookup ${key}`;
  return `function ${name}_lookup --no-scope-shadowing
  set mode ''; set reply
  switch "$argv[1]"
${cases}
  end
end
function ${name}
  set -l tokens (commandline -opc)
  set -e tokens[1]
  set -l cur (commandline -ct)
  set -l state 0
  set -l pos 0
  set -l ended 0
  set -l pending ''
  set -l mode ''
  set -l reply
  set -l candidates
  set -l prefix ''
  for word in $tokens
    if test -n "$pending"
      set pending ''; continue
    end
    if test $ended = 0; and test "$word" = --
      set ended 1; continue
    end
    if test $ended = 0; and string match -q -- '-*' "$word"
      set -l flag (string split -m 1 '=' -- "$word")[1]
      ${lookup('"f:$state:$flag"')}
      if test "$mode" = value; and not string match -q '*=*' -- "$word"
        set pending "f:$state:$word"
      end
      continue
    end
    if test $ended = 0; and test $pos = 0
      ${lookup('"c:$state:$word"')}
      if test -n "$mode"
        set state $mode; continue
      end
    end
    ${lookup('"a:$state:$pos"')}
    if test "$mode" != repeat; set pos (math $pos + 1); end
  end
  if test -n "$pending"
    ${lookup('"$pending"')}
    set candidates $reply
  else if test $ended = 0; and string match -q -- '--*=*' "$cur"
    set -l pair (string split -m 1 '=' -- "$cur")
    set prefix "$pair[1]="
    set cur "$pair[2]"
    ${lookup('"f:$state:$pair[1]"')}
    set candidates $reply
  else if test $ended = 0; and string match -q -- '-*' "$cur"
    ${lookup('"o:$state"')}
    set candidates $reply
  else
    ${lookup('"a:$state:$pos"')}
    set candidates $reply
    if test $ended = 0; and test $pos = 0
      ${lookup('"s:$state"')}
      set -a candidates $reply
    end
  end
  for candidate in $candidates
    printf '%s\\n' "$prefix$candidate"
  end
  if test (count $candidates) = 0; and not string match -q -- '-*' "$cur"
    for candidate in (__fish_complete_path "$cur")
      printf '%s\\n' "$prefix$candidate"
    end
  end
end
complete -c '${binary}' -f -a '(${name})'
`;
}
