import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { OPENCLI_VERSION, type OpenCliDocument } from '@opencli/core';
import opencliPlugin, { writeDocusaurus } from './index.js';

const directories: string[] = [];
async function site() {
  const directory = await mkdtemp(join(tmpdir(), 'opencli-docusaurus-'));
  directories.push(directory);
  return directory;
}
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});
const document: OpenCliDocument = {
  opencliVersion: OPENCLI_VERSION,
  info: { title: 'Sample CLI', binary: 'sample', version: '1.0' },
  commands: { 'send <file>': { summary: 'Send a file' } },
};

it('writes CommonMark pages with stable sidebar entries, then removes only stale generated pages', async () => {
  const outputDir = await site();
  await writeFile(join(outputDir, 'manual.md'), '# Keep me\n');
  const sidebar = await writeDocusaurus(document, { outputDir, basePath: '/docs/cli' });
  expect(sidebar).toHaveLength(2);
  expect(sidebar[0]).toEqual({ type: 'doc', id: 'index', label: 'Sample CLI' });
  const names = await readdir(outputDir);
  const generated = names.filter((name) => name.startsWith('opencli-'));
  expect(generated).toHaveLength(2);
  const landing = await readFile(join(outputDir, generated[0]!), 'utf8');
  expect(landing).toContain('mdx:\n  format: md');
  expect((await Promise.all(generated.map((name) => readFile(join(outputDir, name), 'utf8')))).join('\n')).toContain(
    'slug: "/docs/cli"',
  );
  await writeDocusaurus({ ...document, commands: {} }, { outputDir, basePath: '/docs/cli' });
  expect((await readdir(outputDir)).filter((name) => name.startsWith('opencli-'))).toHaveLength(1);
  expect(await readFile(join(outputDir, 'manual.md'), 'utf8')).toBe('# Keep me\n');
});

it('loads a file relative to siteDir and exposes navigation through the plugin lifecycle', async () => {
  const siteDir = await site();
  await writeFile(join(siteDir, 'input.json'), JSON.stringify(document));
  const plugin = await opencliPlugin({ siteDir }, { input: 'input.json', outputDir: 'generated' });
  expect(plugin.name).toBe('opencli-docusaurus');
  expect(plugin.loadContent()).toHaveLength(2);
  await expect(opencliPlugin({ siteDir }, { input: 'missing.json', outputDir: 'generated' })).rejects.toThrow();
  expect((await opencliPlugin({ siteDir }, { input: document, outputDir: 'generated' })).loadContent()).toHaveLength(2);
});

it('rejects an invalid manifest and ignores unowned entries', async () => {
  const outputDir = await site();
  await writeFile(join(outputDir, '.opencli-generated.json'), '{}');
  await expect(writeDocusaurus(document, { outputDir })).rejects.toThrow('Invalid generated file manifest');
  await writeFile(join(outputDir, '.opencli-generated.json'), JSON.stringify(['../manual.md', null, 'manual.md']));
  await writeFile(join(outputDir, 'manual.md'), '# Keep me\n');
  await writeDocusaurus(document, { outputDir });
  expect(await readFile(join(outputDir, 'manual.md'), 'utf8')).toBe('# Keep me\n');
});
