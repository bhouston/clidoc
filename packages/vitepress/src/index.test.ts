import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { OPENCLI_VERSION, type OpenCliDocument } from '@clidoc/core';
import { writeVitePress } from './index.js';

const directories: string[] = [];
async function site() {
  const directory = await mkdtemp(join(tmpdir(), 'clidoc-vitepress-'));
  directories.push(directory);
  return directory;
}
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});
const document: OpenCliDocument = {
  opencliVersion: OPENCLI_VERSION,
  info: { title: 'Sample CLI', binary: 'sample', version: '1.0', description: 'Literal {{ expression }}' },
  commands: { 'send <file>': { summary: 'Send a file' } },
};

it('keeps Markdown renderable with literal Vue expressions and removes only owned stale files', async () => {
  const outputDir = await site();
  await writeFile(join(outputDir, 'manual.md'), '# Keep me\n');
  const sidebar = await writeVitePress(document, { outputDir, basePath: '/cli' });
  expect(sidebar).toHaveLength(2);
  expect(sidebar[0]).toEqual({ text: 'Sample CLI', link: '/cli' });
  const landing = await readFile(join(outputDir, 'cli.md'), 'utf8');
  expect(landing).toContain('::: v-pre\n\n# Sample CLI');
  expect(landing).toContain('Literal {{ expression }}');
  expect(landing).toContain(':::');
  expect(await readdir(join(outputDir, 'cli', 'commands'))).toHaveLength(1);
  await writeVitePress({ ...document, commands: {} }, { outputDir, basePath: '/cli' });
  expect(await readdir(join(outputDir, 'cli', 'commands'))).toHaveLength(0);
  expect(await readFile(join(outputDir, 'manual.md'), 'utf8')).toBe('# Keep me\n');
});

it('rejects output traversal and supports a root landing page', async () => {
  const outputDir = await site();
  await expect(writeVitePress(document, { outputDir, basePath: '../escape' })).rejects.toThrow();
  const sidebar = await writeVitePress({ ...document, commands: {} }, { outputDir });
  expect(sidebar[0]?.link).toBe('/');
  expect(await readFile(join(outputDir, 'index.md'), 'utf8')).toContain('# Sample CLI');
});

it('rejects invalid ownership metadata and never deletes a path outside output', async () => {
  const outputDir = await site();
  await writeFile(join(outputDir, '.clidoc-generated.json'), '{}');
  await expect(writeVitePress(document, { outputDir })).rejects.toThrow('Invalid generated file manifest');
  await writeFile(join(outputDir, '.clidoc-generated.json'), JSON.stringify(['../outside.md', null, 'manual.txt']));
  await writeVitePress({ ...document, commands: {} }, { outputDir });
  expect((await readdir(outputDir)).includes('index.md')).toBe(true);
  await writeFile(join(outputDir, '.clidoc-generated.json'), JSON.stringify(['/tmp/escape.md']));
  await expect(writeVitePress({ ...document, commands: {} }, { outputDir })).rejects.toThrow(
    'escapes output directory',
  );
});

it('migrates the old manifest while keeping current and handwritten pages', async () => {
  const outputDir = await site();
  await writeFile(join(outputDir, 'stale.md'), '# Old generated page\n');
  await writeFile(join(outputDir, 'manual.md'), '# Keep me\n');
  await writeFile(
    join(outputDir, '.opencli-generated.json'),
    JSON.stringify(['stale.md', 'index.md', '../outside.md']),
  );
  await writeVitePress({ ...document, commands: {} }, { outputDir });
  const names = await readdir(outputDir);
  expect(names).not.toContain('stale.md');
  expect(names).not.toContain('.opencli-generated.json');
  expect(await readFile(join(outputDir, 'index.md'), 'utf8')).toContain('# Sample CLI');
  expect(await readFile(join(outputDir, 'manual.md'), 'utf8')).toBe('# Keep me\n');
});
