import {
  DEFAULT_OPENCLI_DIALECT,
  detectDialect,
  validateDocument,
  type OpenCliDialect,
  type SupportedOpenCliDocument,
} from './index.js';
import { resolveDevDocument, type ResolvedDevCommand } from './opencli-dev.js';
import type {
  OpenCliDevArgument,
  OpenCliDevCommand,
  OpenCliDevDocument,
  OpenCliDevExitCode,
  OpenCliDevFlag,
} from './opencli-dev-types.js';
import type {
  ArgumentItemObject,
  CommandExampleObject,
  CommandItemObject,
  ExitCodeObject,
  FlagItemObject,
  OpenCliDocument,
} from './types.js';

export type ConversionDiagnostic = { path: string; message: string };
export type ConvertOptions = {
  to?: OpenCliDialect;
  allowLossy?: boolean;
  info?: { title?: string; binary?: string; version?: string };
};
export type ConversionResult = { document: SupportedOpenCliDocument; diagnostics: ConversionDiagnostic[] };

export class ConversionError extends Error {
  diagnostics: ConversionDiagnostic[];
  constructor(message: string, diagnostics: ConversionDiagnostic[]) {
    super(`${message}: ${diagnostics.map(({ path, message: detail }) => `${path}: ${detail}`).join('; ')}`);
    this.name = 'ConversionError';
    this.diagnostics = diagnostics;
  }
}

const copy = <T>(value: T): T => structuredClone(value);
const diagnostic = (path: string, message: string): ConversionDiagnostic => ({ path, message });
const fail = (path: string, message: string): never => {
  const diagnostics = [diagnostic(path, message)];
  throw new ConversionError(`OpenCLI conversion failed: ${message}`, diagnostics);
};
const addExtensions = (value: unknown, path: string, diagnostics: ConversionDiagnostic[]) => {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value))
    if (key.startsWith('x-'))
      diagnostics.push(diagnostic(`${path}/${key}`, 'vendor extension is not supported by the target dialect'));
};
const finish = <T extends SupportedOpenCliDocument>(
  document: T,
  diagnostics: ConversionDiagnostic[],
  allowLossy?: boolean,
) => {
  if (diagnostics.length && !allowLossy)
    throw new ConversionError('OpenCLI conversion would lose information', copy(diagnostics));
  const result = validateDocument(document);
  if (!result.valid)
    throw new ConversionError(
      'Converted OpenCLI document is invalid',
      result.errors.map((message) => diagnostic('/', message)),
    );
  return { document, diagnostics };
};

const devName = /^[a-z][a-z0-9-]*$/;
const plainBinary = /^\S+$/;
const devArgumentName = /^[A-Z][A-Z0-9_-]*$/;
const statuses = new Set<ExitCodeObject['status']>([
  'BAD_USER_INPUT_ERROR',
  'UNAUTHENTICATED_ERROR',
  'UNAUTHORIZED_ERROR',
  'CANCELED_ERROR',
  'INTERNAL_CLI_ERROR',
  'NOT_IMPLEMENTED_ERROR',
  'OK',
]);

function bcdxnExit(
  item: OpenCliDevExitCode,
  path: string,
  diagnostics: ConversionDiagnostic[],
): ExitCodeObject | undefined {
  if (!item.label || !statuses.has(item.label as ExitCodeObject['status']) || !item.description) {
    diagnostics.push(
      diagnostic(path, 'exit code requires a recognized bcdxn status label and description; record was dropped'),
    );
    return undefined;
  }
  return { code: item.code, status: item.label as ExitCodeObject['status'], summary: item.description };
}

function devExit(item: ExitCodeObject, path: string, diagnostics: ConversionDiagnostic[]): OpenCliDevExitCode {
  addExtensions(item, path, diagnostics);
  if (item.description && item.description !== item.summary)
    diagnostics.push(diagnostic(`${path}/description`, 'summary and description roles are combined in opencli-dev'));
  return {
    code: item.code,
    label: item.status,
    description: item.description ? `${item.summary}\n\n${item.description}` : item.summary,
  };
}

