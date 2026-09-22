import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocgenCommand, fromYargs } from './index.js';
import { validate } from '@clidoc/core';
import { defineCommand } from 'yargs-file-commands';
import buildYargs from 'yargs';
const info = { title: 'Demo', binary: 'demo', version: '1.0.0' };
describe('fromYargs', () => {
  it('reports demanded array options whose presence requirement OpenCLI cannot express', () => {
    expect(() =>
      fromYargs([{ command: 'run', builder: { items: { array: true, demandOption: true } } }], info),
    ).toThrow(
      "Yargs option 'items' combines demandOption with an array: OpenCLI cannot require the flag while allowing zero values. Document this option separately or change its CLI behavior.",
    );
    expect(() =>
      fromYargs([{ command: 'run', builder: { items: { type: 'array', demandOption: true } } }], info),
    ).toThrow(/Yargs option 'items' combines demandOption with an array/);
  });

  it('maps declarative command modules', () => {
    const doc = fromYargs(
      [
        {
          command: ['greet <name> [items..]', 'hello'],
          describe: 'Say hello',
          builder: {
            language: { alias: 'l', type: 'string', choices: ['en', 'fr'], default: 'en', demandOption: true },
            quiet: { type: 'boolean', hidden: true },
          },
        },
      ],
      info,
    );
    expect(doc.commands?.['demo greet']).toMatchObject({
      summary: 'Say hello',
      aliases: ['hello'],
      args: [
        { name: 'name', required: true },
        { name: 'items', variadic: true },
      ],
      flags: [
        { name: 'language', aliases: ['l'], choices: [{ value: 'en' }, { value: 'fr' }], required: true },
        { name: 'quiet', type: 'boolean', hidden: true },
      ],
    });
  });
  it('accepts an actual defineCommand module without running its handler', () => {
    let ran = false;
    const command = defineCommand({
      command: 'greet <name>',
      builder: (yargs) =>
        yargs
          .positional('name', { type: 'string', describe: 'Person', choices: ['Ada', 'Grace'] })
          .option('count', { type: 'number', default: 2 }),
      handler: () => {
        ran = true;
      },
    });
    const doc = fromYargs([command], info);
    expect(ran).toBe(false);
    expect(doc.commands?.['demo greet']).toMatchObject({
      args: [{ name: 'name', summary: 'Person', choices: [{ value: 'Ada' }, { value: 'Grace' }] }],
      flags: [{ name: 'count', type: 'number', default: 2 }],
    });
  });
  it('records callback builder options and positional metadata without running handlers', () => {
    const doc = fromYargs(
      [
        {
          command: 'run <name>',
          builder: (yargs: any) =>
            yargs
              .positional('name', { type: 'string', describe: 'Person', demandOption: true })
              .option('count', { type: 'number', default: 2 }),
        },
      ],
      info,
    );
    expect(doc.commands?.['demo run']).toMatchObject({
      args: [{ name: 'name', summary: 'Person', required: true }],
      flags: [{ name: 'count', type: 'number', default: 2 }],
    });
  });
});

describe('fromYargs from a live Yargs instance', () => {
  it('auto-discovers commands, aliases, and nested subcommands from a configured parser', () => {
    const parser = buildYargs([])
      .command(['config', 'cfg'], 'Manage configuration', (y: any) => y.command('set <key> <value>', 'Set a value'))
      .command('greet <name>', 'Greet a person', { language: { type: 'string', default: 'en' } });
    const doc = fromYargs(parser, info);
    expect(doc.commands?.['demo config']).toMatchObject({
      summary: 'Manage configuration',
      aliases: ['cfg'],
      kind: 'group',
    });
    expect(doc.commands?.['demo config set']).toMatchObject({
      summary: 'Set a value',
      args: [
        { name: 'key', required: true },
        { name: 'value', required: true },
      ],
    });
    expect(doc.commands?.['demo greet']).toMatchObject({
      summary: 'Greet a person',
      args: [{ name: 'name', required: true }],
      flags: [{ name: 'language', type: 'string', default: 'en' }],
    });
  });
  it('produces the same document as passing the equivalent modules array', () => {
    const greet = { command: 'greet <name>', describe: 'Greet a person', builder: {} };
    const parser = buildYargs([]).command(greet);
    expect(fromYargs(parser, info)).toEqual(fromYargs([greet], info));
  });
  it('throws a diagnostic when getInternalMethods() is missing', () => {
    expect(() => fromYargs({}, info)).toThrow(
      "fromYargs() could not read this Yargs instance's registered commands: getInternalMethods() is missing. Pass an explicit array of command modules instead.",
    );
  });
  it('throws a diagnostic when getInternalMethods().getCommandInstance is missing', () => {
    expect(() => fromYargs({ getInternalMethods: () => ({}) }, info)).toThrow(
      /getInternalMethods\(\)\.getCommandInstance is missing/,
    );
  });
  it('throws a diagnostic when getCommandInstance().getCommandHandlers is missing', () => {
    expect(() => fromYargs({ getInternalMethods: () => ({ getCommandInstance: () => ({}) }) }, info)).toThrow(
      /getCommandInstance\(\)\.getCommandHandlers is missing/,
    );
  });
});

