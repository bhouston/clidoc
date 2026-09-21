import { describe, expect, it } from 'vitest';
import { ConversionError, convertDocument } from './convert.js';
import { detectDialect, validateDocument } from './index.js';
import type { OpenCliDevDocument } from './opencli-dev-types.js';
import type { OpenCliDocument } from './types.js';

const bcdxn = (): OpenCliDocument => ({
  opencliVersion: '1.0.0-alpha.14',
  info: { title: 'Tool', binary: 'tool', version: '1.0', summary: 'A useful tool', description: 'Longer help.' },
  global: {
    flags: [{ name: 'verbose', aliases: ['v'], type: 'boolean', summary: 'Show details', default: false }],
  },
  commands: {
    'tool run': {
      summary: 'Run a job',
      description: 'Runs one selected job.',
      args: [{ name: 'TARGET', type: 'string', required: true, choices: [{ value: 'all' }] }],
      flags: [{ name: 'force', aliases: ['f'], type: 'boolean', summary: 'Force it' }],
      examples: [{ title: 'Run all', content: 'tool run all' }],
    },
  },
});

const dev = (): OpenCliDevDocument => ({
  opencli: '0.1.0',
  info: { title: 'Tool', binaryName: 'tool', version: '2.0', description: 'A useful tool' },
  flags: [{ name: 'verbose', short: 'v', type: 'boolean', default: false }],
  commands: [
    {
      name: 'run',
      operationId: 'run',
      description: 'Run a job',
      arguments: [{ name: 'TARGET', type: 'string', required: true, choices: ['all'] }],
      flags: [{ name: 'force', short: 'f', type: 'boolean' }],
      examples: [{ command: 'tool run all', description: 'Run all' }],
    },
  ],
});