function bcdxnFlag(item: OpenCliDevFlag, path: string, diagnostics: ConversionDiagnostic[]): FlagItemObject {
  const type = item.count
    ? 'integer'
    : item.type === 'file' || item.type === 'path'
      ? 'string'
      : (item.type ?? 'string');
  if (item.type === 'file' || item.type === 'path')
    diagnostics.push(diagnostic(`${path}/type`, `${item.type} type is reduced to string`));
  for (const key of [
    'format',
    'sensitive',
    'deprecated',
    'deprecationMessage',
    'splitOnComma',
    'trackChanged',
  ] as const)
    if (item[key] !== undefined && item[key] !== false)
      diagnostics.push(diagnostic(`${path}/${key}`, `${key} is not supported by bcdxn OpenCLI`));
  if (item.count) diagnostics.push(diagnostic(`${path}/count`, 'counter behavior is not supported by bcdxn OpenCLI'));
  const result: FlagItemObject = { name: item.name, type };
  if (item.short) result.aliases = [item.short];
  if (item.repeatable) {
    result.variadic = true;
    if (item.required && item.default == null) result.minItems = 1;
  }
  if (item.choices) result.choices = item.choices.map((value) => ({ value }));
  if (item.placeholder) result.hint = item.placeholder;
  if (item.description) result.summary = item.description;
  if (item.longDescription) result.description = item.longDescription;
  if (item.required !== undefined && !item.repeatable) result.required = item.required;
  if (item.default !== undefined && item.default !== null) result.default = item.default;
  if (item.default === null)
    diagnostics.push(diagnostic(`${path}/default`, 'null default is not supported by bcdxn OpenCLI'));
  if (item.envVar) result.alternativeSources = [{ type: '$ENV', property: item.envVar }];
  if (item.hidden !== undefined) result.hidden = item.hidden;
  return result;
}

function bcdxnArgument(
  item: OpenCliDevArgument,
  path: string,
  diagnostics: ConversionDiagnostic[],
): ArgumentItemObject {
  const type = item.type === 'file' || item.type === 'path' ? 'string' : item.type;
  if (item.type === 'file' || item.type === 'path')
    diagnostics.push(diagnostic(`${path}/type`, `${item.type} type is reduced to string`));
  for (const key of ['format', 'placeholder', 'sensitive', 'default'] as const)
    if (item[key] !== undefined)
      diagnostics.push(diagnostic(`${path}/${key}`, `${key} is not supported by bcdxn arguments`));
  const result: ArgumentItemObject = { name: item.name, required: item.required !== false };
  if (type) result.type = type;
  if (item.variadic !== undefined) result.variadic = item.variadic;
  if (item.choices) result.choices = item.choices.map((value) => ({ value }));
  if (item.description) result.summary = item.description;
  return result;
}

