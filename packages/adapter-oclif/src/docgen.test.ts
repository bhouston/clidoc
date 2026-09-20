import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocgenCommand } from './docgen.js';

const info = { title: 'Demo', binary: 'demo', version: '1.0.0' };

describe('createDocgenCommand', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'clidoc-oclif-docgen-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes JSON to --output by default', async () => {
    const Docgen = createDocgenCommand(() => ({ manifest: { commands: { greet: { description: 'Greet' } } }, info }));
    const output = join(dir, 'cli.json');
    await Docgen.run(['--output', output]);
    const written = JSON.parse(await readFile(output, 'utf8'));
    expect(written.commands['demo greet']).toEqual({ summary: 'Greet' });
  });

  it('writes Markdown when --format markdown is passed', async () => {
    const Docgen = createDocgenCommand(() => ({ manifest: { commands: {} }, info }));
    const output = join(dir, 'cli.md');
    await Docgen.run(['--output', output, '--format', 'markdown']);
    expect(await readFile(output, 'utf8')).toContain('# Demo');
  });

  it('accepts a custom description', () => {
    const Docgen = createDocgenCommand(() => ({ manifest: { commands: {} }, info }), { description: 'Custom' });
    expect(Docgen.description).toBe('Custom');
  });

  it('writes JSON to -o', async () => {
    const Docgen = createDocgenCommand(() => ({ manifest: { commands: {} }, info }));
    const output = join(dir, 'cli.json');
    await Docgen.run(['-o', output]);
    expect(JSON.parse(await readFile(output, 'utf8'))).toMatchObject({ info });
  });

  it('writes to stdout when --output is omitted', async () => {
    const Docgen = createDocgenCommand(() => ({ manifest: { commands: {} }, info }));
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await Docgen.run([]);
    expect(stdout).toHaveBeenCalled();
    stdout.mockRestore();
  });
});
