import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { logicalErrors } from './logical.js';
import { OPENCLI_VERSION, parse, validate } from './index.js';
import type { OpenCliDocument } from './types.js';

const base: OpenCliDocument = {
  opencliVersion: OPENCLI_VERSION,
  info: { title: 'Acme', binary: 'acme', version: '1.0' },
};

const fixturePath = (name: string) =>
  fileURLToPath(new URL(`../../../upstream/opencli/examples/${name}`, import.meta.url));
const fixture = (name: string) => readFileSync(fixturePath(name), 'utf8');
const hasUpstreamFiles = existsSync(fixturePath('pleasantries-cli.ocs.yaml'));
const replaceOnce = (input: string, oldStr: string, newStr: string) => {
  const updated = input.replace(oldStr, newStr);
  if (updated === input) throw new Error(`fixture mutation not applied: ${oldStr}`);
  return updated;
};

describe('logicalErrors', () => {
  it('flags a required positional argument after an optional one', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: {
        run: {
          args: [
            { name: 'a', required: false },
            { name: 'b', required: true },
          ],
        },
      },
    };
    expect(logicalErrors(doc)).toEqual([
      "/commands/run/args/1 required positional argument 'b' cannot come after optional arguments",
    ]);
  });

  it('allows required args before optional args', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: {
        run: {
          args: [
            { name: 'a', required: true },
            { name: 'b', required: false },
          ],
        },
      },
    };
    expect(logicalErrors(doc)).toEqual([]);
  });

  it('flags minItems on a non-variadic argument', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: { run: { args: [{ name: 'a', minItems: 1 }] } },
    };
    expect(logicalErrors(doc)).toEqual(["/commands/run/args/0 argument 'a' has minItems but is not variadic"]);
  });

  it('flags maxItems on a non-variadic argument', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: { run: { args: [{ name: 'a', maxItems: 3 }] } },
    };
    expect(logicalErrors(doc)).toEqual(["/commands/run/args/0 argument 'a' has maxItems but is not variadic"]);
  });

  it('allows minItems/maxItems on a variadic argument', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: { run: { args: [{ name: 'a', variadic: true, minItems: 1, maxItems: 3 }] } },
    };
    expect(logicalErrors(doc)).toEqual([]);
  });

  it('flags a variadic argument whose minItems exceeds maxItems', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: { run: { args: [{ name: 'a', variadic: true, minItems: 5, maxItems: 2 }] } },
    };
    expect(logicalErrors(doc)).toEqual([
      "/commands/run/args/0 argument 'a' has minItems (5) greater than maxItems (2)",
    ]);
  });

  it('flags a $FILE alternative source with no global.config files declared', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: {
        run: {
          flags: [{ name: 'x', type: 'string', alternativeSources: [{ type: '$FILE', property: '$.x' }] }],
        },
      },
    };
    expect(logicalErrors(doc)).toEqual([
      "/commands/run/flags/0/alternativeSources/0 flag 'x' references $FILE but no config files are defined in global.config",
    ]);
  });

  it('allows a $FILE alternative source when global.config declares a file', () => {
    const doc: OpenCliDocument = {
      ...base,
      global: { config: { json: '~/.acme/config.json' } },
      commands: {
        run: {
          flags: [{ name: 'x', type: 'string', alternativeSources: [{ type: '$FILE', property: '$.x' }] }],
        },
      },
    };
    expect(logicalErrors(doc)).toEqual([]);
  });

  it('flags duplicate flag names', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: {
        run: {
          flags: [
            { name: 'foo', type: 'string' },
            { name: 'foo', type: 'string' },
          ],
        },
      },
    };
    expect(logicalErrors(doc)).toEqual(["/commands/run/flags/1 duplicate flag name 'foo' (also defined at index 0)"]);
  });

  it('flags duplicate flag aliases, including against another flag name', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: {
        run: {
          flags: [
            { name: 'language', type: 'string' },
            { name: 'lang', type: 'string', aliases: ['language'] },
          ],
        },
      },
    };
    expect(logicalErrors(doc)).toEqual([
      "/commands/run/flags/1/aliases duplicate flag alias 'language' (already defined at index 0)",
    ]);
  });

  it('allows distinct flag names and aliases', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: {
        run: {
          flags: [
            { name: 'a', type: 'string', aliases: ['x'] },
            { name: 'b', type: 'string', aliases: ['y'] },
          ],
        },
      },
    };
    expect(logicalErrors(doc)).toEqual([]);
  });

  it('flags a variadic flag marked required', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: { run: { flags: [{ name: 'x', type: 'string', variadic: true, required: true }] } },
    };
    expect(logicalErrors(doc)).toEqual([
      "/commands/run/flags/0 variadic flag 'x' cannot be marked as required (variadic flags can be provided 0 or more times)",
    ]);
  });

  it('allows a required non-variadic flag', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: { run: { flags: [{ name: 'x', type: 'string', required: true }] } },
    };
    expect(logicalErrors(doc)).toEqual([]);
  });

  it('flags minItems/maxItems on a non-variadic flag', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: { run: { flags: [{ name: 'x', type: 'string', maxItems: 5 }] } },
    };
    expect(logicalErrors(doc)).toEqual(["/commands/run/flags/0 flag 'x' has maxItems but is not variadic"]);
  });

  it('flags a variadic flag whose minItems exceeds maxItems', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: { run: { flags: [{ name: 'x', type: 'string', variadic: true, minItems: 5, maxItems: 2 }] } },
    };
    expect(logicalErrors(doc)).toEqual(["/commands/run/flags/0 flag 'x' has minItems (5) greater than maxItems (2)"]);
  });

  it('flags a group command with arguments', () => {
    const doc: OpenCliDocument = { ...base, commands: { grp: { kind: 'group', args: [{ name: 'a' }] } } };
    expect(logicalErrors(doc)).toEqual(['/commands/grp group command cannot have arguments']);
  });

  it('flags a group command with flags', () => {
    const doc: OpenCliDocument = {
      ...base,
      commands: { grp: { kind: 'group', flags: [{ name: 'x', type: 'string' }] } },
    };
    expect(logicalErrors(doc)).toEqual(['/commands/grp group command cannot have flags']);
  });

  it('allows a group command with neither args nor flags', () => {
    const doc: OpenCliDocument = { ...base, commands: { grp: { kind: 'group' } } };
    expect(logicalErrors(doc)).toEqual([]);
  });

  it('allows an empty document', () => {
    expect(logicalErrors(base)).toEqual([]);
  });
});

