import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';
import { commandLine, extendMatchers } from 'vitest-command-line';

extendMatchers();

const cli = commandLine({ command: [process.execPath, fileURLToPath(new URL('../dist/bin.js', import.meta.url))] });
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

it('exposes all commands from the installed CLI entry point', async () => {
  const result = await cli.run(['--help']);
  expect(result).toSucceed();
  expect(result).toHaveStdout(/generate/);
  expect(result).toHaveStdout(/markdown/);
  expect(result).toHaveStdout(/validate/);
  expect(result).toHaveStdout(/convert/);
});

it('generates, validates, and renders a document through real subprocesses', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'clidoc-process-'));
  directories.push(directory);
  const source = join(directory, 'commands.mjs');
  const document = join(directory, 'cli.json');
  const markdown = join(directory, 'cli.md');
  await writeFile(
    source,
    "export const info={title:'Example',binary:'example',version:'1.0.0'}; export default [{command:'greet <name>',describe:'Greet a person'}];",
  );

  expect(await cli.run(['generate', source, '--adapter', 'yargs', '--output', document])).toSucceed();
  const generated = JSON.parse(await readFile(document, 'utf8'));
  expect(generated.info.binary).toBe('example');
  expect(generated.commands['example greet'].summary).toBe('Greet a person');

  const validated = await cli.run(['validate', document]);
  expect(validated).toSucceed();
  expect(validated).toHaveStdout(/Valid OpenCLI document/);

  expect(await cli.run(['markdown', document, '--output', markdown])).toSucceed();
  expect(await readFile(markdown, 'utf8')).toContain('## example greet');
});

it('returns useful failures for malformed input and unknown commands', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'clidoc-errors-'));
  directories.push(directory);
  const source = join(directory, 'invalid.json');
  await writeFile(source, '{}');
  const invalid = await cli.run(['validate', source]);
  expect(invalid).toFail();
  expect(invalid).toHaveStderr(/Invalid OpenCLI document/);
  const unknown = await cli.run(['unknown']);
  expect(unknown).toFail();
  expect(unknown).toHaveStderr(/Unknown/);
});

it('converts via the installed entry point with bcdxn as default and errors on stderr', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'clidoc-convert-'));
  directories.push(directory);
  const input = join(directory, 'dev.json');
  const output = join(directory, 'bcdxn.json');
  await writeFile(
    input,
    JSON.stringify({
      opencli: '0.1.0',
      info: { title: 'Tool', binaryName: 'tool', version: '1' },
      commands: [{ name: 'run', operationId: 'run' }],
    }),
  );
  const strict = await cli.run(['convert', input, '-o', output]);
  expect(strict).toFail();
  expect(strict).toHaveStderr(/operationId/);
  await expect(readFile(output)).rejects.toThrow();
  const converted = await cli.run(['convert', input, '--allow-lossy', '-o', output]);
  expect(converted).toSucceed();
  expect(converted).toHaveStderr(/Conversion loss/);
  expect(JSON.parse(await readFile(output, 'utf8')).opencliVersion).toBe('1.0.0-alpha.14');
  expect(await cli.run(['validate', output])).toSucceed();
  const reverse = await cli.run(['convert', output, '--to', 'opencli-dev']);
  expect(reverse).toSucceed();
  expect(reverse).toHaveStdout(/"opencli": "0.1.0"/);
});
