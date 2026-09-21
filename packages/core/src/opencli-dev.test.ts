import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  detectDialect,
  parse,
  parseDocument,
  validateDocument,
  validateOpenCliDev,
  renderMarkdown,
  generatePages,
  type OpenCliDevDocument,
  type OpenCliDevCommand,
} from './index.js';
import { resolveDevDocument } from './opencli-dev.js';

const minimal = (): OpenCliDevDocument => ({ opencli: '0.1.0', commands: [{ name: 'run', operationId: 'run' }] });
const rich = (): OpenCliDevDocument => ({
  opencli: '0.1.0',
  $schema: './schema.json',
  info: {
    title: 'Example',
    binaryName: 'tool',
    version: '2',
    description: 'Short',
    longDescription: 'Long',
    homepage: 'https://example.com',
    documentationUrl: 'https://example.com/docs',
    contact: { name: 'Team', email: 'a@example.com' },
    license: { name: 'MIT', url: 'https://example.com/license' },
  },
  flags: [
    { name: 'verbose', short: 'v', count: true, default: 0 },
    { name: 'format', choices: ['json', 'text'], default: 'json' },
    { name: 'secret', hidden: true },
  ],
  exitCodes: [{ code: 0, label: 'OK', description: 'Success' }, { code: 1 }],
  commands: [
    {
      name: 'config',
      description: 'Configuration',
      flags: [{ name: 'profile' }],
      commands: [
        { $ref: '#/components/commands/run' },
        { name: 'hidden', operationId: 'hidden', hidden: true, commands: [{ name: 'child', operationId: 'child' }] },
      ],
    },
  ],
  components: {
    flags: {
      shared: {
        name: 'tag',
        short: 't',
        type: 'string',
        format: 'hostname',
        description: 'Tag',
        longDescription: 'Tag details',
        default: 'a',
        choices: ['a', 'b'],
        placeholder: 'TAG',
        envVar: 'TAGS',
        repeatable: true,
        splitOnComma: true,
        trackChanged: true,
        sensitive: true,
        deprecated: true,
        deprecationMessage: 'Use labels',
        required: true,
      },
    },
    arguments: { target: { name: 'TARGET', type: 'path', format: 'path', sensitive: true, placeholder: 'FILE' } },
    examples: { sample: { command: 'tool config run file', description: 'An example', output: 'done\n```' } },
    schemas: { Result: { type: 'object', properties: { child: { $ref: '#/components/schemas/Result' } } } },
    commands: {
      run: {
        name: 'run',
        operationId: 'run',
        aliases: ['r'],
        usage: 'tool config run TARGET',
        description: 'Run it',
        longDescription: 'Long run',
        deprecated: true,
        deprecationMessage: 'Use apply',
        tags: ['config'],
        flags: [{ $ref: '#/components/flags/shared' }, { name: 'verbose', type: 'boolean', default: false }],
        arguments: [
          { $ref: '#/components/arguments/target' },
          { name: 'REST', required: false, variadic: true, default: null },
        ],
        examples: [{ $ref: '#/components/examples/sample' }, { command: 'tool config run .' }],
        envVars: [{ name: 'HOME', default: '~', description: 'Home' }, { name: 'OTHER' }],
        exitCodes: [{ code: 1, label: 'Failure' }],
        flagGroups: [
          { type: 'oneRequired', flags: ['tag', 'verbose'], description: 'Choose' },
          { type: 'mutuallyExclusive', flags: ['tag', 'format'] },
        ],
        stdin: { required: true, format: 'json', description: 'Input' },
        output: {
          formatFlag: 'format',
          formats: [
            { format: 'json', default: true, description: 'JSON', schema: { $ref: '#/components/schemas/Result' } },
            { format: 'text', value: 'text', schema: false },
          ],
        },
      },
    },
  },
});