function devToBcdxn(source: OpenCliDevDocument, options: ConvertOptions): ConversionResult {
  const diagnostics: ConversionDiagnostic[] = [];
  const resolved = resolveDevDocument(source);
  addExtensions(source, '', diagnostics);
  if (source.$schema) diagnostics.push(diagnostic('/$schema', 'schema identifier is not represented in bcdxn OpenCLI'));
  if (source.components)
    diagnostics.push(diagnostic('/components', 'reusable component structure is expanded in bcdxn OpenCLI'));
  const title = options.info?.title ?? source.info?.title;
  const binary = options.info?.binary ?? source.info?.binaryName ?? source.info?.title;
  const version = options.info?.version ?? source.info?.version;
  if (!title) fail('/info/title', 'bcdxn OpenCLI requires a title; provide options.info.title');
  if (!binary) fail('/info/binary', 'bcdxn OpenCLI requires a binary; provide options.info.binary');
  if (!version) fail('/info/version', 'bcdxn OpenCLI requires a version; provide options.info.version');
  const identity = { title: title as string, binary: binary as string, version: version as string };
  if (!plainBinary.test(identity.binary)) fail('/info/binary', 'binary cannot contain whitespace');
  const info: OpenCliDocument['info'] = identity;
  if (source.info?.description) info.summary = source.info.description;
  if (source.info?.longDescription) info.description = source.info.longDescription;
  if (source.info?.license) info.license = copy(source.info.license);
  if (source.info?.contact && Object.values(source.info.contact).some(Boolean))
    info.contact = Object.fromEntries(
      Object.entries(source.info.contact).filter(([key]) => ['name', 'email', 'url'].includes(key)),
    ) as NonNullable<OpenCliDocument['info']['contact']>;
  for (const key of ['homepage', 'documentationUrl'] as const)
    if (source.info?.[key]) diagnostics.push(diagnostic(`/info/${key}`, `${key} is not supported by bcdxn OpenCLI`));
  const commands: Record<string, CommandItemObject> = {};
  const mapCommand = (command: ResolvedDevCommand, names: string[], path: string, ancestorHidden = false) => {
    if (command.commands.length && (command.flags.length || command.arguments.length))
      fail(path, 'parent command flags or arguments have segment scope that bcdxn OpenCLI cannot preserve');
    const name = [...names, command.name].join(' ');
    const result: CommandItemObject = { kind: command.commands.length && !command.operationId ? 'group' : 'action' };
    if (command.description) result.summary = command.description;
    if (command.longDescription) result.description = command.longDescription;
    if (command.aliases) result.aliases = copy(command.aliases);
    if (ancestorHidden || command.hidden !== undefined) result.hidden = ancestorHidden || command.hidden;
    if (command.arguments.length)
      result.args = command.arguments.map((item, index) =>
        bcdxnArgument(item, `${path}/arguments/${index}`, diagnostics),
      );
    if (command.flags.length)
      result.flags = command.flags.map((item, index) => bcdxnFlag(item, `${path}/flags/${index}`, diagnostics));
    if (command.examples.length)
      result.examples = command.examples.map((item, index) => {
        if (item.output !== undefined)
          diagnostics.push(
            diagnostic(`${path}/examples/${index}/output`, 'example output is not supported by bcdxn OpenCLI'),
          );
        return { content: item.command, ...(item.description ? { title: item.description } : {}) };
      });
    if (command.exitCodes?.length)
      result.exitCodes = command.exitCodes
        .map((item, index) => bcdxnExit(item, `${path}/exitCodes/${index}`, diagnostics))
        .filter((item): item is ExitCodeObject => item !== undefined);
    if (!result.exitCodes?.length) delete result.exitCodes;
    if (command.operationId)
      diagnostics.push(diagnostic(`${path}/operationId`, 'operationId is not supported by bcdxn OpenCLI'));
    for (const key of [
      'usage',
      'deprecated',
      'deprecationMessage',
      'envVars',
      'tags',
      'flagGroups',
      'stdin',
      'output',
    ] as const)
      if (command[key] !== undefined && command[key] !== false)
        diagnostics.push(diagnostic(`${path}/${key}`, `${key} is not supported by bcdxn OpenCLI`));
    commands[name] = result;
    command.commands.forEach((child, index) =>
      mapCommand(
        child,
        [...names, command.name],
        `${path}/commands/${index}`,
        ancestorHidden || command.hidden === true,
      ),
    );
  };
  resolved.commands.forEach((command, index) => mapCommand(command, [identity.binary], `/commands/${index}`));
  const document: OpenCliDocument = { opencliVersion: '1.0.0-alpha.14', info, commands };
  if (resolved.flags.length)
    document.global = { flags: resolved.flags.map((item, i) => bcdxnFlag(item, `/flags/${i}`, diagnostics)) };
  if (resolved.exitCodes?.length) {
    const exitCodes = resolved.exitCodes
      .map((item, index) => bcdxnExit(item, `/exitCodes/${index}`, diagnostics))
      .filter((item): item is ExitCodeObject => item !== undefined);
    if (exitCodes.length) (document.global ??= {}).exitCodes = exitCodes;
  }
  return finish(document, diagnostics, options.allowLossy);
}

