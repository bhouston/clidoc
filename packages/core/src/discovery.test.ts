import { describe, expect, it, vi } from 'vitest';
import { handleOpenCliRequest, OPENCLI_DISCOVERY_COMMAND, OPENCLI_DISCOVERY_FLAG } from './discovery.js';
import type { OpenCliDocument } from './types.js';

const doc: OpenCliDocument = {
  opencliVersion: '1.0.0-alpha.14',
  info: { title: 'demo', binary: 'demo', version: '0.0.0' },
};

describe('handleOpenCliRequest', () => {
  it('writes the document for the __opencli subcommand and returns true', () => {
    const write = vi.fn();
    expect(handleOpenCliRequest([OPENCLI_DISCOVERY_COMMAND], () => doc, write)).toBe(true);
    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith(`${JSON.stringify(doc, null, 2)}\n`);
  });

  it('writes the document for the --opencli flag alias and returns true', () => {
    const write = vi.fn();
    expect(handleOpenCliRequest([OPENCLI_DISCOVERY_FLAG], () => doc, write)).toBe(true);
    expect(write).toHaveBeenCalledWith(`${JSON.stringify(doc, null, 2)}\n`);
  });

  it('returns false and writes nothing for unrelated argv', () => {
    const write = vi.fn();
    expect(handleOpenCliRequest(['greet', 'Ada'], () => doc, write)).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it('returns false when __opencli has trailing arguments', () => {
    const write = vi.fn();
    expect(handleOpenCliRequest([OPENCLI_DISCOVERY_COMMAND, 'extra'], () => doc, write)).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it('returns false for empty argv', () => {
    const write = vi.fn();
    expect(handleOpenCliRequest([], () => doc, write)).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it('defaults to writing to process.stdout', () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    expect(handleOpenCliRequest([OPENCLI_DISCOVERY_COMMAND], () => doc)).toBe(true);
    expect(stdout).toHaveBeenCalledWith(`${JSON.stringify(doc, null, 2)}\n`);
    stdout.mockRestore();
  });
});
