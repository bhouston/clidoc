import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Argument, Command, Option } from 'commander';
import { validate } from '@clidoc/core';
import { createDocgenCommand, fromCommander } from './index.js';

const info = { title: 'Demo', binary: 'demo', version: '1.0.0' };
describe('fromCommander', () => {
  it('maps commands, args, flags and aliases without running actions', () => {
    const root = new Command('ignored').description('CLI');
    const group = root.command('users').description('User commands');
    let ran = false;
    group
      .command('add <name> [tags...]')
      .alias('create')
      .description('Add user')
      .addOption(
        new Option('-r, --role <role>', 'Role').choices(['admin', 'user']).makeOptionMandatory().default('user'),
      )
      .addOption(new Option('--verbose', 'Verbose').hideHelp())
      .action(() => {
        ran = true;
      });
    const doc = fromCommander(root, info);
    expect(ran).toBe(false);
    expect(doc.opencliVersion).toBe('1.0.0-alpha.14');
    expect(doc.commands?.['demo users']?.kind).toBe('group');
    expect(doc.commands?.['demo users add']).toMatchObject({
      summary: 'Add user',
      aliases: ['create'],
      args: [
        { name: 'name', required: true },
        { name: 'tags', variadic: true },
      ],
      flags: [
        { name: 'role', aliases: ['r'], type: 'string', required: true, default: 'user' },
        { name: 'verbose', type: 'boolean', hidden: true },
      ],
    });
  });
});

describe('Commander metadata variants', () => {
  it('handles optional, variadic, boolean, default and choice values', () => {
    const root = new Command('demo');
    root.argument('[mode]', 'Mode');
    root.option('--count <count>', 'Count', '3');
    root.option('-q, --quiet', 'Quiet');
    root.addArgument(new Argument('[choice]', 'Selection').choices(['a', 'b']));
    root.addOption(new Option('--items <items...>').default(false));
    const doc = fromCommander(root, info);
    expect(doc.commands?.demo?.args?.[0]).toMatchObject({ name: 'mode', summary: 'Mode' });
    expect(doc.commands?.demo?.args?.[1]).toMatchObject({ name: 'choice', choices: [{ value: 'a' }, { value: 'b' }] });
    expect(doc.commands?.demo?.flags).toMatchObject([
      { name: 'count', type: 'string', default: '3' },
      { name: 'quiet', aliases: ['q'], type: 'boolean' },
      { name: 'items', variadic: true, default: false },
    ]);
  });
});

describe('negated options (#35)', () => {
  it('preserves the invocable name and default of a standalone --no-foo flag', () => {
    const root = new Command('demo');
    root.addOption(new Option('--no-color', 'Disable color output'));
    const doc = fromCommander(root, info);
    expect(doc.commands?.demo?.flags).toEqual([
      { name: 'no-color', type: 'boolean', default: true, summary: 'Disable color output' },
    ]);
    expect(root.options.map((option) => option.long)).toContain(`--${doc.commands?.demo?.flags?.[0]?.name}`);
    root.parse(['node', 'demo', '--no-color']);
    expect(root.opts().color).toBe(false);
  });

  it('preserves an explicit default on a standalone negation', () => {
    const root = new Command('demo');
    root.addOption(new Option('--no-color').default(false));
    expect(fromCommander(root, info).commands?.demo?.flags).toEqual([
      { name: 'no-color', type: 'boolean', default: false },
    ]);
  });

  it('merges --foo and --no-foo on the same command into one boolean flag', () => {
    const root = new Command('demo');
    root.addOption(new Option('--color', 'Use color output'));
    root.addOption(new Option('--no-color', 'Disable color output'));
    const doc = fromCommander(root, info);
    expect(doc.commands?.demo?.flags).toEqual([
      { name: 'color', type: 'boolean', default: true, summary: 'Use color output Negate with --no-color.' },
    ]);
    expect(root.options.map((option) => option.long)).toEqual(['--color', '--no-color']);
    root.parse(['node', 'demo', '--color']);
    expect(root.opts().color).toBe(true);
    root.parse(['node', 'demo', '--no-color']);
    expect(root.opts().color).toBe(false);
  });

  it('types an option with an optional value as string and does not mark it required', () => {
    const root = new Command('demo');
    root.addOption(new Option('--foo [value]', 'Optional value'));
    const doc = fromCommander(root, info);
    expect(doc.commands?.demo?.flags).toEqual([{ name: 'foo', type: 'string', summary: 'Optional value' }]);
  });
});

