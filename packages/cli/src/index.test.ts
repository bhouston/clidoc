import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validate } from '@clidoc/core';
import { runCli, cliDocument } from './index.js';
import { output } from './io.js';

// Node's external file loader cannot resolve source .js specifiers to .ts under
// Vitest. Exercise source handlers here, and real disk discovery in the process test.
vi.mock('yargs-file-commands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('yargs-file-commands')>()),
  fileCommands: async () => [
    (await import('./commands/generate.js')).command,
    (await import('./commands/markdown.js')).command,
    (await import('./commands/validate.js')).command,
    (await import('./commands/docgen.js')).command,
    (await import('./commands/convert.js')).command,
  ],
}));

const temporary: string[] = [];
async function directory() {
  const path = await mkdtemp(join(tmpdir(), 'clidoc-cli-'));
  temporary.push(path);
  return path;
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('CLI', () => {
  it('documents the exact command definitions as a valid contract', () => {
    const document = cliDocument();
    expect(validate(document)).toEqual({ valid: true, errors: [] });
    expect(Object.keys(document.commands!)).toHaveLength(5);
    expect(JSON.stringify(document)).toContain('Framework adapter');
  });

  it('validates and renders documents through file command discovery', async () => {
    const path = await directory();
    const input = join(path, 'cli.json');
    await writeFile(input, JSON.stringify(cliDocument()));
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runCli(['validate', input]);
    expect(stdout).toHaveBeenCalledWith('Valid OpenCLI document\n');
    await runCli(['markdown', input]);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining('# clidoc'));
    const destination = join(path, 'nested', 'reference.md');
    await runCli(['markdown', input, '-o', destination]);
    expect(await readFile(destination, 'utf8')).toContain('clidoc generate');
  });

  it('validates and renders an opencli-dev document while rejecting OpenCLISpec', async () => {
    const path = await directory();
    const input = join(path, 'opencli-dev.yaml');
    await writeFile(
      input,
      [
        'opencli: 0.1.0',
        'info:',
        '  title: Acme tools',
        '  binaryName: acme',
        '  version: 2.0.0',
        'commands:',
        '  - name: account',
        '    description: Manage accounts',
        '    commands:',
        '      - name: show',
        '        operationId: account_show',
        '        description: Show an account',
        '',
      ].join('\n'),
    );
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runCli(['validate', input]);
    expect(stdout).toHaveBeenCalledWith('Valid OpenCLI document\n');
    await runCli(['markdown', input]);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining('acme account show'));

    const unsupported = join(path, 'openclispec.json');
    await writeFile(unsupported, JSON.stringify({ opencli: '1.0.0', commands: { acme: {} } }));
    await expect(runCli(['validate', unsupported])).rejects.toThrow('nrranjithnr OpenCLISpec 1.0.0 is not supported');
  });

  it('generates its own OpenCLI document through docgen', async () => {
    const path = await directory();
    const destination = join(path, 'clidoc.json');
    await runCli(['docgen', '--output', destination]);
    expect(JSON.parse(await readFile(destination, 'utf8'))).toEqual(cliDocument());
    const markdown = join(path, 'clidoc.md');
    await runCli(['docgen', '--format', 'markdown', '--output', markdown]);
    expect(await readFile(markdown, 'utf8')).toContain('# clidoc');
    const yaml = join(path, 'clidoc.yaml');
    await runCli(['docgen', '--format', 'yaml', '--output', yaml]);
    expect(await readFile(yaml, 'utf8')).toContain('binary: clidoc');
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runCli(['docgen']);
    expect(stdout).toHaveBeenCalledWith(`${JSON.stringify(cliDocument(), null, 2)}\n`);
  });

  it('rejects invalid input and incorrect invocations without exiting', async () => {
    const path = await directory();
    const input = join(path, 'invalid.json');
    await writeFile(input, '{}');
    await expect(runCli(['validate', input])).rejects.toThrow('Invalid OpenCLI');
    await expect(runCli(['markdown', join(path, 'missing')])).rejects.toThrow('ENOENT');
    await expect(runCli(['unknown'])).rejects.toThrow();
    await expect(runCli([])).rejects.toThrow();
    await expect(runCli(['generate', input, '--adapter', 'missing'])).rejects.toThrow();
    await expect(runCli(['validate'])).rejects.toThrow();
  });

  it('generates from trusted Yargs and oclif modules and rejects missing exports', async () => {
    const path = await directory();
    const info = "export const info = {title:'Demo',binary:'demo',version:'1.0.0'};";
    const yargs = join(path, 'yargs.mjs');
    await writeFile(yargs, `${info} export default [{command:'greet <name>',describe:'Greet a person'}];`);
    const destination = join(path, 'spec.json');
    await runCli(['generate', yargs, '--adapter', 'yargs', '-o', destination]);
    expect(validate(JSON.parse(await readFile(destination, 'utf8'))).valid).toBe(true);
    const oclif = join(path, 'oclif.mjs');
    await writeFile(oclif, `${info} export default {commands:{greet:{id:'greet',description:'Greet'}}};`);
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runCli(['generate', oclif, '--adapter', 'oclif']);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining('demo greet'));
    const empty = join(path, 'empty.mjs');
    await writeFile(empty, 'export default [];');
    await expect(runCli(['generate', empty, '--adapter', 'yargs'])).rejects.toThrow('must export');
    const missing = join(path, 'missing.mjs');
    await writeFile(missing, info);
    await expect(runCli(['generate', missing, '--adapter', 'yargs'])).rejects.toThrow('must export');
  });

  it('generates from a Commander command object', async () => {
    const path = await directory();
    const source = join(path, 'commander.mjs');
    // Resolve through the adapter package so this fixture uses its real peer dependency.
    const { createRequire } = await import('node:module');
    const { pathToFileURL } = await import('node:url');
    const require = createRequire(new URL('../../adapter-commander/package.json', import.meta.url));
    const commanderUrl = pathToFileURL(require.resolve('commander')).href;
    await writeFile(
      source,
      `import {Command} from ${JSON.stringify(commanderUrl)}; export const info={title:'Demo',binary:'demo',version:'1'}; export default new Command('demo').description('A demo');`,
    );
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runCli(['generate', source, '--adapter', 'commander']);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining('A demo'));
  });

  it('converts explicitly to opencli-dev while retaining the bcdxn default', async () => {
    const path = await directory();
    const input = join(path, 'source.json');
    const source = {
      opencliVersion: '1.0.0-alpha.14',
      info: { title: 'Tool', binary: 'tool', version: '1' },
      commands: { 'tool run': { summary: 'Run', args: [{ name: 'TARGET', type: 'string', required: true }] } },
    };
    await writeFile(input, JSON.stringify(source));
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runCli(['convert', input]);
    expect(stdout).toHaveBeenLastCalledWith(JSON.stringify(source, null, 2) + '\n');
    const target = join(path, 'nested', 'converted.yaml');
    await runCli(['convert', input, '--to', 'opencli-dev', '--format', 'yaml', '-o', target]);
    const converted = await readFile(target, 'utf8');
    expect(converted).toContain('opencli: 0.1.0');
    expect(converted).toContain('operationId:');
    await runCli(['validate', target]);
    await expect(runCli(['convert', target, '--to', 'missing'])).rejects.toThrow();
    await expect(runCli(['convert', target, '--format', 'markdown'])).rejects.toThrow();
  });

  it('keeps lossy diagnostics off stdout and leaves files untouched on failure', async () => {
    const path = await directory();
    const input = join(path, 'new.json');
    const destination = join(path, 'existing.json');
    await writeFile(
      input,
      JSON.stringify({
        opencli: '0.1.0',
        commands: [{ name: 'run', operationId: 'run', output: { formats: [{ format: 'text' }] } }],
      }),
    );
    await writeFile(destination, 'keep me');
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const metadata = ['--title', 'Tool', '--binary', 'tool', '--cli-version', '1'];
    await expect(runCli(['convert', input, ...metadata, '-o', destination])).rejects.toThrow();
    expect(await readFile(destination, 'utf8')).toBe('keep me');
    expect(stdout).not.toHaveBeenCalled();
    await runCli(['convert', input, ...metadata, '--allow-lossy']);
    const emitted = JSON.parse(String(stdout.mock.calls.at(-1)![0]));
    expect(emitted.opencliVersion).toBe('1.0.0-alpha.14');
    expect(emitted.info).toMatchObject({ title: 'Tool', binary: 'tool', version: '1' });
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Conversion loss'));
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('output'));
    await expect(runCli(['convert', input, '--allow-lossy'])).rejects.toThrow();
  });

  it('writes directly to stdout when no output path is set', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await output('hello');
    expect(stdout).toHaveBeenCalledWith('hello');
  });

  it('discovers built command files in a real Node process', async () => {
    const { execFileSync, spawnSync } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const executable = fileURLToPath(new URL('../dist/bin.js', import.meta.url));
    expect(execFileSync(process.execPath, [executable, '--help'], { encoding: 'utf8' })).toContain('generate');
    const path = await directory();
    const input = join(path, 'cli.json');
    await writeFile(input, JSON.stringify(cliDocument()));
    expect(execFileSync(process.execPath, [executable, 'validate', input], { encoding: 'utf8' })).toContain(
      'Valid OpenCLI',
    );
    const invalid = spawnSync(process.execPath, [executable, 'missing'], { encoding: 'utf8' });
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain('Unknown');
    expect(execFileSync(process.execPath, [executable, '--version'], { encoding: 'utf8' }).trim()).toBe(
      cliDocument().info.version,
    );
    expect(JSON.parse(execFileSync(process.execPath, [executable, '__opencli'], { encoding: 'utf8' }))).toEqual(
      cliDocument(),
    );
  });
});