describe('common Yargs builder chains (#75)', () => {
  it('records setters through strict/help chains without executing validation or middleware callbacks', () => {
    const check = vi.fn(() => {
      throw new Error('validation ran');
    });
    const middleware = vi.fn(() => {
      throw new Error('middleware ran');
    });
    const handler = vi.fn();
    const doc = fromYargs(
      [
        {
          command: 'deploy <target>',
          handler,
          builder: (y: any) =>
            y
              .strict()
              .help()
              .version()
              .demandCommand()
              .option('force', { type: 'boolean' })
              .alias('force', 'f')
              .describe('force', 'Overwrite')
              .default('force', false)
              .demandOption('force')
              .choices('mode', ['fast', 'safe'])
              .string('mode')
              .positional('target', { describe: 'Destination' })
              .check(check)
              .middleware(middleware),
        },
      ],
      info,
    );
    expect(doc.commands?.['demo deploy']).toMatchObject({
      args: [{ name: 'target', summary: 'Destination' }],
      flags: [
        { name: 'help', type: 'boolean', summary: 'Show help' },
        { name: 'version', type: 'boolean', summary: 'Show version number' },
        { name: 'force', type: 'boolean', aliases: ['f'], summary: 'Overwrite', default: false, required: true },
        { name: 'mode', type: 'string', choices: [{ value: 'fast' }, { value: 'safe' }] },
      ],
    });
    expect(check).not.toHaveBeenCalled();
    expect(middleware).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });
  it('records common type setters and accepts parser configuration chains', () => {
    const doc = fromYargs(
      [
        {
          command: 'run',
          builder: (y: any) =>
            y
              .strictOptions()
              .strictCommands()
              .recommendCommands()
              .parserConfiguration({})
              .exitProcess(false)
              .showHelpOnFail(false)
              .boolean(['quiet', 'debug'])
              .number('retries')
              .array('files')
              .count('verbose')
              .demandOption('retries', 'required')
              .help(false)
              .version(false),
        },
      ],
      info,
    );
    expect(doc.commands?.['demo run']?.flags).toMatchObject([
      { name: 'quiet', type: 'boolean' },
      { name: 'debug', type: 'boolean' },
      { name: 'retries', type: 'number', required: true },
      { name: 'files', variadic: true },
      { name: 'verbose', type: 'integer' },
    ]);
  });
  it('keeps help and version flag names and rejects unsupported object setters', () => {
    const doc = fromYargs(
      [{ command: 'go', builder: (y: any) => y.help('usage', 'Print usage').version('1.2.3') }],
      info,
    );
    expect(doc.commands?.['demo go']?.flags).toMatchObject([
      { name: 'usage', summary: 'Print usage' },
      { name: 'version', summary: 'Show version number' },
    ]);
    expect(() => fromYargs([{ command: 'go', builder: (y: any) => y.alias({ foo: 'f' }) }], info)).toThrow(
      'Unsupported Yargs .alias() overload',
    );
  });
  it('reports unsupported metadata setters clearly', () => {
    expect(() => fromYargs([{ command: 'go', builder: (y: any) => y.nargs('files', 2) }], info)).toThrow(
      'Unsupported Yargs builder method .nargs(). Add metadata with .option() or extend the adapter.',
    );
  });
});