describe('hidden commands, summary, env sources (#36)', () => {
  it('marks commands created with { hidden: true } as hidden', () => {
    const root = new Command('demo');
    root.command('secret', { hidden: true }).description('Internal only');
    const doc = fromCommander(root, info);
    expect(doc.commands?.['demo secret']?.hidden).toBe(true);
  });

  it('maps summary() to summary and description() to description when both are set', () => {
    const root = new Command('demo');
    const child = root.command('build');
    child.summary('Build the project');
    child.description('Build the project from source, running the full pipeline.');
    const doc = fromCommander(root, info);
    expect(doc.commands?.['demo build']).toMatchObject({
      summary: 'Build the project',
      description: 'Build the project from source, running the full pipeline.',
    });
  });

  it('maps summary() to summary when description() is not set', () => {
    const root = new Command('demo');
    root.command('build').summary('Build the project');
    const doc = fromCommander(root, info);
    expect(doc.commands?.['demo build']).toMatchObject({ summary: 'Build the project' });
    expect(doc.commands?.['demo build'].description).toBeUndefined();
  });

  it('falls back to description() as summary when summary() is not set', () => {
    const root = new Command('demo');
    root.command('build').description('Build the project');
    const doc = fromCommander(root, info);
    expect(doc.commands?.['demo build']).toMatchObject({ summary: 'Build the project' });
    expect(doc.commands?.['demo build'].description).toBeUndefined();
  });

  it('maps Option.env to alternativeSources', () => {
    const root = new Command('demo');
    root.addOption(new Option('--token <token>', 'API token').env('DEMO_TOKEN'));
    const doc = fromCommander(root, info);
    expect(doc.commands?.demo?.flags).toMatchObject([
      { name: 'token', alternativeSources: [{ type: '$ENV', property: 'DEMO_TOKEN' }] },
    ]);
  });

  it('appends the default value to an argument summary', () => {
    const root = new Command('demo');
    root.argument('[mode]', 'Mode', 'fast');
    const doc = fromCommander(root, info);
    expect(doc.commands?.demo?.args?.[0]).toMatchObject({ name: 'mode', summary: 'Mode Default: fast.' });
  });

  it('uses the default value as the summary when the argument has no description', () => {
    const root = new Command('demo');
    root.addArgument(new Argument('[mode]').default('fast'));
    const doc = fromCommander(root, info);
    expect(doc.commands?.demo?.args?.[0]).toMatchObject({ name: 'mode', summary: 'Default: fast.' });
  });

  it('does not mark a parent with its own flags as a group, since upstream rejects groups with flags', () => {
    const root = new Command('demo');
    const parent = root.command('parent').option('--verbose', 'Verbose');
    parent.command('child');
    const doc = fromCommander(root, info);
    expect(doc.commands?.['demo parent']?.kind).toBeUndefined();
    expect(doc.commands?.['demo parent']?.flags?.[0]?.name).toBe('verbose');
  });

  it('produces a document that passes @clidoc/core validate()', () => {
    const root = new Command('demo').description('Demo CLI');
    root.command('secret', { hidden: true }).description('Internal only');
    const build = root.command('build');
    build.summary('Build it');
    build.description('Build it from source.');
    build
      .addOption(new Option('--color', 'Use color'))
      .addOption(new Option('--no-color', 'Disable color'))
      .addOption(new Option('--token <token>', 'Token').env('DEMO_TOKEN'))
      .argument('[target]', 'Build target', 'all');
    const doc = fromCommander(root, info);
    expect(validate(doc)).toEqual({ valid: true, errors: [] });
  });
});

describe('createDocgenCommand', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'clidoc-commander-docgen-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes JSON to --output by default', async () => {
    const doc = fromCommander(new Command('demo'), info);
    const output = join(dir, 'cli.json');
    const command = createDocgenCommand(() => doc);
    await command.parseAsync(['--output', output], { from: 'user' });
    expect(JSON.parse(await readFile(output, 'utf8'))).toEqual(doc);
  });

  it('writes JSON to -o', async () => {
    const doc = fromCommander(new Command('demo'), info);
    const output = join(dir, 'cli.json');
    const command = createDocgenCommand(() => doc);
    await command.parseAsync(['-o', output], { from: 'user' });
    expect(JSON.parse(await readFile(output, 'utf8'))).toEqual(doc);
  });

  it('writes to stdout when --output is omitted', async () => {
    const doc = fromCommander(new Command('demo'), info);
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const command = createDocgenCommand(() => doc);
    await command.parseAsync([], { from: 'user' });
    expect(stdout).toHaveBeenCalledWith(`${JSON.stringify(doc, null, 2)}\n`);
    stdout.mockRestore();
  });

  it('writes Markdown when --format markdown is passed', async () => {
    const doc = fromCommander(new Command('demo'), info);
    const output = join(dir, 'cli.md');
    const command = createDocgenCommand(() => doc);
    await command.parseAsync(['--output', output, '--format', 'markdown'], { from: 'user' });
    expect(await readFile(output, 'utf8')).toContain('# Demo');
  });

  it('writes YAML when --format yaml is passed', async () => {
    const doc = fromCommander(new Command('demo'), info);
    const output = join(dir, 'cli.yaml');
    const command = createDocgenCommand(() => doc);
    await command.parseAsync(['--output', output, '--format', 'yaml'], { from: 'user' });
    expect(await readFile(output, 'utf8')).toContain('binary: demo');
  });

  it('accepts a custom command name', () => {
    const command = createDocgenCommand(() => fromCommander(new Command('demo'), info), { name: 'gen-docs' });
    expect(command.name()).toBe('gen-docs');
  });
});