describe('validate() with logical checks', () => {
  it('skips logical checks when schema validation already failed', () => {
    const result = validate({ ...base, info: { ...base.info, binary: 42 } });
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('group command'))).toBe(false);
  });

  it('reports logical errors once the schema passes', () => {
    const doc: OpenCliDocument = { ...base, commands: { grp: { kind: 'group', args: [{ name: 'a' }] } } };
    const result = validate(doc);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['/commands/grp group command cannot have arguments']);
  });
});

describe('upstream negative fixtures', () => {
  it.skipIf(!hasUpstreamFiles)('rejects a group command with flags', () => {
    const mutated = replaceOnce(
      fixture('petstore-cli.ocs.yaml'),
      '  petstore {command} <arguments> [flags]:\n    kind: group',
      '  petstore {command} <arguments> [flags]:\n    kind: group\n    flags:\n    - name: verbose\n      type: boolean',
    );
    expect(() => parse(mutated)).toThrow(/group command cannot have flags/);
  });

  it.skipIf(!hasUpstreamFiles)('rejects a required positional argument after an optional one', () => {
    const mutated = replaceOnce(
      fixture('petstore-cli.ocs.yaml'),
      '    - name: path-to-user-body\n      type: string\n      summary: The path to a JSON file containing the user payload\n      required: false\n    flags:',
      '    - name: path-to-user-body\n      type: string\n      summary: The path to a JSON file containing the user payload\n      required: false\n    - name: user-id\n      type: string\n      summary: A required user id\n      required: true\n    flags:',
    );
    expect(() => parse(mutated)).toThrow(/required positional argument 'user-id' cannot come after optional arguments/);
  });

  it.skipIf(!hasUpstreamFiles)('rejects a variadic flag marked required', () => {
    const mutated = replaceOnce(
      fixture('petstore-cli.ocs.yaml'),
      '      variadic: true',
      '      variadic: true\n      required: true',
    );
    expect(() => parse(mutated)).toThrow(/variadic flag 'photo-urls' cannot be marked as required/);
  });

  it.skipIf(!hasUpstreamFiles)('rejects minItems on a non-variadic argument', () => {
    const mutated = replaceOnce(
      fixture('pleasantries-cli.ocs.yaml'),
      '      - name: "name"\n        summary: "A name to include in the greeting"\n        required: true\n        type: "string"',
      '      - name: "name"\n        summary: "A name to include in the greeting"\n        required: true\n        type: "string"\n        minItems: 1',
    );
    expect(() => parse(mutated)).toThrow(/argument 'name' has minItems but is not variadic/);
  });

  it.skipIf(!hasUpstreamFiles)('rejects a duplicate flag alias', () => {
    const mutated = replaceOnce(
      fixture('pleasantries-cli.ocs.yaml'),
      '    examples:',
      '      - name: "lang"\n        aliases:\n          - "language"\n        summary: "Duplicate alias"\n        type: "string"\n    examples:',
    );
    expect(() => parse(mutated)).toThrow(/duplicate flag alias 'language'/);
  });

  it.skipIf(!hasUpstreamFiles)('rejects a $FILE source with no global config declared', () => {
    const mutated = replaceOnce(
      fixture('pleasantries-cli.ocs.yaml'),
      '        default: "english"',
      '        default: "english"\n        alternativeSources:\n          - type: "$FILE"\n            property: "$.greet.language"',
    );
    expect(() => parse(mutated)).toThrow(/references \$FILE but no config files are defined in global\.config/);
  });
});
