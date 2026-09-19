import type { OpenCliDocument, CommandItemObject, AlternativeSource } from './types.js';

/**
 * Logical validations ported from upstream `validate/validate.go`, beyond what the JSON Schema
 * can express: positional argument ordering, variadic/min/max constraints, `$FILE` alternative
 * sources referencing a declared `global.config` file, duplicate flag names/aliases, and group
 * commands carrying args or flags.
 */
export function logicalErrors(document: OpenCliDocument): string[] {
  const errors: string[] = [];
  const definedConfigFiles = new Set<string>();
  if (document.global?.config?.json) definedConfigFiles.add('json');
  if (document.global?.config?.toml) definedConfigFiles.add('toml');
  if (document.global?.config?.yaml) definedConfigFiles.add('yaml');

  for (const [name, command] of Object.entries(document.commands ?? {})) {
    validateCommand(name, command, definedConfigFiles, errors);
  }
  return errors;
}

function validateCommand(
  name: string,
  command: CommandItemObject,
  definedConfigFiles: Set<string>,
  errors: string[],
): void {
  const base = `/commands/${name}`;
  const args = command.args ?? [];
  const flags = command.flags ?? [];

  if (args.length > 0) {
    validateArgumentOrdering(base, args, errors);
    validateArgumentConstraints(base, args, errors);
  }

  if (flags.length > 0) {
    validateFlagFileReferences(base, flags, definedConfigFiles, errors);
    validateFlagConstraints(base, flags, errors);
  }

  if (command.kind === 'group') {
    if (args.length > 0) errors.push(`${base} group command cannot have arguments`);
    if (flags.length > 0) errors.push(`${base} group command cannot have flags`);
  }
}

/** Ensures required positional args don't come after optional ones. */
function validateArgumentOrdering(base: string, args: NonNullable<CommandItemObject['args']>, errors: string[]): void {
  let seenOptional = false;
  for (const [i, arg] of args.entries()) {
    const isRequired = arg.required === true;
    if (seenOptional && isRequired) {
      errors.push(`${base}/args/${i} required positional argument '${arg.name}' cannot come after optional arguments`);
    }
    if (!isRequired) seenOptional = true;
  }
}

/** Checks that minItems/maxItems are only used with variadic args, and min <= max. */
function validateArgumentConstraints(
  base: string,
  args: NonNullable<CommandItemObject['args']>,
  errors: string[],
): void {
  for (const [i, arg] of args.entries()) {
    const path = `${base}/args/${i}`;
    if ((arg.minItems !== undefined || arg.maxItems !== undefined) && !arg.variadic) {
      const field = arg.minItems !== undefined ? 'minItems' : 'maxItems';
      errors.push(`${path} argument '${arg.name}' has ${field} but is not variadic`);
    }
    if (arg.variadic && arg.minItems !== undefined && arg.maxItems !== undefined && arg.minItems > arg.maxItems) {
      errors.push(
        `${path} argument '${arg.name}' has minItems (${arg.minItems}) greater than maxItems (${arg.maxItems})`,
      );
    }
  }
}

/** Checks that `$FILE` alternative sources reference a file declared in global.config. */
function validateFlagFileReferences(
  base: string,
  flags: NonNullable<CommandItemObject['flags']>,
  definedConfigFiles: Set<string>,
  errors: string[],
): void {
  for (const [i, flag] of flags.entries()) {
    validateFileReferences(
      `${base}/flags/${i}`,
      'flag',
      flag.name,
      flag.alternativeSources,
      definedConfigFiles,
      errors,
    );
  }
}

function validateFileReferences(
  path: string,
  itemType: string,
  itemName: string,
  altSources: AlternativeSource[] | undefined,
  definedConfigFiles: Set<string>,
  errors: string[],
): void {
  for (const [j, source] of (altSources ?? []).entries()) {
    if (source.type === '$FILE' && definedConfigFiles.size === 0) {
      errors.push(
        `${path}/alternativeSources/${j} ${itemType} '${itemName}' references $FILE but no config files are defined in global.config`,
      );
    }
  }
}

/** Checks for duplicate flag names/aliases and variadic+required/minItems/maxItems constraints. */
function validateFlagConstraints(base: string, flags: NonNullable<CommandItemObject['flags']>, errors: string[]): void {
  const seen = new Map<string, number>();

  for (const [i, flag] of flags.entries()) {
    const path = `${base}/flags/${i}`;
    const flagName = flag.name;

    if (flagName) {
      const prevIdx = seen.get(flagName);
      if (prevIdx !== undefined) {
        errors.push(`${path} duplicate flag name '${flagName}' (also defined at index ${prevIdx})`);
      }
      seen.set(flagName, i);

      for (const alias of flag.aliases ?? []) {
        if (!alias) continue;
        const prevAliasIdx = seen.get(alias);
        if (prevAliasIdx !== undefined) {
          errors.push(`${path}/aliases duplicate flag alias '${alias}' (already defined at index ${prevAliasIdx})`);
        }
        seen.set(alias, i);
      }
    }

    if (flag.variadic && flag.required) {
      errors.push(
        `${path} variadic flag '${flagName}' cannot be marked as required (variadic flags can be provided 0 or more times)`,
      );
    }

    if ((flag.minItems !== undefined || flag.maxItems !== undefined) && !flag.variadic) {
      const field = flag.minItems !== undefined ? 'minItems' : 'maxItems';
      errors.push(`${path} flag '${flagName}' has ${field} but is not variadic`);
    }

    if (flag.variadic && flag.minItems !== undefined && flag.maxItems !== undefined && flag.minItems > flag.maxItems) {
      errors.push(
        `${path} flag '${flagName}' has minItems (${flag.minItems}) greater than maxItems (${flag.maxItems})`,
      );
    }
  }
}
