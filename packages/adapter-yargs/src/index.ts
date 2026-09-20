import { OPENCLI_VERSION, writeOpenCliDocument } from '@clidoc/core';
import type {
  OpenCliDocument,
  InfoObject,
  CommandItemObject,
  FlagItemObject,
  ArgumentItemObject,
  DocumentFormat,
} from '@clidoc/core';

export interface YargsOption {
  alias?: string | readonly string[];
  /** Yargs also allows 'count' and 'array'; any other value is treated as 'string'. */
  type?: 'string' | 'number' | 'boolean' | 'count' | 'array' | (string & {});
  describe?: string;
  description?: string;
  demandOption?: boolean;
  array?: boolean;
  choices?: readonly (string | number | boolean)[];
  default?: string | number | boolean;
  hidden?: boolean;
}
export interface YargsCommandModule {
  command?: string | readonly string[];
  describe?: string | false;
  aliases?: string | readonly string[];
  builder?: unknown;
}
function parsePositionals(pattern: string): ArgumentItemObject[] {
  return [...pattern.matchAll(/([<[])([^>\]]+)[>\]]/g)].map((match) => {
    const raw = match[2]!;
    const variadic = raw.endsWith('..');
    return {
      name: variadic ? raw.slice(0, -2) : raw,
      required: match[1] === '<',
      ...(variadic ? { variadic: true } : {}),
    };
  });
}
/** Map a Yargs option type to an OpenCLI value type. 'count' becomes 'integer'; anything else unrecognised falls back to 'string'. */
function mapValueType(type: YargsOption['type']): 'string' | 'number' | 'integer' | 'boolean' {
  if (type === 'number') return 'number';
  if (type === 'count') return 'integer';
  if (type === 'boolean') return 'boolean';
  return 'string';
}
function toFlag(name: string, option: YargsOption): FlagItemObject {
  const flag: FlagItemObject = { name, type: mapValueType(option.type) };
  const aliases = typeof option.alias === 'string' ? [option.alias] : option.alias;
  if (aliases?.length) flag.aliases = [...aliases];
  const summary = option.describe ?? option.description;
  if (summary) flag.summary = summary;
  if (option.demandOption) flag.required = true;
  if (option.array || option.type === 'array') flag.variadic = true;
  if (option.choices?.length) flag.choices = option.choices.map((value) => ({ value }));
  if (option.default !== undefined) flag.default = option.default;
  if (option.hidden) flag.hidden = true;
  return flag;
}

/**
 * Derive a command name from a Yargs command pattern by joining all leading tokens that are
 * not positionals (`<...>` / `[...]`). `$0` (Yargs' default-command token) maps to the binary
 * itself, so it contributes no token of its own.
 */
function deriveCommandName(pattern: string): string {
  const tokens: string[] = [];
  for (const token of pattern.split(/\s+/).filter(Boolean)) {
    if (token.startsWith('<') || token.startsWith('[')) break;
    if (token !== '$0') tokens.push(token);
  }
  return tokens.join(' ');
}

interface CollectedBuilder {
  options: Record<string, YargsOption>;
  positionals: Record<string, Partial<ArgumentItemObject>>;
  children: YargsCommandModule[];
}
function collectBuilder(builder: unknown): CollectedBuilder {
  const options: Record<string, YargsOption> = {};
  const positionals: Record<string, Partial<ArgumentItemObject>> = {};
  const children: YargsCommandModule[] = [];
  if (builder === undefined) return { options, positionals, children };
  if (typeof builder !== 'function') return { options: builder as Record<string, YargsOption>, positionals, children };
  const recorder = {
    option(name: string, value: YargsOption) {
      options[name] = value;
      return this;
    },
    options(values: Record<string, YargsOption>) {
      Object.assign(options, values);
      return this;
    },
    positional(name: string, value: YargsOption) {
      const arg: Partial<ArgumentItemObject> = {};
      if (value.type) arg.type = mapValueType(value.type);
      if (value.describe ?? value.description) arg.summary = value.describe ?? value.description;
      if (value.demandOption) arg.required = true;
      if (value.choices?.length) arg.choices = value.choices.map((choice) => ({ value: choice }));
      positionals[name] = arg;
      return this;
    },
    command(
      command: string | readonly string[] | YargsCommandModule,
      describe?: string | false,
      childBuilder?: unknown,
    ) {
      children.push(
        typeof command === 'object' && !Array.isArray(command)
          ? (command as YargsCommandModule)
          : { command, describe, builder: childBuilder },
      );
      return this;
    },
  };
  const result = builder(recorder);
  if (result && typeof result.then === 'function') throw new TypeError('Asynchronous Yargs builders are not supported');
  return { options, positionals, children };
}