describe('opencli-dev input', () => {
  it('detects dialects while retaining the original document and legacy parser', () => {
    const bcdxn = { opencliVersion: '1.0.0-alpha.14', info: { title: 'Old', binary: 'old', version: '1' } };
    expect(detectDialect(bcdxn)).toBe('bcdxn');
    expect(parseDocument(JSON.stringify(bcdxn))).toEqual(bcdxn);
    expect(parseDocument('opencli: 0.1.0\ncommands:\n  - name: run\n    operationId: run\n')).toEqual(minimal());
    expect(parseDocument(JSON.stringify(rich()))).toEqual(rich());
    expect(() => parse(JSON.stringify(minimal()))).toThrow();
    expect(detectDialect(minimal())).toBe('opencli-dev');
  });
  it.each([
    null,
    [],
    3,
    {},
    { opencli: '2.0.0' },
    { opencliVersion: '2' },
    { opencli: '0.1.0', opencliVersion: '1.0.0-alpha.14' },
    { opencli: '1.0.0', commands: {} },
    { opencli: '1.0.0', commands: [] },
  ])('rejects unsupported or ambiguous input %j', (input) => {
    expect(validateDocument(input).valid).toBe(false);
    expect(() => parseDocument(JSON.stringify(input))).toThrow();
  });
  it('rejects malformed documents and duplicate YAML keys', () => {
    expect(validateOpenCliDev({ opencli: '0.1.0', commands: [] }).valid).toBe(false);
    expect(validateOpenCliDev({ ...minimal(), extra: true }).valid).toBe(false);
    expect(() => parseDocument('opencli: 0.1.0\nopencli: 0.1.0')).toThrow();
    expect(() => renderMarkdown({ ...minimal(), opencli: '2' } as unknown as OpenCliDevDocument)).toThrow();
  });
  for (const file of ['examples/sd/opencli.yaml', 'tools/opencli/opencli.yaml']) {
    const path = resolve(import.meta.dirname, '../../../upstream/opencli-dev', file);
    it.skipIf(!existsSync(path))(`accepts and renders upstream ${file}`, () => {
      const document = parseDocument(readFileSync(path, 'utf8'));
      expect(renderMarkdown(document).length).toBeGreaterThan(1000);
      expect(generatePages(document).length).toBeGreaterThan(2);
    });
  }
  it('resolves all component kinds without mutating source and supports escaped pointers', () => {
    const source = rich();
    const original = structuredClone(source);
    const resolved = resolveDevDocument(source);
    expect(resolved.commands[0]!.commands[0]!.flags[0]!.name).toBe('tag');
    expect(source).toEqual(original);
    const escaped = minimal();
    escaped.flags = [{ $ref: '#/components/flags/a~1b~0c' }];
    escaped.components = { flags: { 'a/b~c': { name: 'flag' } } };
    expect(validateOpenCliDev(escaped).valid).toBe(true);
  });
  it.each(['flags', 'arguments', 'examples', 'commands'] as const)('rejects missing and wrong-kind %s refs', (kind) => {
    const input = minimal();
    Object.assign(input.commands[0]!, { [kind]: [{ $ref: `#/components/${kind}/missing` }] });
    expect(validateOpenCliDev(input).errors.join()).toContain('unresolved');
    input.components = { flags: { x: { name: 'x' } } };
    Object.assign(input.commands[0]!, { [kind]: [{ $ref: '#/components/flags/x' }] });
    if (kind !== 'flags') expect(validateOpenCliDev(input).valid).toBe(false);
  });
  it('rejects cyclic and oversized command expansion', () => {
    const input: OpenCliDevDocument = {
      opencli: '0.1.0',
      commands: [{ $ref: '#/components/commands/loop' }],
      components: { commands: { loop: { name: 'loop', commands: [{ $ref: '#/components/commands/loop' }] } } },
    };
    expect(validateOpenCliDev(input).errors.join()).toContain('cyclic');
    let command: OpenCliDevCommand = { name: 'end', operationId: 'end' };
    for (let i = 0; i < 102; i++) command = { name: 'group', commands: [command] };
    expect(validateOpenCliDev({ opencli: '0.1.0', commands: [command] }).errors.join()).toContain('limit');
    expect(
      validateOpenCliDev({
        opencli: '0.1.0',
        commands: Array.from({ length: 10001 }, () => ({ name: 'run', operationId: 'run' })),
      }).errors.join(),
    ).toContain('limit');
  });
});