function devFlag(item: FlagItemObject, path: string, diagnostics: ConversionDiagnostic[]): OpenCliDevFlag {
  addExtensions(item, path, diagnostics);
  const result: OpenCliDevFlag = { name: item.name, type: item.type };
  if (item.aliases?.length) {
    if (item.aliases.length === 1 && /^[A-Za-z0-9]$/.test(item.aliases[0]!)) result.short = item.aliases[0];
    else
      diagnostics.push(diagnostic(`${path}/aliases`, 'opencli-dev supports exactly one single-character short alias'));
  }
  if (item.variadic !== undefined) result.repeatable = item.variadic;
  if (item.minItems !== undefined)
    diagnostics.push(diagnostic(`${path}/minItems`, 'minimum repetition bound is not supported by opencli-dev'));
  if (item.maxItems !== undefined)
    diagnostics.push(diagnostic(`${path}/maxItems`, 'maximum repetition bound is not supported by opencli-dev'));
  if (item.choices) {
    result.choices = [];
    item.choices.forEach((choice, index) => {
      addExtensions(choice, `${path}/choices/${index}`, diagnostics);
      if (typeof choice.value === 'string') result.choices!.push(choice.value);
      else
        diagnostics.push(
          diagnostic(`${path}/choices/${index}/value`, 'non-string choice is not supported by opencli-dev'),
        );
      if (choice.description)
        diagnostics.push(
          diagnostic(`${path}/choices/${index}/description`, 'choice descriptions are not supported by opencli-dev'),
        );
    });
    if (!result.choices.length) delete result.choices;
  }
  if (item.hint) result.placeholder = item.hint;
  if (item.summary) result.description = item.summary;
  if (item.description) result.longDescription = item.description;
  if (item.required !== undefined) result.required = item.required;
  if (item.default !== undefined) result.default = item.default;
  if (item.alternativeSources?.length) {
    item.alternativeSources.forEach((source, index) =>
      addExtensions(source, `${path}/alternativeSources/${index}`, diagnostics),
    );
    if (item.alternativeSources.length === 1 && item.alternativeSources[0]!.type === '$ENV')
      result.envVar = item.alternativeSources[0]!.property;
    else
      diagnostics.push(
        diagnostic(`${path}/alternativeSources`, 'only one environment source is supported by opencli-dev'),
      );
  }
  if (item.hidden !== undefined) result.hidden = item.hidden;
  return result;
}

function devArgument(item: ArgumentItemObject, path: string, diagnostics: ConversionDiagnostic[]): OpenCliDevArgument {
  addExtensions(item, path, diagnostics);
  let name = item.name;
  if (!devArgumentName.test(name)) {
    name =
      name
        .replace(/[^A-Za-z0-9_-]+/g, '_')
        .replace(/^[^A-Za-z]+/, 'ARG_')
        .toUpperCase() || 'ARG';
    diagnostics.push(diagnostic(`${path}/name`, `argument label was changed to ${name}`));
  }
  const result: OpenCliDevArgument = { name, required: item.required ?? false };
  if (item.type) result.type = item.type;
  if (item.variadic !== undefined) result.variadic = item.variadic;
  if (item.choices) {
    result.choices = [];
    item.choices.forEach((choice, index) => {
      addExtensions(choice, `${path}/choices/${index}`, diagnostics);
      if (typeof choice.value === 'string') result.choices!.push(choice.value);
      else
        diagnostics.push(
          diagnostic(`${path}/choices/${index}/value`, 'non-string choice is not supported by opencli-dev'),
        );
      if (choice.description)
        diagnostics.push(
          diagnostic(`${path}/choices/${index}/description`, 'choice descriptions are not supported by opencli-dev'),
        );
    });
    if (!result.choices.length) delete result.choices;
  }
  if (item.summary) result.description = item.summary;
  if (item.description) {
    if (item.summary) {
      result.description = `${item.summary}\n\n${item.description}`;
      diagnostics.push(diagnostic(`${path}/description`, 'summary and description roles are combined in opencli-dev'));
    } else result.description = item.description;
  }
  for (const key of ['minItems', 'maxItems', 'passthrough'] as const)
    if (item[key] !== undefined && item[key] !== false)
      diagnostics.push(diagnostic(`${path}/${key}`, `${key} is not supported by opencli-dev arguments`));
  return result;
}

