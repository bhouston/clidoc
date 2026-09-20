import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { infoFromPackageJson, writeOpenCliDocument } from './docgen.js';
import { OPENCLI_VERSION, parse } from './index.js';
import type { OpenCliDocument } from './types.js';

describe('infoFromPackageJson', () => {
  it('derives binary from the package name, unscoping it', () => {
    expect(infoFromPackageJson({ name: '@acme/cli', version: '1.2.3' })).toEqual({
      title: '@acme/cli',
      binary: 'cli',
      version: '1.2.3',
    });
  });

  it('prefers a declared bin entry over the package name', () => {
    expect(infoFromPackageJson({ name: '@acme/cli', version: '1.2.3', bin: { mycli: './bin.js' } })).toEqual({
      title: '@acme/cli',
      binary: 'mycli',
      version: '1.2.3',
    });
  });

  it('carries the description over as summary', () => {
    expect(infoFromPackageJson({ name: 'cli', version: '1.0.0', description: 'Does things' })).toEqual({
      title: 'cli',
      binary: 'cli',
      version: '1.0.0',
      summary: 'Does things',
    });
  });

  it('lets overrides win over every derived field', () => {
    expect(
      infoFromPackageJson(
        { name: '@acme/cli', version: '1.2.3', description: 'Does things', bin: { mycli: './bin.js' } },
        { title: 'My CLI', binary: 'other', version: '9.9.9', summary: 'Custom summary' },
      ),
    ).toEqual({ title: 'My CLI', binary: 'other', version: '9.9.9', summary: 'Custom summary' });
  });

  it('falls back to the binary name for title when the package has none', () => {
    expect(infoFromPackageJson({ version: '1.0.0' }, { binary: 'mycli' })).toEqual({
      title: 'mycli',
      binary: 'mycli',
      version: '1.0.0',
    });
  });

  it('throws when no binary name can be derived', () => {
    expect(() => infoFromPackageJson({ version: '1.0.0' })).toThrow(/binary name/);
  });

  it('throws when no version can be derived', () => {
    expect(() => infoFromPackageJson({ name: 'cli' })).toThrow(/version/);
  });
});

describe('writeOpenCliDocument', () => {
  let dir: string;
  const document: OpenCliDocument = {
    opencliVersion: OPENCLI_VERSION,
    info: { title: 'Acme CLI', binary: 'acme', version: '1.0.0' },
    commands: { 'acme greet': { summary: 'Greet a person' } },
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'clidoc-docgen-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes JSON by default', async () => {
    const output = join(dir, 'cli.json');
    await writeOpenCliDocument(document, output);
    expect(JSON.parse(await readFile(output, 'utf8'))).toEqual(document);
  });

  it('writes rendered Markdown when asked', async () => {
    const output = join(dir, 'cli.md');
    await writeOpenCliDocument(document, output, 'markdown');
    const content = await readFile(output, 'utf8');
    expect(content).toContain('# Acme CLI');
    expect(content).toContain('## acme greet');
  });

  it('writes YAML when asked, round-tripping through parse', async () => {
    const output = join(dir, 'cli.yaml');
    await writeOpenCliDocument(document, output, 'yaml');
    const content = await readFile(output, 'utf8');
    expect(content).toContain('opencliVersion:');
    expect(content).not.toMatch(/^\{/);
    expect(parse(content)).toEqual(document);
  });

  it('writes to stdout when output is omitted', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await writeOpenCliDocument(document);
    expect(stdout).toHaveBeenCalledWith(`${JSON.stringify(document, null, 2)}\n`);
    stdout.mockRestore();
  });
});