/** Build the OpenCLI command item + args/flags for a single module, without its nested commands. */
function buildCommandItem(module: YargsCommandModule, primary: string, metadata: CollectedBuilder): CommandItemObject {
  const patterns = typeof module.command === 'string' ? [module.command] : (module.command ?? []);
  const item: CommandItemObject = {};
  if (module.describe) item.summary = module.describe;
  if (module.describe === false) item.hidden = true;
  const directAliases = typeof module.aliases === 'string' ? [module.aliases] : (module.aliases ?? []);
  const aliases = [...patterns.slice(1).map(deriveCommandName).filter(Boolean), ...directAliases];
  if (aliases.length) item.aliases = aliases;
  const args = parsePositionals(primary);
  for (const arg of args) Object.assign(arg, metadata.positionals[arg.name]);
  if (args.length) item.args = args;
  if (Object.keys(metadata.options).length)
    item.flags = Object.entries(metadata.options).map(([option, data]) => toFlag(option, data));
  return item;
}

/** Recursively convert a module and, via nested builder `.command()` calls, its subcommands. */
function addCommandModule(
  module: YargsCommandModule,
  prefix: string,
  commands: Record<string, CommandItemObject>,
): void {
  const patterns = typeof module.command === 'string' ? [module.command] : (module.command ?? []);
  const primary = patterns[0];
  if (!primary) throw new TypeError('Yargs command module needs a command');
  const metadata = collectBuilder(module.builder);
  const name = deriveCommandName(primary);
  const key = name ? `${prefix} ${name}` : prefix;
  const item = buildCommandItem(module, primary, metadata);
  if (metadata.children.length) {
    if (!item.args && !item.flags) item.kind = 'group';
    for (const child of metadata.children) addCommandModule(child, key, commands);
  }
  commands[key] = item;
}

/** Convert Yargs command-module metadata. Supports option maps and synchronous .option(), .options(), .positional(), and .command() builders. */
export function fromYargs(modules: readonly YargsCommandModule[], info: InfoObject): OpenCliDocument {
  const commands: Record<string, CommandItemObject> = {};
  for (const module of modules) addCommandModule(module, info.binary, commands);
  return { opencliVersion: OPENCLI_VERSION, info, commands };
}

export interface CreateDocgenCommandOptions {
  /** Command string; defaults to `docgen`. */
  command?: string;
}

/**
 * Build a ready-to-register `docgen` command module: `--output <file>` (required) and
 * `--format <json|markdown>` (default `json`), writing `getDocument()`'s result via
 * `@clidoc/core`'s `writeOpenCliDocument`. Add it to your commands array/`.command(...)` calls.
 */
export function createDocgenCommand(
  getDocument: () => OpenCliDocument,
  options: CreateDocgenCommandOptions = {},
): YargsCommandModule & { handler: (argv: unknown) => Promise<void> } {
  return {
    command: options.command ?? 'docgen',
    describe: 'Write the OpenCLI document to a file',
    builder: {
      output: { type: 'string', demandOption: true, description: 'Output file' },
      format: { type: 'string', choices: ['json', 'markdown'], default: 'json', description: 'Output format' },
    },
    async handler(argv: unknown) {
      const { output, format } = argv as { output: string; format: DocumentFormat };
      await writeOpenCliDocument(getDocument(), output, format);
    },
  };
}
