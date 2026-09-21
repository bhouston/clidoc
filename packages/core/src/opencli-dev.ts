import { Ajv2020 } from 'ajv/dist/2020.js';
import * as formatsModule from 'ajv-formats';
import { openCliDevSchema } from './opencli-dev-schema.js';
import type {
  OpenCliDevDocument,
  OpenCliDevCommand,
  OpenCliDevReference,
  OpenCliDevFlag,
  OpenCliDevArgument,
  OpenCliDevExample,
  OpenCliDevValue,
} from './opencli-dev-types.js';
export { openCliDevSchema } from './opencli-dev-schema.js';
export type * from './opencli-dev-types.js';
export const OPENCLI_DEV_VERSION = '0.1.0' as const;
const ajv = new Ajv2020({ allErrors: true, strict: false });
(formatsModule.default as unknown as (instance: Ajv2020) => void)(ajv);
const check = ajv.compile(openCliDevSchema);
export type ResolvedDevCommand = Omit<OpenCliDevCommand, 'commands' | 'flags' | 'arguments' | 'examples'> & {
  commands: ResolvedDevCommand[];
  flags: OpenCliDevFlag[];
  arguments: OpenCliDevArgument[];
  examples: OpenCliDevExample[];
};
export type ResolvedDevDocument = Omit<OpenCliDevDocument, 'commands' | 'flags'> & {
  commands: ResolvedDevCommand[];
  flags: OpenCliDevFlag[];
};
const token = (value: string) => value.replaceAll('~', '~0').replaceAll('/', '~1');
/** Resolve component references without mutating the authored document. */
export function resolveDevDocument(document: OpenCliDevDocument): ResolvedDevDocument {
  function resolve<T>(
    value: T | OpenCliDevReference,
    kind: 'commands' | 'flags' | 'arguments' | 'examples',
    path: string,
  ): T {
    if (!('$ref' in (value as object))) return value as T;
    const reference = (value as OpenCliDevReference).$ref;
    const prefix = `#/components/${kind}/`;
    const name = reference.slice(prefix.length).replaceAll('~1', '/').replaceAll('~0', '~');
    const entries = document.components?.[kind];
    if (!reference.startsWith(prefix) || !entries || !Object.hasOwn(entries, name))
      throw new Error(`${path}/$ref: unresolved ${kind} reference ${reference}`);
    return entries[name] as T;
  }
  const list = <T>(
    items: (T | OpenCliDevReference)[] = [],
    kind: 'flags' | 'arguments' | 'examples',
    path: string,
  ): T[] => items.map((item, index) => resolve(item, kind, `${path}/${index}`));
  let count = 0;
  function commands(
    items: (OpenCliDevCommand | OpenCliDevReference)[],
    path: string,
    active: Set<OpenCliDevCommand>,
  ): ResolvedDevCommand[] {
    return items.map((item, index) => {
      const location = `${path}/${index}`;
      const command = resolve<OpenCliDevCommand>(item, 'commands', location);
      if (active.has(command)) throw new Error(`${location}: cyclic command reference`);
      if (++count > 10000 || active.size >= 100) throw new Error(`${location}: command expansion limit exceeded`);
      const next = new Set(active).add(command);
      return {
        ...command,
        flags: list(command.flags, 'flags', `${location}/flags`),
        arguments: list(command.arguments, 'arguments', `${location}/arguments`),
        examples: list(command.examples, 'examples', `${location}/examples`),
        commands: commands(command.commands ?? [], `${location}/commands`, next),
      };
    });
  }
  return {
    ...document,
    flags: list(document.flags, 'flags', '/flags'),
    commands: commands(document.commands, '/commands', new Set()),
  };
}

