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
    (await import('./commands/completion.js')).command,
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

  it('generates self and JSON/YAML file completions and rejects invalid arguments', async () => {
    const path = await directory();
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runCli(['completion', 'bash']);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining('complete -F'));
    const input = join(path, 'cli.json');
    await writeFile(input, JSON.stringify(cliDocument()));
    const destination = join(path, 'nested', 'completion.zsh');
    await runCli(['completion', 'zsh', '--input', input, '--binary', 'renamed', '-o', destination]);
    expect(await readFile(destination, 'utf8')).toContain("'renamed'");
    const yaml = join(path, 'cli.yaml');
    await writeFile(yaml, 'opencliVersion: 1.0.0-alpha.14\ninfo: {title: Demo, binary: demo, version: "1"}\n');
    await runCli(['completion', 'fish', '-i', yaml]);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("complete -c 'demo'"));
    await expect(runCli(['completion', 'powershell'])).rejects.toThrow();
    await expect(runCli(['completion'])).rejects.toThrow();
    await expect(runCli(['completion', 'bash', '--binary', 'invalid name'])).rejects.toThrow('single executable');
    await expect(runCli(['completion', 'bash', '-i', join(path, 'missing')])).rejects.toThrow('ENOENT');
    await writeFile(input, '{}');
    await expect(runCli(['completion', 'bash', '-i', input])).rejects.toThrow('Invalid OpenCLI');
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
