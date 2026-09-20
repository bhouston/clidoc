import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocgenCommand, fromYargs } from './index.js';
import { validate } from '@clidoc/core';
import { defineCommand } from 'yargs-file-commands';
const info = { title: 'Demo', binary: 'demo', version: '1.0.0' };
describe('fromYargs', () => {
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
