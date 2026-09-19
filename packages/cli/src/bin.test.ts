import { afterEach, expect, it, vi } from 'vitest';

const document = { opencliVersion: '1.0.0-alpha.14', info: { title: 'clidoc', binary: 'clidoc', version: '0.0.0' } };
vi.mock('./index.js', () => ({ runCli: vi.fn(), cliDocument: vi.fn(() => document) }));
import { runCli } from './index.js';

afterEach(() => {
  process.exitCode = 0;
  process.argv = process.argv.slice(0, 2);
  vi.restoreAllMocks();
});

it('runs the entry point', async () => {
  vi.resetModules();
  vi.mocked(runCli).mockResolvedValue(undefined);
  await import('./bin.js');
  expect(runCli).toHaveBeenCalled();
});

it.each([new Error('invalid'), 'invalid'])('reports failures and sets an exit status: %s', async (error) => {
  vi.resetModules();
  vi.mocked(runCli).mockRejectedValue(error);
  const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
  await import('./bin.js');
  expect(process.exitCode).toBe(1);
  expect(stderr).toHaveBeenCalledWith('invalid');
});

it('answers __opencli discovery requests without invoking runCli', async () => {
  vi.resetModules();
  vi.mocked(runCli).mockClear();
  process.argv = [...process.argv.slice(0, 2), '__opencli'];
  const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  await import('./bin.js');
  expect(stdout).toHaveBeenCalledWith(`${JSON.stringify(document, null, 2)}\n`);
  expect(runCli).not.toHaveBeenCalled();
});