describe('semantic rules', () => {
  it.each([
    [{ name: 'x', count: true, repeatable: true }, 'count and repeatable'],
    [{ name: 'x', splitOnComma: true }, 'requires repeatable'],
    [{ name: 'x', default: 1 }, 'default must match'],
    [{ name: 'x', type: 'integer', default: 1.5 }, 'default must match'],
    [{ name: 'x', choices: ['a'], default: 'b' }, 'one of choices'],
  ])('rejects flag inconsistency %j', (flag, message) => {
    expect(validateOpenCliDev({ ...minimal(), flags: [flag] }).errors.join()).toContain(message);
  });
  it.each([
    { name: 'x', type: 'number', default: 1.5 },
    { name: 'x', type: 'integer', default: 2 },
    { name: 'x', type: 'file', default: 'file' },
    { name: 'x', type: 'boolean', default: true },
    { name: 'x', default: null },
    { name: 'x', count: true, default: 2 },
  ])('accepts typed defaults %j', (flag) => {
    expect(validateOpenCliDev({ ...minimal(), flags: [flag] }).valid).toBe(true);
  });
  it('checks collisions, argument order, and identifiers after reference resolution', () => {
    const doc = {
      ...minimal(),
      flags: [
        { name: 'same', short: 's' },
        { name: 'same', short: 's' },
      ],
      commands: [
        {
          name: 'run',
          operationId: 'run',
          aliases: ['run'],
          arguments: [{ name: 'OPT', required: false, variadic: true }, { name: 'REQ' }],
        },
        { name: 'again', operationId: 'run' },
        { name: 'missing' },
      ],
    };
    const errors = validateOpenCliDev(doc).errors.join();
    for (const message of [
      'duplicate name',
      'required argument follows',
      'variadic argument must be last',
      'duplicate operationId',
      'requires operationId',
    ])
      expect(errors).toContain(message);
  });
  it('validates relationships and output selectors with local shadowing', () => {
    const input = rich();
    const command = input.components!.commands!.run!;
    command.flagGroups![0]!.flags.push('missing');
    command.output!.formats[1]!.default = true;
    let errors = validateOpenCliDev(input).errors.join();
    expect(errors).toContain('unknown flag');
    expect(errors).toContain('only one default');
    delete command.output!.formatFlag;
    expect(validateOpenCliDev(input).errors.join()).toContain('multiple formats require');
    command.output!.formatFlag = 'missing';
    expect(validateOpenCliDev(input).errors.join()).toContain('unknown output selector');
    command.output!.formatFlag = 'verbose';
    errors = validateOpenCliDev(input).errors.join();
    expect(errors).toContain('selector choices');
    command.flags = [{ name: 'format', choices: ['json', 'text'] }];
    command.output!.formatFlag = 'format';
    expect(validateOpenCliDev(input).errors.join()).toContain('needs a default');
    command.output!.formats[1]!.default = false;
    command.flags[0] = { name: 'format', choices: ['json', 'text'], default: 'text' };
    expect(validateOpenCliDev(input).errors.join()).toContain('conflicts');
  });
  it('supports a single fixed output format', () => {
    const doc = minimal();
    Object.assign(doc.commands[0]!, { output: { formats: [{ format: 'text' }] } });
    expect(validateOpenCliDev(doc).valid).toBe(true);
  });
  it('validates nested output schemas, local pointers and recursive schemas without fetching', () => {
    const doc = minimal();
    doc.components = {
      schemas: {
        Data: {
          $defs: { text: { type: 'string' } },
          allOf: [{ properties: { a: { $ref: '#/$defs/text' } } }],
          if: true,
          // JSON Schema keyword, not a promise.
          // oxlint-disable-next-line unicorn/no-thenable
          then: false,
          else: { $ref: '#' },
          examples: [{ $ref: 'https://example.com/literal' }],
        },
      },
    };
    expect(validateOpenCliDev(doc).valid).toBe(true);
    Object.assign(doc.commands[0]!, { output: { formats: [{ format: 'json', schema: { type: 'bad' } }] } });
    expect(validateOpenCliDev(doc).valid).toBe(false);
    Object.assign(doc.commands[0]!, {
      output: { formats: [{ format: 'json', schema: { items: { $ref: 'https://example.com/schema' } } }] },
    });
    expect(validateOpenCliDev(doc).errors.join()).toContain('unresolved local schema');
    doc.components.schemas!.Data = {
      contentMediaType: 'application/json',
      contentSchema: { $ref: 'https://example.com/external.json' },
    };
    expect(validateOpenCliDev(doc).errors.join()).toContain('/contentSchema/$ref');
    doc.components.schemas!.Data = { $ref: '#/components/schemas/Missing' };
    expect(validateOpenCliDev(doc).errors.join()).toContain('Missing');
    doc.components.schemas!.Data = { $ref: '#/components/schemas/toString' };
    expect(validateOpenCliDev(doc).valid).toBe(false);
  });
});

describe('documentation', () => {
  it('renders full metadata, scopes, schemas and examples without leaking hidden commands', () => {
    const doc = rich();
    const before = structuredClone(doc);
    const markdown = renderMarkdown(doc);
    for (const text of [
      '# Example',
      'tool config run',
      'Operation: `run`',
      'Parent flags: tool config',
      'before its child command',
      'Comma-separated',
      'Counter',
      'Sensitive value',
      'Tracks explicitly',
      'Use labels',
      'Use apply',
      '| `TARGET` | path | Yes |',
      '| `REST` | string | No |',
      'Standard input',
      'Output schema components',
      '```json',
      'An example',
      '````text',
      'Failure',
      'Homepage:',
      'Documentation:',
      'License:',
      'Contact:',
      'Flag relationships',
      'Environment',
    ])
      expect(markdown).toContain(text);
    expect(markdown).not.toContain('--secret');
    expect(markdown).not.toContain('hidden child');
    const pages = generatePages(doc, { basePath: '/reference' });
    expect(pages).toHaveLength(3);
    expect(pages[0]!.content).toContain('/reference/commands/');
    expect(pages[2]!.content).toContain('TARGET');
    expect(doc).toEqual(before);
  });
  it('handles absent metadata, empty optional fields, missing binary and minimal content', () => {
    expect(renderMarkdown(minimal())).toContain('# CLI reference');
    expect(generatePages(minimal())[1]!.path).toBe('/commands/run');
    const doc = minimal();
    doc.info = { title: 'app', version: '1', license: { name: 'MIT' }, contact: {} };
    doc.components = { schemas: {} };
    Object.assign(doc.commands[0]!, {
      deprecated: true,
      stdin: {},
      output: { formats: [{ format: 'text' }] },
      flags: [{ name: 'a', type: 'string', default: null, deprecated: true }],
      arguments: [{ name: 'A', required: true }],
    });
    const markdown = renderMarkdown(doc);
    expect(markdown).toContain('Binary: `app`');
    expect(markdown).toContain('Required: No');
    expect(markdown).toContain('Default: `null`');
  });
});
