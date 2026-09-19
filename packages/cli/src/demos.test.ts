import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { commandLine, extendMatchers } from 'vitest-command-line';
import { validate } from '@clidoc/core';

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
    const result = await cli.run(['--clidoc']);
    expect(result).toSucceed();
    const document = result.json();
    expect(validate(document)).toEqual({ valid: true, errors: [] });
    expect(document.info.binary).toBe('demo');
    expect(document.commands['demo greet'].summary).toBe('Greet a person');
  });
});
