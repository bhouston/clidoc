import { afterEach, expect, it, vi } from 'vitest';

vi.mock('./index.js', () => ({ runCli: vi.fn() }));
import { runCli } from './index.js';

afterEach(() => {
  process.exitCode = 0;
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
