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
  if (option.demandOption && (option.array || option.type === 'array')) {
    throw new TypeError(
      `Yargs option '${name}' combines demandOption with an array: OpenCLI cannot require the flag while allowing zero values. Document this option separately or change its CLI behavior.`,
    );
  }
  if ((option.array || option.type === 'array') && Array.isArray(option.default)) {
    throw new TypeError(
      `Yargs option '${name}' has an array default: OpenCLI flag defaults must be a single string, number, or boolean. Document this option's default separately, or apply it in your handler instead of the Yargs builder.`,
    );
  }
  const flag: FlagItemObject = { name, type: mapValueType(option.type) };
  const aliases = typeof option.alias === 'string' ? [option.alias] : option.alias;
  if (aliases?.length) flag.aliases = [...aliases];
  const summary = option.describe ?? option.description;
  if (summary) flag.summary = summary;
  if (option.array || option.type === 'array') {
    flag.variadic = true;
  } else if (option.demandOption) flag.required = true;
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
function requireName(name: unknown, method: string): string {
  if (typeof name !== 'string')
    throw new TypeError(`Unsupported Yargs .${method}() overload; use a string option name.`);
  return name;
}

/** Run `builder` against a recording stand-in for Yargs; `result` is whatever the builder returned. */
function recordBuilder(builder: unknown): { metadata: CollectedBuilder; result: unknown } {
  const options: Record<string, YargsOption> = {};
  const positionals: Record<string, Partial<ArgumentItemObject>> = {};
  const children: YargsCommandModule[] = [];
  if (builder === undefined) return { metadata: { options, positionals, children }, result: undefined };
  if (typeof builder !== 'function')
    return { metadata: { options: builder as Record<string, YargsOption>, positionals, children }, result: undefined };
  let helpOption: string | undefined;
  let versionOption: string | undefined;
  const setOption = (name: string, value: Partial<YargsOption>) => {
    options[name] = { ...options[name], ...value };
    return supportedRecorder;
  };
  const setMany = (names: string | readonly string[], value: Partial<YargsOption>) => {
    if (typeof names !== 'string' && (!Array.isArray(names) || !names.every((name) => typeof name === 'string')))
      throw new TypeError('Unsupported Yargs option names; use a string or string array.');
    for (const name of typeof names === 'string' ? [names] : names) setOption(name, value);
    return supportedRecorder;
  };
  const recorder = {
    option(name: string, value: YargsOption) {
      options[name] = { ...options[name], ...value };
      return supportedRecorder;
    },
    options(values: Record<string, YargsOption>) {
      Object.assign(options, values);
      return supportedRecorder;
    },
    alias(name: string, value: string | readonly string[]) {
      return setOption(requireName(name, 'alias'), { alias: value });
    },
    describe(name: string, value: string) {
      return setOption(requireName(name, 'describe'), { describe: value });
    },
    default(name: string, value: YargsOption['default']) {
      return setOption(requireName(name, 'default'), { default: value });
    },
    choices(name: string, value: NonNullable<YargsOption['choices']>) {
      return setOption(requireName(name, 'choices'), { choices: value });
    },
    demandOption(name: string | readonly string[], value: boolean | string = true) {
      return setMany(name, { demandOption: value !== false });
    },
    boolean(name: string | readonly string[]) {
      return setMany(name, { type: 'boolean' });
    },
    string(name: string | readonly string[]) {
      return setMany(name, { type: 'string' });
    },
    number(name: string | readonly string[]) {
      return setMany(name, { type: 'number' });
    },
    array(name: string | readonly string[]) {
      return setMany(name, { array: true });
    },
    count(name: string | readonly string[]) {
      return setMany(name, { type: 'count' });
    },
    strict() {
      return supportedRecorder;
    },
    strictOptions() {
      return supportedRecorder;
    },
    strictCommands() {
      return supportedRecorder;
    },
    help(name: string | false = 'help', description = 'Show help') {
      if (helpOption) delete options[helpOption];
      helpOption = name === false ? undefined : requireName(name, 'help');
      if (helpOption) setOption(helpOption, { type: 'boolean', describe: description });
      return supportedRecorder;
    },
    version(name?: string | false, description?: string, _version?: string) {
      if (versionOption) delete options[versionOption];
      versionOption = name === false ? undefined : arguments.length > 1 ? requireName(name, 'version') : 'version';
      if (versionOption)
        setOption(versionOption, {
          type: 'boolean',
          describe: arguments.length > 2 ? description : 'Show version number',
        });
      return supportedRecorder;
    },
    demandCommand() {
      return supportedRecorder;
    },
    recommendCommands() {
      return supportedRecorder;
    },
    parserConfiguration() {
      return supportedRecorder;
    },
    exitProcess() {
      return supportedRecorder;
    },
    showHelpOnFail() {
      return supportedRecorder;
    },
    group(_keys: unknown, _groupName: string) {
      return supportedRecorder;
    },
    middleware(_callback: unknown) {
      return supportedRecorder;
    },
    check(_callback: unknown) {
      return supportedRecorder;
    },
    positional(name: string, value: YargsOption) {
      const arg: Partial<ArgumentItemObject> = {};
      if (value.type) arg.type = mapValueType(value.type);
      if (value.describe ?? value.description) arg.summary = value.describe ?? value.description;
      if (value.demandOption) arg.required = true;
      if (value.choices?.length) arg.choices = value.choices.map((choice) => ({ value: choice }));
      positionals[name] = arg;
      return supportedRecorder;
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
      return supportedRecorder;
    },
  };
  const supportedRecorder = new Proxy(recorder, {
    get(target, property, receiver) {
      if (property === 'then') return undefined;
      if (typeof property === 'string' && !(property in target)) {
        throw new TypeError(
          `Unsupported Yargs builder method .${property}(). Add metadata with .option() or extend fromYargs.`,
        );
      }
      return Reflect.get(target, property, receiver);
    },
  });
  return { metadata: { options, positionals, children }, result: builder(supportedRecorder) };
}

