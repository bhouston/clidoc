import { createHash } from 'node:crypto';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { validate, type OpenCliDocument, type ArgumentItemObject, type FlagItemObject } from '@clidoc/core';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/** A tool definition and its validated, shell-free argument encoder. */
export type CompiledMcpTool = { tool: Tool; argv: (input: unknown) => string[] };
type Parameter = ArgumentItemObject | FlagItemObject;
const required = (item: Parameter) => item.required === true || (item.minItems ?? 0) > 0;
const ownValue = (values: Record<string, unknown> | undefined, key: string) =>
  values && Object.hasOwn(values, key) ? values[key] : undefined;
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

function objectSchema(items: Parameter[]): Record<string, unknown> {
  const properties = Object.fromEntries(
    items.map((item) => {
      if (item.name === '__proto__') throw new Error('Unsupported parameter name __proto__');
      const scalar: Record<string, unknown> = { type: item.type ?? 'string' };
      if (item.choices?.length) scalar.enum = item.choices.map((choice) => choice.value);
      const schema: Record<string, unknown> = item.variadic
        ? {
            type: 'array',
            items: scalar,
            minItems: item.minItems ?? (required(item) ? 1 : 0),
            ...(item.maxItems === undefined ? {} : { maxItems: item.maxItems }),
          }
        : scalar;
      if (item.description ?? item.summary) schema.description = item.description ?? item.summary;
      // Defaults are descriptive only: the executable remains responsible for applying them.
      if ('default' in item && item.default !== undefined && !item.variadic) schema.default = item.default;
      return [item.name, schema];
    }),
  );
  return {
    type: 'object',
    properties,
    required: items.filter(required).map((item) => item.name),
    additionalProperties: false,
  };
}

/** Compile the supported OpenCLI dialect to MCP tools without executing or modifying the spec. */
export function compileMcpTools(source: OpenCliDocument): CompiledMcpTool[] {
  const result = validate(source);
  if (!result.valid) throw new Error(`Invalid OpenCLI document: ${result.errors.join('; ')}`);
  const document = structuredClone(source);
  const ajv = new Ajv2020({ allErrors: true, strict: false, ownProperties: true });
  const binary = document.info.binary;
  const names = new Set<string>();
  return Object.entries(document.commands ?? {})
    .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .filter(([, command]) => !command.hidden && command.kind !== 'group')
    .map(([path, command]) => {
      if (path !== binary && !path.startsWith(`${binary} `))
        throw new Error(`${path}: command must start with binary ${binary}`);
      const suffix = path.slice(binary.length).trim();
      const words = suffix ? suffix.split(' ') : [];
      if (words.some((word) => !identifier.test(word))) throw new Error(`${path}: unsupported command path`);
      const args = command.args ?? [];
      const flagsByName = new Map<string, FlagItemObject>();
      for (const flag of document.global?.flags ?? []) {
        if (flagsByName.has(flag.name)) throw new Error(`${path}: duplicate global flag ${flag.name}`);
        flagsByName.set(flag.name, flag);
      }
      for (const flag of command.flags ?? []) flagsByName.set(flag.name, flag);
      const allFlags = [...flagsByName.values()];
      for (const flag of allFlags) {
        if (!identifier.test(flag.name)) throw new Error(`${path}: unsupported flag name ${flag.name}`);
        if (flag.hidden && required(flag))
          throw new Error(`${path}: hidden required flag ${flag.name} cannot be exposed`);
        if (flag.variadic && flag.type === 'boolean')
          throw new Error(`${path}: variadic boolean flag ${flag.name} is unsupported`);
      }
      const flags = allFlags.filter((flag) => !flag.hidden);
      const argNames = new Set<string>();
      args.forEach((arg, index) => {
        if (argNames.has(arg.name)) throw new Error(`${path}: duplicate argument ${arg.name}`);
        argNames.add(arg.name);
        if (arg.passthrough) throw new Error(`${path}: passthrough argument ${arg.name} is unsupported`);
        if (arg.variadic && index !== args.length - 1) throw new Error(`${path}: variadic argument must be last`);
      });
      const inputSchema: Tool['inputSchema'] = {
        type: 'object',
        properties: { arguments: objectSchema(args), flags: objectSchema(flags) },
        required: [...(args.some(required) ? ['arguments'] : []), ...(flags.some(required) ? ['flags'] : [])],
        additionalProperties: false,
      };
      const check = ajv.compile(inputSchema);
      const readable = path.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 43);
      const name = `${readable}_${createHash('sha256').update(path).digest('hex').slice(0, 20)}`;
      if (names.has(name)) throw new Error(`${path}: MCP tool name collision`);
      names.add(name);
      return {
        tool: { name, title: path, description: command.description ?? command.summary ?? path, inputSchema },
        argv(input: unknown): string[] {
          if (!check(input)) throw new Error(`Invalid tool arguments: ${ajv.errorsText(check.errors)}`);
          const values = input as { arguments?: Record<string, unknown>; flags?: Record<string, unknown> };
          const argv = [...words];
          for (const flag of flags) {
            const value = ownValue(values.flags, flag.name);
            if (value === undefined) continue;
            for (const entry of Array.isArray(value) ? value : [value]) {
              // Explicit false must override a CLI default of true.
              argv.push(
                flag.type === 'boolean' && entry === true ? `--${flag.name}` : `--${flag.name}=${String(entry)}`,
              );
            }
          }
          const positional: string[] = [];
          let gap = false;
          for (const arg of args) {
            const value = ownValue(values.arguments, arg.name);
            if (value === undefined) {
              gap = true;
              continue;
            }
            if (gap) throw new Error(`Cannot supply ${arg.name} after an omitted positional argument`);
            positional.push(...(Array.isArray(value) ? value : [value]).map(String));
          }
          if (positional.length) argv.push('--', ...positional);
          if (argv.some((value) => value.includes('\0'))) throw new Error('CLI arguments cannot contain NUL bytes');
          return argv;
        },
      };
    });
}
