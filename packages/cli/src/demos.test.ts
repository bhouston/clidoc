import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { commandLine, extendMatchers } from 'vitest-command-line';
import { renderMarkdown, validate } from '@clidoc/core';

extendMatchers();

const root = fileURLToPath(new URL('../../../', import.meta.url));
const runners = ['commander', 'oclif', 'yargs'] as const;

beforeAll(async () => {
  for (const runner of runners) {
    const build = await commandLine({ command: ['pnpm', '--dir', resolve(root, 'demos', runner), 'build'] }).run();
    expect(build).toSucceed();
  }
}, 30_000);

describe.each(runners)('%s demo', (runner) => {
  const cli = commandLine({ command: [process.execPath, resolve(root, 'demos', runner, 'dist/index.js')] });

  it('greets in both documented languages', async () => {
    const english = await cli.run(['greet', 'Ada']);
    expect(english).toSucceed();
    expect(english).toHaveStdout(/Hello, Ada!/);
    const french = await cli.run(['greet', 'Ada', '--language', 'fr']);
    expect(french).toSucceed();
    expect(french).toHaveStdout(/Bonjour, Ada!/);
  });

  it('exports a valid OpenCLI contract for its real command', async () => {
    const result = await cli.run(['--opencli']);
    expect(result).toSucceed();
    const document = result.json();
    expect(validate(document)).toEqual({ valid: true, errors: [] });
    expect(document.info.binary).toBe('demo');
    expect(document.commands['demo greet'].summary).toBe('Greet a person');
    expect(document.commands['demo docgen'].summary).toBe('Write the OpenCLI document to a file');
  });

  it('writes the same valid OpenCLI document through docgen', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), `clidoc-${runner}-`));
    try {
      const destination = resolve(directory, 'cli.json');
      const result = await cli.run(['docgen', '--output', destination]);
      expect(result).toSucceed();
      const generated = JSON.parse(await readFile(destination, 'utf8'));
      expect(validate(generated)).toEqual({ valid: true, errors: [] });
      expect(generated.commands['demo docgen'].summary).toBe('Write the OpenCLI document to a file');
      const discovered = await cli.run(['--opencli']);
      expect(generated).toEqual(discovered.json());
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('renders the same document as Markdown through docgen', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), `clidoc-${runner}-`));
    try {
      const destination = resolve(directory, 'reference.md');
      const result = await cli.run(['docgen', '--format', 'markdown', '--output', destination]);
      expect(result).toSucceed();
      const discovered = await cli.run(['--opencli']);
      expect(await readFile(destination, 'utf8')).toBe(renderMarkdown(discovered.json()));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects unsupported docgen formats', async () => {
    const result = await cli.run(['docgen', '--format', 'html', '--output', 'reference.html']);
    expect(result).toFail();
  });
});