function collectBuilder(builder: unknown): CollectedBuilder {
  const { metadata, result } = recordBuilder(builder);
  if (result && typeof (result as { then?: unknown }).then === 'function')
    throw new TypeError('Asynchronous Yargs builders are not supported by fromYargs; use fromYargsAsync');
  return metadata;
}

/** Like collectBuilder, but waits for an async builder, so commands it registers after an `await` are included. */
async function collectBuilderAsync(builder: unknown): Promise<CollectedBuilder> {
  const { metadata, result } = recordBuilder(builder);
  await result;
  return metadata;
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

function primaryPattern(module: YargsCommandModule): string {
  const patterns = typeof module.command === 'string' ? [module.command] : (module.command ?? []);
  const primary = patterns[0];
  if (!primary) throw new TypeError('Yargs command module needs a command');
  return primary;
}

/** The document key and item for one module, given its collected builder metadata. */
function commandEntry(
  module: YargsCommandModule,
  primary: string,
  prefix: string,
  metadata: CollectedBuilder,
): { key: string; item: CommandItemObject } {
  const name = deriveCommandName(primary);
  const item = buildCommandItem(module, primary, metadata);
  if (metadata.children.length && !item.args && !item.flags) item.kind = 'group';
  return { key: name ? `${prefix} ${name}` : prefix, item };
}

/** Recursively convert a module and, via nested builder `.command()` calls, its subcommands. */
function addCommandModule(
  module: YargsCommandModule,
  prefix: string,
  commands: Record<string, CommandItemObject>,
): void {
  const primary = primaryPattern(module);
  const metadata = collectBuilder(module.builder);
  const { key, item } = commandEntry(module, primary, prefix, metadata);
  for (const child of metadata.children) addCommandModule(child, key, commands);
  commands[key] = item;
}

async function addCommandModuleAsync(
  module: YargsCommandModule,
  prefix: string,
  commands: Record<string, CommandItemObject>,
): Promise<void> {
  const primary = primaryPattern(module);
  const metadata = await collectBuilderAsync(module.builder);
  const { key, item } = commandEntry(module, primary, prefix, metadata);
  // Sequential, so key order matches fromYargs
  for (const child of metadata.children) await addCommandModuleAsync(child, key, commands);
  commands[key] = item;
}

interface YargsCommandHandler {
  original: string;
  description?: string | false;
  builder?: unknown;
}
interface YargsCommandRegistry {
  getCommandHandlers?: unknown;
  aliasMap?: Record<string, string>;
}
interface YargsInternalMethods {
  getCommandInstance?: unknown;
}

function unsupportedYargsInstance(reason: string): never {
  throw new TypeError(
    `fromYargs() could not read this Yargs instance's registered commands: ${reason}. Pass an explicit array of command modules instead.`,
  );
}

/** Reads the commands already registered on a configured Yargs instance, via the same registry Yargs itself uses to run them. */
function modulesFromYargsInstance(yargsInstance: object): YargsCommandModule[] {
  const getInternalMethods = (yargsInstance as { getInternalMethods?: unknown }).getInternalMethods;
  if (typeof getInternalMethods !== 'function') return unsupportedYargsInstance('getInternalMethods() is missing');
  const internal = getInternalMethods.call(yargsInstance) as YargsInternalMethods;
  if (typeof internal?.getCommandInstance !== 'function')
    return unsupportedYargsInstance('getInternalMethods().getCommandInstance is missing');
  const registry = internal.getCommandInstance.call(internal) as YargsCommandRegistry;
  if (typeof registry?.getCommandHandlers !== 'function')
    return unsupportedYargsInstance('getCommandInstance().getCommandHandlers is missing');
  const handlers = registry.getCommandHandlers.call(registry) as Record<string, YargsCommandHandler>;
  if (!handlers || typeof handlers !== 'object')
    return unsupportedYargsInstance('getCommandHandlers() did not return command data');

  const aliasesByCommand: Record<string, string[]> = {};
  for (const [alias, command] of Object.entries(registry.aliasMap ?? {}))
    (aliasesByCommand[command] ??= []).push(alias);

  return Object.entries(handlers).map(([name, handler]) => ({
    command: handler.original,
    describe: handler.description,
    aliases: aliasesByCommand[name],
    builder: handler.builder,
  }));
}

/**
 * Convert Yargs command metadata. Supports option maps and common synchronous Yargs builder
 * chains; unsupported methods report an error. Pass the configured `yargs(...)` instance itself
 * (after registering commands, before `.parse()`) to auto-discover its top-level commands, or an
 * explicit array of command modules to list them yourself.
 */
export function fromYargs(source: readonly YargsCommandModule[], info: InfoObject): OpenCliDocument;
export function fromYargs(yargsInstance: object, info: InfoObject): OpenCliDocument;
export function fromYargs(source: readonly YargsCommandModule[] | object, info: InfoObject): OpenCliDocument {
  const modules = Array.isArray(source) ? source : modulesFromYargsInstance(source);
  const commands: Record<string, CommandItemObject> = {};
  for (const module of modules) addCommandModule(module, info.binary, commands);
  return { opencliVersion: OPENCLI_VERSION, info, commands };
}

/**
 * Like {@link fromYargs}, but awaits asynchronous builders, so options and subcommands they
 * register after an `await` (e.g. lazily imported command modules) are included.
 */
export function fromYargsAsync(source: readonly YargsCommandModule[], info: InfoObject): Promise<OpenCliDocument>;
export function fromYargsAsync(yargsInstance: object, info: InfoObject): Promise<OpenCliDocument>;
export async function fromYargsAsync(
  source: readonly YargsCommandModule[] | object,
  info: InfoObject,
): Promise<OpenCliDocument> {
  const modules = Array.isArray(source) ? source : modulesFromYargsInstance(source);
  const commands: Record<string, CommandItemObject> = {};
  for (const module of modules) await addCommandModuleAsync(module, info.binary, commands);
  return { opencliVersion: OPENCLI_VERSION, info, commands };
}

export interface CreateDocgenCommandOptions {
  /** Command string; defaults to `docgen`. */
  command?: string;
}

interface DocgenOption {
  type: 'string';
  alias?: string;
  choices?: readonly string[];
  default?: string;
  description?: string;
}

/**
 * Build a ready-to-register `docgen` command module: `--output <file>` (defaults to stdout) and
 * `--format <json|yaml|markdown>` (default `json`), writing `getDocument()`'s (awaited) result via
 * `@clidoc/core`'s `writeOpenCliDocument`. Add it to your commands array/`.command(...)` calls.
 */
export function createDocgenCommand(
  getDocument: () => OpenCliDocument | Promise<OpenCliDocument>,
  options: CreateDocgenCommandOptions = {},
): {
  command: string;
  describe: string;
  builder: Record<string, DocgenOption>;
  handler: (argv: unknown) => Promise<void>;
} {
  return {
    command: options.command ?? 'docgen',
    describe: 'Write the OpenCLI document to a file, or stdout if --output is omitted',
    builder: {
      output: { type: 'string', alias: 'o', description: 'Output file; defaults to stdout' },
      format: { type: 'string', choices: ['json', 'yaml', 'markdown'], default: 'json', description: 'Output format' },
    },
    async handler(argv: unknown) {
      const { output, format } = argv as { output?: string; format: DocumentFormat };
      await writeOpenCliDocument(await getDocument(), output, format);
    },
  };
}