type MutableDevCommand = OpenCliDevCommand & { commands: MutableDevCommand[] };
function bcdxnToDev(source: OpenCliDocument, options: ConvertOptions): ConversionResult {
  const diagnostics: ConversionDiagnostic[] = [];
  addExtensions(source, '', diagnostics);
  const title = options.info?.title ?? source.info.title;
  const binary = options.info?.binary ?? source.info.binary;
  const version = options.info?.version ?? source.info.version;
  if (!title || !binary || !version) fail('/info', 'opencli-dev identity requires title, binary, and version');
  if (!plainBinary.test(binary)) fail('/info/binary', 'binary cannot contain whitespace');
  const info: NonNullable<OpenCliDevDocument['info']> = { title, binaryName: binary, version };
  addExtensions(source.info, '/info', diagnostics);
  if (source.info.summary) info.description = source.info.summary;
  if (source.info.description) info.longDescription = source.info.description;
  if (source.info.license) {
    addExtensions(source.info.license, '/info/license', diagnostics);
    info.license = {
      name: source.info.license.name,
      ...(source.info.license.url ? { url: source.info.license.url } : {}),
    };
    if (source.info.license.spdxId)
      diagnostics.push(diagnostic('/info/license/spdxId', 'SPDX identifier is not supported by opencli-dev'));
  }
  if (source.info.contact) {
    addExtensions(source.info.contact, '/info/contact', diagnostics);
    info.contact = Object.fromEntries(
      Object.entries(source.info.contact).filter(([key]) => ['name', 'email', 'url'].includes(key)),
    );
  }
  if (source.install) diagnostics.push(diagnostic('/install', 'installation methods are not supported by opencli-dev'));
  if (source.global?.config)
    diagnostics.push(diagnostic('/global/config', 'configuration paths are not supported by opencli-dev'));
  addExtensions(source.global, '/global', diagnostics);
  for (const key of Object.keys(source.global ?? {}))
    if (!['flags', 'exitCodes', 'config'].includes(key) && !key.startsWith('x-'))
      diagnostics.push(diagnostic(`/global/${key}`, 'unknown global metadata is not supported by opencli-dev'));
  const roots: MutableDevCommand[] = [];
  const nodes = new Map<string, MutableDevCommand>();
  const authored = new Map<string, { item: CommandItemObject; path: string }>();
  const explicitGroups = new Set<string>();
  for (const [key, item] of Object.entries(source.commands ?? {})) {
    const path = `/commands/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
    const parts = key.split(' ');
    if (parts[0] !== source.info.binary || parts.slice(1).some((part) => !devName.test(part)))
      fail(path, `command key must be a plain source-binary-prefixed path such as "${source.info.binary} command"`);
    if (parts.length === 1) {
      const structural =
        item.kind === 'group' &&
        !item.args?.length &&
        !item.flags?.length &&
        !item.examples?.length &&
        !item.exitCodes?.length;
      if (!structural) fail(path, 'a runnable root command cannot be represented by opencli-dev');
      if (item.summary || item.description || item.aliases?.length || item.hidden)
        diagnostics.push(diagnostic(path, 'root group metadata has no command node in opencli-dev'));
      addExtensions(item, path, diagnostics);
      continue;
    }
    let parent = roots;
    for (let index = 1; index < parts.length; index++) {
      const canonical = parts.slice(0, index + 1).join(' ');
      let node = nodes.get(canonical);
      if (!node) {
        node = { name: parts[index]!, commands: [] };
        nodes.set(canonical, node);
        parent.push(node);
      }
      parent = node.commands;
    }
    if (authored.has(key)) fail(path, 'duplicate command path');
    authored.set(key, { item, path });
    if (item.kind === 'group') explicitGroups.add(key);
  }
  for (const [key, { item, path }] of authored) {
    const node = nodes.get(key)!;
    addExtensions(item, path, diagnostics);
    if (node.commands.length && (item.args?.length || item.flags?.length))
      fail(path, 'parent command flags or arguments have segment scope that cannot be preserved safely');
    if (
      item.hidden &&
      node.commands.some((child) => 'name' in child && !authored.get(`${key} ${child.name}`)?.item.hidden)
    )
      fail(path, 'hidden parent with visible descendants cannot preserve visibility in opencli-dev');
    if (item.summary) node.description = item.summary;
    if (item.description) node.longDescription = item.description;
    if (item.aliases) {
      node.aliases = item.aliases.filter((alias, index) => {
        const supported = devName.test(alias);
        if (!supported)
          diagnostics.push(diagnostic(`${path}/aliases/${index}`, 'alias is not a valid opencli-dev command segment'));
        return supported;
      });
      if (!node.aliases.length) delete node.aliases;
    }
    if (item.hidden !== undefined) node.hidden = item.hidden;
    if (item.args)
      node.arguments = item.args.map((arg, index) => devArgument(arg, `${path}/args/${index}`, diagnostics));
    if (item.flags) node.flags = item.flags.map((flag, index) => devFlag(flag, `${path}/flags/${index}`, diagnostics));
    if (item.examples)
      node.examples = item.examples.map((example: CommandExampleObject, index) => {
        addExtensions(example, `${path}/examples/${index}`, diagnostics);
        return { command: example.content, ...(example.title ? { description: example.title } : {}) };
      });
    if (item.exitCodes)
      node.exitCodes = item.exitCodes.map((exit, index) => devExit(exit, `${path}/exitCodes/${index}`, diagnostics));
    if (item.kind !== 'group') node.operationId = `op_${Buffer.from(key, 'utf8').toString('hex')}`;
  }
  const ensureLeaves = (items: MutableDevCommand[], sourcePath: string[]) =>
    items.forEach((item) => {
      const canonical = [...sourcePath, item.name].join(' ');
      if (!item.commands.length && !item.operationId) {
        if (explicitGroups.has(canonical))
          fail(`/commands/${canonical}`, 'an explicit group cannot be represented as a leaf command');
        item.operationId = `op_${Buffer.from(canonical, 'utf8').toString('hex')}`;
      }
      if (!item.commands.length) delete (item as Partial<MutableDevCommand>).commands;
      else ensureLeaves(item.commands, [...sourcePath, item.name]);
    });
  ensureLeaves(roots, [source.info.binary]);
  const document: OpenCliDevDocument = { opencli: '0.1.0', info, commands: roots };
  if (source.global?.flags)
    document.flags = source.global.flags.map((flag, index) => devFlag(flag, `/global/flags/${index}`, diagnostics));
  if (source.global?.exitCodes)
    document.exitCodes = source.global.exitCodes.map((exit, index) =>
      devExit(exit, `/global/exitCodes/${index}`, diagnostics),
    );
  return finish(document, diagnostics, options.allowLossy);
}

/** Convert between supported OpenCLI dialects. bcdxn is the default target. */
export function convertDocument(input: SupportedOpenCliDocument, options: ConvertOptions = {}): ConversionResult {
  const validity = validateDocument(input);
  if (!validity.valid)
    throw new ConversionError(
      'Input OpenCLI document is invalid',
      validity.errors.map((message) => diagnostic('/', message)),
    );
  const from = detectDialect(input);
  const to = options.to ?? DEFAULT_OPENCLI_DIALECT;
  if (to !== 'bcdxn' && to !== 'opencli-dev') fail('/options/to', `unsupported target dialect ${String(to)}`);
  if (from === to) {
    if (options.info && Object.values(options.info).some((value) => value !== undefined))
      fail('/options/info', 'identity overrides apply only to cross-dialect conversion');
    return { document: copy(input), diagnostics: [] };
  }
  return from === 'bcdxn'
    ? bcdxnToDev(input as OpenCliDocument, options)
    : devToBcdxn(input as OpenCliDevDocument, options);
}