describe('convertDocument', () => {
  it('defaults to a cloned bcdxn document without changing the input', () => {
    const input = bcdxn();
    const before = structuredClone(input);
    const result = convertDocument(input);
    expect(result).toEqual({ document: input, diagnostics: [] });
    expect(result.document).not.toBe(input);
    expect(input).toEqual(before);
  });

  it('clones opencli-dev when it is already the requested dialect', () => {
    const input = dev();
    const result = convertDocument(input, { to: 'opencli-dev' });
    expect(result.document).toEqual(input);
    expect(result.document).not.toBe(input);
    expect(result.diagnostics).toEqual([]);
  });

  it('strictly converts the common bcdxn subset to a valid nested opencli-dev document', () => {
    const input = bcdxn();
    const before = structuredClone(input);
    const result = convertDocument(input, { to: 'opencli-dev' });
    expect(result.diagnostics).toEqual([]);
    expect(detectDialect(result.document)).toBe('opencli-dev');
    expect(validateDocument(result.document).valid).toBe(true);
    const output = result.document as OpenCliDevDocument;
    expect(output.info).toMatchObject({ title: 'Tool', binaryName: 'tool', version: '1.0' });
    expect(output.flags?.[0]).toMatchObject({ name: 'verbose', short: 'v', default: false });
    expect(output.commands[0]).toMatchObject({
      name: 'run',
      operationId: expect.stringMatching(/^op_[0-9a-f]+$/),
      description: 'Run a job',
      longDescription: 'Runs one selected job.',
      arguments: [{ name: 'TARGET', required: true, choices: ['all'] }],
      flags: [{ name: 'force', short: 'f' }],
      examples: [{ command: 'tool run all', description: 'Run all' }],
    });
    expect(input).toEqual(before);
  });

  it('requires lossy mode for opencli-dev operation identifiers and returns a valid bcdxn document', () => {
    const input = dev();
    expect(() => convertDocument(input)).toThrow(ConversionError);
    try {
      convertDocument(input);
    } catch (error) {
      expect((error as ConversionError).diagnostics).toContainEqual({
        path: '/commands/0/operationId',
        message: 'operationId is not supported by bcdxn OpenCLI',
      });
    }
    const result = convertDocument(input, { allowLossy: true });
    expect(detectDialect(result.document)).toBe('bcdxn');
    expect(validateDocument(result.document).valid).toBe(true);
    expect((result.document as OpenCliDocument).commands?.['tool run']).toMatchObject({
      summary: 'Run a job',
      args: [{ name: 'TARGET', required: true, choices: [{ value: 'all' }] }],
      flags: [{ name: 'force', aliases: ['f'], type: 'boolean' }],
      examples: [{ content: 'tool run all', title: 'Run all' }],
    });
  });

  it('reports every exercised unsupported field and drops it only in lossy mode', () => {
    const input = dev();
    input.$schema = 'https://example.test/opencli.json';
    input.components = { schemas: { Result: { type: 'object' } } };
    Object.assign(input.commands[0]!, {
      output: { formats: [{ format: 'json', schema: { $ref: '#/components/schemas/Result' } }] },
      tags: ['jobs'],
    });
    const result = convertDocument(input, { allowLossy: true });
    expect(result.diagnostics.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        '/$schema',
        '/components',
        '/commands/0/operationId',
        '/commands/0/tags',
        '/commands/0/output',
      ]),
    );
    expect((result.document as OpenCliDocument).commands?.['tool run']).not.toHaveProperty('output');
  });

  it('diagnoses bcdxn extensions and unsupported constraints before allowing their removal', () => {
    const input = bcdxn();
    input['x-owner'] = 'team';
    input.commands!['tool run']!.args![0]!.variadic = true;
    input.commands!['tool run']!.args![0]!.minItems = 1;
    input.commands!['tool run']!.flags![0]!.aliases = ['f', 'force-it'];
    input.commands!['tool run']!.flags![0]!.alternativeSources = [
      { type: '$ENV', property: 'FORCE', 'x-origin': 'shell' },
    ];
    expect(() => convertDocument(input, { to: 'opencli-dev' })).toThrow('would lose information');
    const result = convertDocument(input, { to: 'opencli-dev', allowLossy: true });
    expect(result.diagnostics.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        '/x-owner',
        '/commands/tool run/args/0/minItems',
        '/commands/tool run/flags/0/aliases',
        '/commands/tool run/flags/0/alternativeSources/0/x-origin',
      ]),
    );
    expect(validateDocument(result.document).valid).toBe(true);
  });

  it('canonicalizes incompatible argument labels only in lossy mode', () => {
    const input = bcdxn();
    input.commands!['tool run']!.args![0]!.name = '<target file>';
    const result = convertDocument(input, { to: 'opencli-dev', allowLossy: true });
    expect(result.diagnostics).toContainEqual({
      path: '/commands/tool run/args/0/name',
      message: 'argument label was changed to ARG_TARGET_FILE_',
    });
    expect((result.document as OpenCliDevDocument).commands[0]).toMatchObject({
      arguments: [{ name: 'ARG_TARGET_FILE_' }],
    });
  });

  it.each([
    [
      () => ({ ...bcdxn(), commands: { 'tool run [TARGET]': { summary: 'Decorated path' } } }) as OpenCliDocument,
      { to: 'opencli-dev' as const },
      'plain source-binary-prefixed path',
    ],
    [
      () => ({ ...bcdxn(), commands: { tool: { summary: 'Runnable root' } } }) as OpenCliDocument,
      { to: 'opencli-dev' as const, allowLossy: true },
      'runnable root command',
    ],
    [() => ({ ...dev(), info: undefined }) as OpenCliDevDocument, { allowLossy: true }, 'provide options.info.title'],
  ])('hard-fails structural or identity ambiguity even with lossy conversion', (makeInput, options, message) => {
    expect(() => convertDocument(makeInput(), options)).toThrow(message);
  });

  it('accepts identity overrides for a minimal opencli-dev source', () => {
    const input: OpenCliDevDocument = { opencli: '0.1.0', commands: [{ name: 'run', operationId: 'run' }] };
    const result = convertDocument(input, {
      allowLossy: true,
      info: { title: 'Tool', binary: 'tool', version: '3.0' },
    });
    expect((result.document as OpenCliDocument).info).toEqual({ title: 'Tool', binary: 'tool', version: '3.0' });
  });

  it('uses a valid dev title as the binary fallback and propagates hidden ancestors', () => {
    const input: OpenCliDevDocument = {
      opencli: '0.1.0',
      info: { title: 'tool', version: '1' },
      commands: [{ name: 'admin', hidden: true, commands: [{ name: 'show', operationId: 'admin_show' }] }],
    };
    const result = convertDocument(input, { allowLossy: true });
    const output = result.document as OpenCliDocument;
    expect(output.info.binary).toBe('tool');
    expect(output.commands?.['tool admin show']?.hidden).toBe(true);
  });

  it('keeps source paths anchored to the source binary when overriding target identity', () => {
    const result = convertDocument(bcdxn(), {
      to: 'opencli-dev',
      info: { binary: 'renamed' },
    });
    expect((result.document as OpenCliDevDocument).info?.binaryName).toBe('renamed');
    expect((result.document as OpenCliDevDocument).commands[0]).toMatchObject({ name: 'run' });
  });

  it('allows executable-style binary names and preserves compliant hyphenated argument labels', () => {
    const input = bcdxn();
    input.info.binary = 'Tool.exe';
    input.commands = { 'Tool.exe run': { args: [{ name: 'TARGET-FILE', required: true }] } };
    const result = convertDocument(input, { to: 'opencli-dev' });
    expect((result.document as OpenCliDevDocument).info?.binaryName).toBe('Tool.exe');
    expect((result.document as OpenCliDevDocument).commands[0]).toMatchObject({
      arguments: [{ name: 'TARGET-FILE' }],
    });
  });

  it('maps required repeatable flags without overriding a satisfying default', () => {
    const input = dev();
    input.commands[0] = {
      name: 'run',
      operationId: 'run',
      flags: [{ name: 'tag', repeatable: true, required: true, default: 'stable' }],
    };
    const result = convertDocument(input, { allowLossy: true });
    expect((result.document as OpenCliDocument).commands?.['tool run']?.flags?.[0]).toMatchObject({
      name: 'tag',
      variadic: true,
      default: 'stable',
    });
    expect((result.document as OpenCliDocument).commands?.['tool run']?.flags?.[0]).not.toHaveProperty('minItems');
  });

  it('synthesizes distinct operation identifiers for otherwise ambiguous command paths', () => {
    const input = bcdxn();
    input.commands = {
      'tool a-b c': { summary: 'First' },
      'tool a b-c': { summary: 'Second' },
    };
    const output = convertDocument(input, { to: 'opencli-dev' }).document as OpenCliDevDocument;
    const identifiers: string[] = [];
    const visit = (commands: OpenCliDevDocument['commands']) =>
      commands.forEach((command) => {
        if ('$ref' in command) return;
        if (command.operationId) identifiers.push(command.operationId);
        if (command.commands) visit(command.commands);
      });
    visit(output.commands);
    expect(new Set(identifiers).size).toBe(2);
  });

  it('hard-fails parent segment scope in both directions', () => {
    const nested = dev();
    nested.commands = [
      { name: 'admin', flags: [{ name: 'profile' }], commands: [{ name: 'show', operationId: 'admin_show' }] },
    ];
    expect(() => convertDocument(nested, { allowLossy: true })).toThrow('segment scope');
    const flat = bcdxn();
    flat.commands!['tool run child'] = { summary: 'Child' };
    expect(() => convertDocument(flat, { to: 'opencli-dev', allowLossy: true })).toThrow('segment scope');
  });

  it('wraps invalid input diagnostics in ConversionError', () => {
    try {
      convertDocument({ opencli: '0.1.0', commands: [] } as OpenCliDevDocument);
      throw new Error('expected conversion to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ConversionError);
      expect((error as ConversionError).diagnostics.length).toBeGreaterThan(0);
    }
  });

  it('rejects invalid target values and same-dialect identity overrides', () => {
    expect(() => convertDocument(bcdxn(), { to: 'other' as 'bcdxn' })).toThrow('/options/to');
    expect(() => convertDocument(bcdxn(), { info: { title: 'Renamed' } })).toThrow('cross-dialect');
  });

  it('hard-fails an explicit group that would become a runnable leaf', () => {
    const input = bcdxn();
    input.commands = { 'tool admin': { kind: 'group', summary: 'Administration' } };
    expect(() => convertDocument(input, { to: 'opencli-dev', allowLossy: true })).toThrow('explicit group');
  });

  it('projects rich bcdxn metadata and reports its unsupported features precisely', () => {
    const input = bcdxn();
    input.info.license = { name: 'MIT', spdxId: 'MIT', url: 'https://example.test/license', 'x-note': true };
    input.info.contact = { name: 'Team', email: 'team@example.test', 'x-id': 1 };
    input.install = [{ name: 'npm', command: 'npm i tool', 'x-channel': 'stable' }];
    input.global = {
      config: { yaml: '~/.tool.yaml', 'x-format': 'yaml' },
      exitCodes: [{ code: 0, status: 'OK', summary: 'Done', description: 'Everything worked', 'x-code': true }],
      flags: [
        {
          name: 'config',
          type: 'string',
          aliases: ['c'],
          choices: [{ value: 'user', description: 'User config', 'x-choice': true }, { value: 2 }],
          alternativeSources: [
            { type: '$ENV', property: 'CONFIG', 'x-source': true },
            { type: '$FILE', property: '~/.config' },
          ],
          minItems: 1,
          maxItems: 2,
          variadic: true,
          hint: 'PATH',
          required: true,
          hidden: true,
        },
      ],
    };
    input.commands!['tool run'] = {
      aliases: ['r', 'Not Valid'],
      args: [
        {
          name: 'TARGET',
          type: 'string',
          required: false,
          summary: 'Target',
          description: 'Long target prose',
          variadic: true,
          minItems: 0,
          maxItems: 3,
          passthrough: true,
          choices: [{ value: 'all', description: 'Everything' }],
        },
      ],
      examples: [{ title: 'Example', content: 'tool run all', 'x-shell': 'sh' }],
      exitCodes: [{ code: 1, status: 'BAD_USER_INPUT_ERROR', summary: 'Bad input' }],
    };
    const result = convertDocument(input, { to: 'opencli-dev', allowLossy: true });
    expect(validateDocument(result.document).valid).toBe(true);
    const paths = result.diagnostics.map(({ path }) => path);
    for (const path of [
      '/info/license/spdxId',
      '/info/license/x-note',
      '/info/contact/x-id',
      '/install',
      '/global/config',
      '/global/flags/0/choices/0/description',
      '/global/flags/0/choices/1/value',
      '/global/flags/0/alternativeSources',
      '/commands/tool run/aliases/1',
      '/commands/tool run/args/0/description',
      '/commands/tool run/args/0/passthrough',
      '/commands/tool run/examples/0/x-shell',
      '/global/exitCodes/0/description',
    ])
      expect(paths).toContain(path);
    const output = result.document as OpenCliDevDocument;
    expect(output.info).toMatchObject({
      license: { name: 'MIT', url: 'https://example.test/license' },
      contact: { name: 'Team', email: 'team@example.test' },
    });
    expect(output.commands[0]).toMatchObject({
      aliases: ['r'],
      arguments: [{ description: 'Target\n\nLong target prose', variadic: true }],
      exitCodes: [{ code: 1, label: 'BAD_USER_INPUT_ERROR', description: 'Bad input' }],
    });
  });

  it('expands rich opencli-dev references and reports every unsupported native contract', () => {
    const input: OpenCliDevDocument = {
      opencli: '0.1.0',
      $schema: './opencli.json',
      info: {
        title: 'Tool',
        binaryName: 'tool',
        version: '2',
        description: 'Short',
        longDescription: 'Long',
        homepage: 'https://example.test',
        documentationUrl: 'https://example.test/docs',
        license: { name: 'MIT', url: 'https://example.test/license' },
        contact: { name: 'Team', email: 'team@example.test' },
      },
      flags: [{ $ref: '#/components/flags/shared' }],
      exitCodes: [
        { code: 0, label: 'OK', description: 'Success' },
        { code: 7, label: 'Unknown' },
      ],
      commands: [{ $ref: '#/components/commands/run' }],
      components: {
        flags: {
          shared: {
            name: 'tag',
            short: 't',
            type: 'path',
            format: 'path',
            description: 'Tag',
            longDescription: 'Long tag',
            default: null,
            choices: ['a'],
            placeholder: 'TAG',
            envVar: 'TAG',
            repeatable: true,
            splitOnComma: true,
            trackChanged: true,
            sensitive: true,
            deprecated: true,
            deprecationMessage: 'Use labels',
            hidden: true,
          },
        },
        arguments: { target: { name: 'TARGET', type: 'file', format: 'path', default: null, sensitive: true } },
        examples: { example: { command: 'tool run file', description: 'Run it', output: 'done' } },
        schemas: { Result: { type: 'object' } },
        commands: {
          run: {
            name: 'run',
            operationId: 'run',
            aliases: ['r'],
            usage: 'tool run TARGET',
            description: 'Run',
            longDescription: 'Run long',
            deprecated: true,
            deprecationMessage: 'Use apply',
            tags: ['job'],
            flags: [
              { name: 'counted', count: true, default: 1 },
              { name: 'other', type: 'boolean' },
            ],
            arguments: [{ $ref: '#/components/arguments/target' }],
            examples: [{ $ref: '#/components/examples/example' }],
            envVars: [{ name: 'HOME', default: '~', description: 'Home' }],
            exitCodes: [{ code: 1, label: 'BAD_USER_INPUT_ERROR', description: 'Bad' }, { code: 2 }],
            flagGroups: [{ type: 'oneRequired', flags: ['counted', 'other'] }],
            stdin: { required: true, format: 'json', description: 'Input' },
            output: { formats: [{ format: 'json', schema: { $ref: '#/components/schemas/Result' } }] },
          },
        },
      },
    };
    const result = convertDocument(input, { allowLossy: true });
    expect(validateDocument(result.document).valid).toBe(true);
    const paths = result.diagnostics.map(({ path }) => path);
    for (const path of [
      '/$schema',
      '/components',
      '/info/homepage',
      '/info/documentationUrl',
      '/flags/0/type',
      '/flags/0/default',
      '/flags/0/splitOnComma',
      '/commands/0/operationId',
      '/commands/0/usage',
      '/commands/0/deprecated',
      '/commands/0/envVars',
      '/commands/0/flagGroups',
      '/commands/0/stdin',
      '/commands/0/output',
      '/commands/0/arguments/0/type',
      '/commands/0/examples/0/output',
      '/commands/0/exitCodes/1',
      '/exitCodes/1',
    ])
      expect(paths).toContain(path);
    const output = result.document as OpenCliDocument;
    expect(output.global).toMatchObject({
      flags: [
        {
          name: 'tag',
          type: 'string',
          aliases: ['t'],
          variadic: true,
          alternativeSources: [{ type: '$ENV', property: 'TAG' }],
        },
      ],
      exitCodes: [{ code: 0, status: 'OK', summary: 'Success' }],
    });
    expect(output.commands?.['tool run']).toMatchObject({
      aliases: ['r'],
      args: [{ name: 'TARGET', type: 'string', required: true }],
      flags: [
        { name: 'counted', type: 'integer', default: 1 },
        { name: 'other', type: 'boolean' },
      ],
      examples: [{ title: 'Run it', content: 'tool run file' }],
      exitCodes: [{ code: 1, status: 'BAD_USER_INPUT_ERROR', summary: 'Bad' }],
    });
  });
});
