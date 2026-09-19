import { OPENCLI_VERSION } from '@opencli/core';
import type { OpenCliDocument, InfoObject, CommandItemObject, FlagItemObject, ArgumentItemObject } from '@opencli/core';

export interface YargsOption {
  alias?: string | readonly string[];
  type?: 'string' | 'number' | 'boolean';
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
function toFlag(name: string, option: YargsOption): FlagItemObject {
  const flag: FlagItemObject = { name, type: option.type === 'number' ? 'number' : (option.type ?? 'string') };
  const aliases = typeof option.alias === 'string' ? [option.alias] : option.alias;
  if (aliases?.length) flag.aliases = [...aliases];
  const summary = option.describe ?? option.description;
  if (summary) flag.summary = summary;
  if (option.demandOption) flag.required = true;
  if (option.array) flag.variadic = true;
  if (option.choices?.length) flag.choices = option.choices.map((value) => ({ value }));
  if (option.default !== undefined) flag.default = option.default;
  if (option.hidden) flag.hidden = true;
  return flag;
}

function collectBuilder(builder: unknown): {
  options: Record<string, YargsOption>;
  positionals: Record<string, Partial<ArgumentItemObject>>;
} {
  const options: Record<string, YargsOption> = {};
  const positionals: Record<string, Partial<ArgumentItemObject>> = {};
  if (builder === undefined) return { options, positionals };
  if (typeof builder !== 'function') return { options: builder as Record<string, YargsOption>, positionals };
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
      if (value.type) arg.type = value.type === 'number' ? 'number' : value.type;
      if (value.describe ?? value.description) arg.summary = value.describe ?? value.description;
      if (value.demandOption) arg.required = true;
      if (value.choices?.length) arg.choices = value.choices.map((choice) => ({ value: choice }));
      positionals[name] = arg;
      return this;
    },
  };
  const result = builder(recorder);
  if (result && typeof result.then === 'function') throw new TypeError('Asynchronous Yargs builders are not supported');
  return { options, positionals };
}

/** Convert Yargs command-module metadata. Supports option maps and synchronous .option(), .options(), and .positional() builders. */
export function fromYargs(modules: readonly YargsCommandModule[], info: InfoObject): OpenCliDocument {
  const commands: Record<string, CommandItemObject> = {};
  for (const module of modules) {
    const metadata = collectBuilder(module.builder);
    const patterns = typeof module.command === 'string' ? [module.command] : (module.command ?? []);
    const primary = patterns[0];
    if (!primary) throw new TypeError('Yargs command module needs a command');
    const name = primary.split(/\s|\[/, 1)[0]!;
    const key = `${info.binary} ${name}`;
    const item: CommandItemObject = {};
    if (module.describe) item.summary = module.describe;
    if (module.describe === false) item.hidden = true;
    const directAliases = typeof module.aliases === 'string' ? [module.aliases] : (module.aliases ?? []);
    const aliases = [
      ...patterns
        .slice(1)
        .map((pattern) => pattern.split(/\s|\[/, 1)[0]!)
        .filter(Boolean),
      ...directAliases,
    ];
    if (aliases.length) item.aliases = aliases;
    const args = parsePositionals(primary);
    for (const arg of args) Object.assign(arg, metadata.positionals[arg.name]);
    if (args.length) item.args = args;
    if (Object.keys(metadata.options).length)
      item.flags = Object.entries(metadata.options).map(([option, data]) => toFlag(option, data));
    commands[key] = item;
  }
  return { opencliVersion: OPENCLI_VERSION, info, commands };
}