describe('Yargs metadata variants', () => {
  it('supports aliases, choices, arrays, and options() builder', () => {
    const doc = fromYargs(
      [
        {
          command: 'copy [paths..]',
          aliases: 'cp',
          builder: (yargs: any) =>
            yargs.options({
              force: { type: 'boolean', alias: ['f'], describe: 'Overwrite' },
              levels: { type: 'number', array: true, choices: [1, 2], default: 1 },
            }),
        },
      ],
      info,
    );
    expect(doc.commands?.['demo copy']).toMatchObject({
      aliases: ['cp'],
      args: [{ name: 'paths', variadic: true }],
      flags: [
        { name: 'force', aliases: ['f'], summary: 'Overwrite' },
        { name: 'levels', type: 'number', variadic: true, choices: [{ value: 1 }, { value: 2 }], default: 1 },
      ],
    });
  });
  it('rejects commands lacking a name and asynchronous builders', () => {
    expect(() => fromYargs([{ command: [] }], info)).toThrow('needs a command');
    expect(() => fromYargs([{ command: 'go', builder: async () => undefined }], info)).toThrow('Asynchronous');
  });
});

describe('Yargs sparse metadata', () => {
  it('handles a positional() call with no type or describe metadata', () => {
    const doc = fromYargs([{ command: 'go <where>', builder: (yargs: any) => yargs.positional('where', {}) }], info);
    expect(doc.commands?.['demo go']).toMatchObject({ args: [{ name: 'where', required: true }] });
  });
  it('handles command modules with no builder or optional metadata', () => {
    const doc = fromYargs(
      [
        { command: 'status' },
        {
          command: 'run [count]',
          describe: false,
          builder: { verbose: { description: 'Extra output', default: false }, mode: {} },
        },
      ],
      info,
    );
    expect(doc.commands?.['demo status']).toEqual({});
    expect(doc.commands?.['demo run']?.hidden).toBe(true);
    expect(doc.commands?.['demo run']).toMatchObject({
      args: [{ name: 'count', required: false }],
      flags: [
        { name: 'verbose', type: 'string', summary: 'Extra output', default: false },
        { name: 'mode', type: 'string' },
      ],
    });
  });
  it('maps numeric positionals and array aliases', () => {
    const doc = fromYargs(
      [
        {
          command: ['scale <factor>', 'resize'],
          aliases: ['s'],
          builder: (yargs: any) =>
            yargs
              .positional('factor', { type: 'number', description: 'Scale factor' })
              .option('debug', { type: 'boolean' }),
        },
      ],
      info,
    );
    expect(doc.commands?.['demo scale']).toMatchObject({
      aliases: ['resize', 's'],
      args: [{ name: 'factor', type: 'number', summary: 'Scale factor' }],
      flags: [{ name: 'debug', type: 'boolean' }],
    });
  });
});

