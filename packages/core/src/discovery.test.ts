import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleOpenCliRequest, OPENCLI_DISCOVERY_COMMAND } from './discovery.js';
import type { OpenCliDocument } from './types.js';

const doc: OpenCliDocument = {
  opencliVersion: '1.0.0-alpha.14',
  info: { title: 'demo', binary: 'demo', version: '0.0.0' },
};

describe('handleOpenCliRequest', () => {
  it('writes the document for the __opencli subcommand and returns true', async () => {
    const write = vi.fn();
    expect(await handleOpenCliRequest([OPENCLI_DISCOVERY_COMMAND], () => doc, write)).toBe(true);
    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith(`${JSON.stringify(doc, null, 2)}\n`);
  });

  it('returns false and writes nothing for unrelated argv', async () => {
    const write = vi.fn();
    expect(await handleOpenCliRequest(['greet', 'Ada'], () => doc, write)).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it('returns false for the removed --opencli flag alias', async () => {
    const write = vi.fn();
    expect(await handleOpenCliRequest(['--opencli'], () => doc, write)).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it('returns false when __opencli has unrecognized trailing arguments', async () => {
    const write = vi.fn();
    expect(await handleOpenCliRequest([OPENCLI_DISCOVERY_COMMAND, 'extra'], () => doc, write)).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it('returns false for empty argv', async () => {
    const write = vi.fn();
    expect(await handleOpenCliRequest([], () => doc, write)).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it('defaults to writing to process.stdout', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    expect(await handleOpenCliRequest([OPENCLI_DISCOVERY_COMMAND], () => doc)).toBe(true);
    expect(stdout).toHaveBeenCalledWith(`${JSON.stringify(doc, null, 2)}\n`);
    stdout.mockRestore();
  });

  describe('-o/--out <file>', () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'clidoc-discovery-'));
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it('writes to the file given via --out', async () => {
      const file = join(dir, 'cli.json');
      const write = vi.fn();
      expect(await handleOpenCliRequest([OPENCLI_DISCOVERY_COMMAND, '--out', file], () => doc, write)).toBe(true);
      expect(write).not.toHaveBeenCalled();
      expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(doc);
    });

    it('writes to the file given via -o', async () => {
      const file = join(dir, 'cli.json');
      expect(await handleOpenCliRequest([OPENCLI_DISCOVERY_COMMAND, '-o', file], () => doc)).toBe(true);
      expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(doc);
    });

    it('writes to the file given via --out=<file>', async () => {
      const file = join(dir, 'cli.json');
      expect(await handleOpenCliRequest([OPENCLI_DISCOVERY_COMMAND, `--out=${file}`], () => doc)).toBe(true);
      expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(doc);
    });

    it('returns false for an unrecognized flag', async () => {
      const write = vi.fn();
      expect(await handleOpenCliRequest([OPENCLI_DISCOVERY_COMMAND, '--format', 'json'], () => doc, write)).toBe(false);
      expect(write).not.toHaveBeenCalled();
    });
  });
});
