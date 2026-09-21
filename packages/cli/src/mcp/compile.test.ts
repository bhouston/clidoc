import { describe, expect, it } from 'vitest';
import { type OpenCliDocument } from '@clidoc/core';
import { compileMcpTools } from './compile.js';

const spec = (): OpenCliDocument => ({
  opencliVersion: '1.0.0-alpha.14',
  info: { title: 'App', binary: 'app', version: '1' },
  commands: { 'app run': {} },
});
const one = (source = spec()) => compileMcpTools(source)[0]!;

describe('MCP compilation', () => {
  it('produces deterministic bounded names, independent schemas and positional encoders', () => {
    const source = spec();
    source.global = {
      flags: [
        { name: 'verbose', type: 'boolean' },
        { name: 'format', type: 'string' },
      ],
    };
    source.commands!['app run'] = {
      description: 'Run a task',
      args: [
        { name: 'name', required: true },
        { name: 'rest', type: 'integer', variadic: true, minItems: 1, maxItems: 3 },
      ],
      flags: [
        {
          name: 'format',
          type: 'string',
          default: 'json',
          choices: [{ value: 'json' }, { value: 'text' }],
          summary: 'Output format',
        },
        { name: 'tag', type: 'string', variadic: true },
        { name: 'count', type: 'number', required: true, description: 'Count' },
        { name: 'secret', type: 'string', hidden: true },
      ],
    };
    const compiled = one(source);
    expect(compiled.tool.name).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
    expect(compiled.tool).toEqual(one(source).tool);
    expect(compiled.tool.description).toBe('Run a task');
    expect(JSON.stringify(compiled.tool.inputSchema)).not.toContain('secret');
    expect(
      compiled.argv({
        arguments: { name: '$(touch nope); --help', rest: [1, 2] },
        flags: { verbose: true, count: 1.5, tag: ['a', '-b'] },
      }),
    ).toEqual(['run', '--verbose', '--tag=a', '--tag=-b', '--count=1.5', '--', '$(touch nope); --help', '1', '2']);
    expect(
      compiled.argv({ arguments: { name: 'a', rest: [1] }, flags: { verbose: false, count: 0, format: 'text' } }),
    ).toContain('--verbose=false');
    source.commands!['app run']!.args![0]!.name = 'changed';
    expect(compiled.argv({ arguments: { name: 'a', rest: [1] }, flags: { count: 0 } })).toContain('a');
    for (const input of [
      {},
      { arguments: { name: 'a', rest: [] }, flags: { count: 1 } },
      { arguments: { name: 'a', rest: [1, 2, 3, 4] }, flags: { count: 1 } },
      { arguments: { name: 'a', rest: [1.5] }, flags: { count: 1 } },
      { arguments: { name: 'a', rest: [1] }, flags: { count: '1' } },
      { arguments: { name: 'a', rest: [1] }, flags: { count: 1, format: 'xml' } },
    ])
      expect(() => compiled.argv(input)).toThrow('Invalid tool arguments');
  });

  it('omits hidden commands and groups, supports root/nested commands and empty catalogs', () => {
    const source = spec();
    source.commands = {
      app: { summary: 'Root' },
      'app hide': { hidden: true },
      'app group': { kind: 'group' },
      'app group run': {},
    };
    const tools = compileMcpTools(source);
    expect(tools).toHaveLength(2);
    expect(tools[0]!.argv({})).toEqual([]);
    expect(tools[0]!.tool.description).toBe('Root');
    expect(tools[1]!.argv({})).toEqual(['group', 'run']);
    expect(compileMcpTools({ ...source, commands: undefined })).toEqual([]);
    source.commands = { ['app ' + 'x'.repeat(200)]: {}, 'app a-b': {}, 'app a b': {} };
    expect(new Set(compileMcpTools(source).map(({ tool }) => tool.name)).size).toBe(3);
    expect(compileMcpTools(source).every(({ tool }) => tool.name.length <= 64)).toBe(true);
  });

  it('rejects invalid inputs, extra properties, NULs and positional holes', () => {
    const source = spec();
    source.commands!['app run']!.args = [{ name: 'a' }, { name: 'b' }];
    const compiled = one(source);
    for (const input of [
      null,
      [],
      { executable: 'bad' },
      { flags: { unknown: true } },
      { arguments: { unknown: 'x' } },
    ])
      expect(() => compiled.argv(input)).toThrow('Invalid tool arguments');
    expect(() => compiled.argv({ arguments: { b: 'b' } })).toThrow('omitted positional');
    expect(() => compiled.argv({ arguments: { a: '\0' } })).toThrow('NUL');
    expect(compiled.argv({})).toEqual(['run']);
    expect(() => compileMcpTools({} as OpenCliDocument)).toThrow('Invalid OpenCLI');
  });

  it.each([
    [
      'foreign command',
      (s: OpenCliDocument) => {
        s.commands = { other: {} };
      },
      'must start with binary',
    ],
    [
      'bad command path',
      (s: OpenCliDocument) => {
        s.commands = { 'app --eval': {} };
      },
      'unsupported command path',
    ],
    [
      'duplicate globals',
      (s: OpenCliDocument) => {
        s.global = {
          flags: [
            { name: 'a', type: 'string' },
            { name: 'a', type: 'string' },
          ],
        };
      },
      'duplicate global',
    ],
    [
      'bad flag name',
      (s: OpenCliDocument) => {
        s.commands!['app run']!.flags = [{ name: '--bad', type: 'string' }];
      },
      'unsupported flag',
    ],
    [
      'hidden required',
      (s: OpenCliDocument) => {
        s.commands!['app run']!.flags = [{ name: 'a', type: 'string', required: true, hidden: true }];
      },
      'hidden required',
    ],
    [
      'boolean array',
      (s: OpenCliDocument) => {
        s.commands!['app run']!.flags = [{ name: 'a', type: 'boolean', variadic: true }];
      },
      'variadic boolean',
    ],
    [
      'duplicate args',
      (s: OpenCliDocument) => {
        s.commands!['app run']!.args = [{ name: 'a' }, { name: 'a' }];
      },
      'duplicate argument',
    ],
    [
      'passthrough',
      (s: OpenCliDocument) => {
        s.commands!['app run']!.args = [{ name: 'a', passthrough: true }];
      },
      'passthrough',
    ],
    [
      'nonfinal variadic',
      (s: OpenCliDocument) => {
        s.commands!['app run']!.args = [{ name: 'a', variadic: true }, { name: 'b' }];
      },
      'variadic argument must be last',
    ],
  ])('rejects %s', (_name, change, message) => {
    const source = spec();
    change(source);
    expect(() => compileMcpTools(source)).toThrow(message);
  });

  it('handles dangerous object keys as data, required arrays and default metadata', () => {
    const source = spec();
    source.commands!['app run']!.flags = [
      { name: 'constructor', type: 'string', variadic: true, minItems: 1, maxItems: 2 },
    ];
    source.commands!['app run']!.args = [{ name: 'constructor', type: 'boolean', required: true, variadic: true }];
    const compiled = one(source);
    expect(compiled.argv(JSON.parse('{"arguments":{"constructor":[true]},"flags":{"constructor":["ok"]}}'))).toEqual([
      'run',
      '--constructor=ok',
      '--',
      'true',
    ]);
    expect(() => compiled.argv({ arguments: {}, flags: {} })).toThrow();
    source.commands!['app run']!.args = [{ name: '__proto__' }];
    expect(() => one(source)).toThrow('Unsupported parameter');
  });
});