describe('multi-word command names (#33)', () => {
  it('joins leading non-positional tokens instead of collapsing to the first word', () => {
    const doc = fromYargs(
      [
        { command: 'config set <key> <value>', describe: 'Set a config value' },
        { command: 'config get <key>', describe: 'Get a config value' },
      ],
      info,
    );
    expect(doc.commands?.['demo config set']).toMatchObject({
      summary: 'Set a config value',
      args: [{ name: 'key' }, { name: 'value' }],
    });
    expect(doc.commands?.['demo config get']).toMatchObject({
      summary: 'Get a config value',
      args: [{ name: 'key' }],
    });
  });
  it('keeps colliding command-word prefixes distinct instead of overwriting each other', () => {
    const doc = fromYargs(
      [
        { command: 'remote add <name> <url>', describe: 'Add a remote' },
        { command: 'remote remove <name>', describe: 'Remove a remote' },
      ],
      info,
    );
    expect(Object.keys(doc.commands ?? {})).toEqual(['demo remote add', 'demo remote remove']);
  });
  it('joins multi-word alias patterns the same way as the primary pattern', () => {
    const doc = fromYargs([{ command: ['config set <key> <value>', 'config s <key> <value>'] }], info);
    expect(doc.commands?.['demo config set']).toMatchObject({ aliases: ['config s'] });
  });
  it('maps $0 default-command patterns to the binary itself', () => {
    const doc = fromYargs([{ command: '$0 <file>', describe: 'Default command' }], info);
    expect(doc.commands?.['demo']).toMatchObject({ summary: 'Default command', args: [{ name: 'file' }] });
  });
  it('recurses into nested .command() calls registered inside a builder, marking pure parents as groups', () => {
    const doc = fromYargs(
      [
        {
          command: 'config',
          describe: 'Manage configuration',
          builder: (yargs: any) =>
            yargs
              .command('set <key> <value>', 'Set a config value', (y: any) => y.option('force', { type: 'boolean' }))
              .command({ command: 'get <key>', describe: 'Get a config value' }),
        },
      ],
      info,
    );
    expect(doc.commands?.['demo config']).toMatchObject({ summary: 'Manage configuration', kind: 'group' });
    expect(doc.commands?.['demo config'].args).toBeUndefined();
    expect(doc.commands?.['demo config'].flags).toBeUndefined();
    expect(doc.commands?.['demo config set']).toMatchObject({
      summary: 'Set a config value',
      args: [{ name: 'key' }, { name: 'value' }],
      flags: [{ name: 'force', type: 'boolean' }],
    });
    expect(doc.commands?.['demo config get']).toMatchObject({ summary: 'Get a config value', args: [{ name: 'key' }] });
  });
  it('does not mark a parent as a group when it has its own args or flags alongside children', () => {
    const doc = fromYargs(
      [
        {
          command: 'serve [port]',
          describe: 'Run the server, or manage it',
          builder: (yargs: any) => yargs.command('stop', 'Stop the server'),
        },
      ],
      info,
    );
    expect(doc.commands?.['demo serve'].kind).toBeUndefined();
    expect(doc.commands?.['demo serve stop']).toMatchObject({ summary: 'Stop the server' });
  });
});

describe('option type mapping (#34)', () => {
  it('maps count options to integer and unrecognised types to string', () => {
    const doc = fromYargs(
      [
        {
          command: 'run',
          builder: {
            verbose: { type: 'count', alias: 'v' },
            level: { type: 'enum' as any },
          },
        },
      ],
      info,
    );
    expect(doc.commands?.['demo run']).toMatchObject({
      flags: [
        { name: 'verbose', type: 'integer', aliases: ['v'] },
        { name: 'level', type: 'string' },
      ],
    });
  });
  it('produces a document that validates, including a count option', () => {
    const doc = fromYargs(
      [{ command: 'run', builder: { verbose: { type: 'count', describe: 'Increase verbosity' } } }],
      info,
    );
    const result = validate(doc);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });
});

describe('createDocgenCommand', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'clidoc-yargs-docgen-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('defaults to a "docgen" command that writes JSON', async () => {
    const doc = fromYargs([], info);
    const module = createDocgenCommand(() => doc);
    expect(module.command).toBe('docgen');
    const output = join(dir, 'cli.json');
    await module.handler({ output, format: 'json' });
    expect(JSON.parse(await readFile(output, 'utf8'))).toEqual(doc);
  });

  it('writes Markdown when format is markdown', async () => {
    const doc = fromYargs([], info);
    const module = createDocgenCommand(() => doc);
    const output = join(dir, 'cli.md');
    await module.handler({ output, format: 'markdown' });
    expect(await readFile(output, 'utf8')).toContain('# Demo');
  });

  it('writes YAML when format is yaml', async () => {
    const doc = fromYargs([], info);
    const module = createDocgenCommand(() => doc);
    const output = join(dir, 'cli.yaml');
    await module.handler({ output, format: 'yaml' });
    expect(await readFile(output, 'utf8')).toContain('binary: demo');
  });

  it('accepts a custom command string', () => {
    const module = createDocgenCommand(() => fromYargs([], info), { command: 'gen-docs' });
    expect(module.command).toBe('gen-docs');
  });

  it('writes to stdout when output is omitted', async () => {
    const doc = fromYargs([], info);
    const module = createDocgenCommand(() => doc);
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await module.handler({ format: 'json' });
    expect(stdout).toHaveBeenCalledWith(`${JSON.stringify(doc, null, 2)}\n`);
    stdout.mockRestore();
  });
});