function semanticErrors(document: ResolvedDevDocument): string[] {
  const errors: string[] = [];
  const fail = (path: string, message: string) => {
    errors.push(`${path}: ${message}`);
  };
  function defaults(item: OpenCliDevValue, path: string, count = false) {
    const value = item.default;
    if (value === undefined || value === null) return;
    const type = count ? 'integer' : (item.type ?? 'string');
    const valid =
      type === 'integer'
        ? Number.isInteger(value)
        : type === 'number'
          ? typeof value === 'number' && Number.isFinite(value)
          : typeof value === (['file', 'path'].includes(type) ? 'string' : type);
    if (!valid) fail(path, `default must match ${type}`);
    if (typeof value === 'string' && item.choices?.length && !item.choices.includes(value))
      fail(path, 'default must be one of choices');
  }
  function unique(values: string[], path: string) {
    if (new Set(values).size !== values.length) fail(path, 'duplicate name or alias');
  }
  function flags(items: OpenCliDevFlag[], path: string) {
    unique(
      items.map((item) => item.name),
      path,
    );
    unique(
      items.flatMap((item) => (item.short ? [item.short] : [])),
      path,
    );
    items.forEach((item, index) => {
      const location = `${path}/${index}`;
      if (item.count && item.repeatable) fail(location, 'count and repeatable cannot be combined');
      if (item.splitOnComma && !item.repeatable) fail(location, 'splitOnComma requires repeatable');
      defaults(item, location, item.count);
    });
  }
  flags(document.flags, '/flags');
  const operationIds = new Set<string>();
  function walk(commands: ResolvedDevCommand[], path: string) {
    unique(
      commands.flatMap((command) => [command.name, ...(command.aliases ?? [])]),
      path,
    );
    commands.forEach((command, index) => {
      const location = `${path}/${index}`;
      if (!command.commands.length && !command.operationId) fail(location, 'leaf command requires operationId');
      if (command.operationId) {
        if (operationIds.has(command.operationId)) fail(location, 'duplicate operationId');
        operationIds.add(command.operationId);
      }
      flags(command.flags, `${location}/flags`);
      let optional = false;
      command.arguments.forEach((arg, position) => {
        const argPath = `${location}/arguments/${position}`;
        if (arg.required !== false && optional) fail(argPath, 'required argument follows optional argument');
        if (arg.required === false) optional = true;
        if (arg.variadic && position !== command.arguments.length - 1) fail(argPath, 'variadic argument must be last');
        defaults(arg, argPath);
      });
      const available = new Map([...document.flags, ...command.flags].map((flag) => [flag.name, flag]));
      for (const group of command.flagGroups ?? [])
        for (const name of group.flags)
          if (!available.has(name)) fail(`${location}/flagGroups`, `unknown flag ${name}`);
      if (command.output) {
        const output = command.output;
        const selected = output.formats.filter((format) => format.default);
        if (selected.length > 1) fail(`${location}/output`, 'only one default output format is allowed');
        if (!output.formatFlag) {
          if (output.formats.length > 1) fail(`${location}/output`, 'multiple formats require formatFlag');
        } else {
          const flag = available.get(output.formatFlag);
          if (!flag) fail(`${location}/output/formatFlag`, 'unknown output selector flag');
          else {
            const values = output.formats.map((format) => format.value ?? format.format).toSorted();
            if (JSON.stringify(values) !== JSON.stringify([...(flag.choices ?? [])].toSorted()))
              fail(`${location}/output`, 'selector choices must match output format values');
            if (flag.default == null && selected.length !== 1)
              fail(`${location}/output`, 'output selector needs a default');
            if (
              flag.default != null &&
              selected.length === 1 &&
              String(flag.default) !== (selected[0]!.value ?? selected[0]!.format)
            )
              fail(`${location}/output`, 'selector default conflicts with default format');
          }
        }
      }
      walk(command.commands, `${location}/commands`);
    });
  }
  walk(document.commands, '/commands');
  return errors;
}

function pointer(root: unknown, ref: string): unknown {
  let value = root;
  for (const part of ref.slice(2).split('/')) {
    const key = part.replaceAll('~1', '/').replaceAll('~0', '~');
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

// Inspect only schema-bearing keywords: literal examples/defaults may themselves contain $ref.
function schemaReferenceErrors(document: OpenCliDevDocument): string[] {
  const errors: string[] = [];
  const mapKeywords = new Set(['properties', 'patternProperties', '$defs', 'definitions', 'dependentSchemas']);
  const singleKeywords = new Set([
    'items',
    'additionalProperties',
    'unevaluatedProperties',
    'unevaluatedItems',
    'contains',
    'propertyNames',
    'contentSchema',
    'not',
    'if',
    'then',
    'else',
  ]);
  const arrayKeywords = new Set(['allOf', 'anyOf', 'oneOf', 'prefixItems']);
  function inspect(schema: unknown, path: string, root: unknown) {
    if (typeof schema !== 'object' || schema === null) return;
    const obj = schema as Record<string, unknown>;
    for (const keyword of ['$ref', '$dynamicRef']) {
      if (typeof obj[keyword] === 'string') {
        const ref = obj[keyword] as string;
        // References are kept intact for documentation; no external resources are fetched.
        if (
          ref !== '#' &&
          (!ref.startsWith('#/') || pointer(ref.startsWith('#/components/') ? document : root, ref) === undefined)
        )
          errors.push(`${path}/${keyword}: unsupported or unresolved local schema reference ${ref}`);
      }
    }
    for (const [key, child] of Object.entries(obj)) {
      if (mapKeywords.has(key))
        for (const [name, value] of Object.entries(child as object))
          inspect(value, `${path}/${key}/${token(name)}`, root);
      else if (singleKeywords.has(key)) inspect(child, `${path}/${key}`, root);
      else if (arrayKeywords.has(key))
        (child as unknown[]).forEach((value, index) => inspect(value, `${path}/${key}/${index}`, root));
    }
  }
  for (const [name, schema] of Object.entries(document.components?.schemas ?? {}))
    inspect(schema, `/components/schemas/${token(name)}`, schema);
  function commands(items: (OpenCliDevCommand | OpenCliDevReference)[], path: string) {
    items.forEach((command, index) => {
      if ('$ref' in command) return;
      command.output?.formats.forEach((format, i) =>
        inspect(format.schema, `${path}/${index}/output/formats/${i}/schema`, format.schema),
      );
      commands(command.commands ?? [], `${path}/${index}/commands`);
    });
  }
  commands(document.commands, '/commands');
  for (const [name, command] of Object.entries(document.components?.commands ?? {}))
    commands([command], `/components/commands/${token(name)}`);
  return errors;
}

/** Offline structural and semantic validation for opencli-dev OpenCLI 0.1.0. */
export function validateOpenCliDev(document: unknown): { valid: boolean; errors: string[] } {
  try {
    if (!check(document))
      return { valid: false, errors: check.errors!.map((error) => `${error.instancePath || '/'} ${error.message}`) };
    const source = document as OpenCliDevDocument;
    const errors = [...semanticErrors(resolveDevDocument(source)), ...schemaReferenceErrors(source)];
    return { valid: errors.length === 0, errors };
  } catch (error) {
    return { valid: false, errors: [String(error)] };
  }
}
