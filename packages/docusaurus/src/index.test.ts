import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { OPENCLI_VERSION, type OpenCliDocument } from '@clidoc/core';
import clidocPlugin, { writeDocusaurus } from './index.js';

const directories: string[] = [];
async function site() {
  const directory = await mkdtemp(join(tmpdir(), 'clidoc-docusaurus-'));
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
  const generated = names.filter((name) => name.startsWith('clidoc-'));
  expect(generated).toHaveLength(2);
  const contents = await Promise.all(
    generated.map(async (name) => [name, await readFile(join(outputDir, name), 'utf8')] as const),
  );
  const [landingName, landing] = contents.find(([, text]) => text.includes('id: "index"'))!;
  const [commandName] = contents.find(([name]) => name !== landingName)!;
  expect(landing).toContain('mdx:\n  format: md');
  expect(contents.map(([, text]) => text).join('\n')).toContain('slug: "/docs/cli"');
  // The landing page links to the command page's generated filename, not its route, so Docusaurus
  // resolves the URL itself regardless of routeBasePath.
  expect(landing).toContain(`](./${commandName})`);
  expect(landing).not.toContain('/docs/cli/commands/');
  await writeDocusaurus({ ...document, commands: {} }, { outputDir, basePath: '/docs/cli' });
  expect((await readdir(outputDir)).filter((name) => name.startsWith('clidoc-'))).toHaveLength(1);
  expect(await readFile(join(outputDir, 'manual.md'), 'utf8')).toBe('# Keep me\n');
});

it('loads a file relative to siteDir and writes generated docs before content loading', async () => {
  const siteDir = await site();
  await writeFile(join(siteDir, 'input.json'), JSON.stringify(document));
  const plugin = await clidocPlugin({ siteDir }, { input: 'input.json', outputDir: 'generated' });
  expect(plugin.name).toBe('clidoc-docusaurus');
  expect((await readdir(join(siteDir, 'generated'))).filter((name) => name.startsWith('clidoc-'))).toHaveLength(2);
  await expect(clidocPlugin({ siteDir }, { input: 'missing.json', outputDir: 'generated' })).rejects.toThrow();
  await clidocPlugin({ siteDir }, { input: document, outputDir: 'generated' });
  expect((await readdir(join(siteDir, 'generated'))).filter((name) => name.startsWith('clidoc-'))).toHaveLength(2);
});

it('writes every colliding command to a distinct generated file and slug', async () => {
  const outputDir = await site();
  const collision: OpenCliDocument = {
    ...document,
    commands: {
      'sample foo bar': { summary: 'unique space summary' },
      'sample foo-bar': { summary: 'unique hyphen summary' },
      'sample foo-bar-3dad685f': { summary: 'unique hash summary' },
      [`sample ${'very-long-command-'.repeat(30)}!`]: { summary: 'unique length summary' },
    },
  };
  const sidebar = await writeDocusaurus(collision, { outputDir });
  expect(new Set(sidebar.map((entry) => entry.id)).size).toBe(5);
  const files = (await readdir(outputDir)).filter((name) => name.startsWith('clidoc-'));
  expect(files).toHaveLength(5);
  const contents = await Promise.all(files.map((name) => readFile(join(outputDir, name), 'utf8')));
  for (const summary of [
    'unique space summary',
    'unique hyphen summary',
    'unique hash summary',
    'unique length summary',
  ])
    expect(contents.filter((content) => content.includes(summary))).toHaveLength(1);
});

it('rejects an invalid manifest and ignores unowned entries', async () => {
  const outputDir = await site();
  await writeFile(join(outputDir, '.clidoc-generated.json'), '{}');
  await expect(writeDocusaurus(document, { outputDir })).rejects.toThrow('Invalid generated file manifest');
  await writeFile(join(outputDir, '.clidoc-generated.json'), JSON.stringify(['../manual.md', null, 'manual.md']));
  await writeFile(join(outputDir, 'manual.md'), '# Keep me\n');
  await writeDocusaurus(document, { outputDir });
  expect(await readFile(join(outputDir, 'manual.md'), 'utf8')).toBe('# Keep me\n');
});

it('removes only legacy generated pages named by the old manifest', async () => {
  const outputDir = await site();
  const oldPage = 'opencli-0123456789abcdef0123.md';
  await writeFile(join(outputDir, oldPage), '# Old generated page\n');
  await writeFile(join(outputDir, 'opencli-manual.md'), '# Keep me\n');
  await writeFile(
    join(outputDir, '.opencli-generated.json'),
    JSON.stringify([oldPage, 'opencli-manual.md', '../outside.md']),
  );
  await writeDocusaurus(document, { outputDir });
  const names = await readdir(outputDir);
  expect(names).not.toContain(oldPage);
  expect(names).not.toContain('.opencli-generated.json');
  expect(await readFile(join(outputDir, 'opencli-manual.md'), 'utf8')).toBe('# Keep me\n');
});
