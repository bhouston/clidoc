import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { OPENCLI_VERSION, type OpenCliDevDocument, type OpenCliDocument } from '@clidoc/core';
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
const devDocument: OpenCliDevDocument = {
  opencli: '0.1.0',
  info: { title: 'Acme tools', binaryName: 'acme', version: '2.0.0' },
  commands: [
    {
      name: 'account',
      description: 'Manage accounts',
      commands: [{ name: 'show', operationId: 'account_show', description: 'Show an account' }],
    },
  ],
};

it('writes linked pages for nested opencli-dev commands', async () => {
  const outputDir = await site();
  const sidebar = await writeVitePress(devDocument, { outputDir, basePath: '/cli' });
  expect(sidebar.map(({ text }) => text)).toEqual(['Acme tools', 'acme account', 'acme account show']);
  for (const entry of sidebar) {
    const filename = join(outputDir, `${entry.link.replace(/^\//, '')}.md`);
    expect(await readFile(filename, 'utf8')).toContain(entry.text);
  }
  const landing = await readFile(join(outputDir, 'cli.md'), 'utf8');
  const nested = sidebar.find(({ text }) => text === 'acme account show')!;
  expect(landing).toContain(`](${nested.link})`);
  expect(await readFile(join(outputDir, `${nested.link.replace(/^\//, '')}.md`), 'utf8')).toContain('Show an account');
});

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

it('writes every colliding command to a distinct page', async () => {
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
  const sidebar = await writeVitePress(collision, { outputDir });
  expect(new Set(sidebar.map((entry) => entry.link)).size).toBe(5);
  const files = await readdir(join(outputDir, 'commands'));
  expect(files).toHaveLength(4);
  const contents = await Promise.all(files.map((name) => readFile(join(outputDir, 'commands', name), 'utf8')));
  for (const summary of [
    'unique space summary',
    'unique hyphen summary',
    'unique hash summary',
    'unique length summary',
  ])
    expect(contents.filter((content) => content.includes(summary))).toHaveLength(1);
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

it('escapes angle brackets outside code so an unbalanced tag cannot break the VitePress build', async () => {
  const outputDir = await site();
  const doc: OpenCliDocument = {
    ...document,
    commands: {
      send: {
        summary: 'Has {curly} and <angle> and {{mustache}}.',
        examples: [{ content: 'echo <not-a-tag>' }],
      },
    },
  };
  await writeVitePress(doc, { outputDir, basePath: '/cli' });
  const files = await readdir(join(outputDir, 'cli', 'commands'));
  const page = await readFile(join(outputDir, 'cli', 'commands', files[0]!), 'utf8');
  // Prose keeps angle brackets escaped so Vue's SFC parser never sees a "tag".
  expect(page).toContain('&lt;angle&gt;');
  expect(page).not.toMatch(/[^&]<angle>/);
  // Mustaches stay literal for v-pre.
  expect(page).toContain('{{mustache}}');
  // Fenced example code keeps its angle brackets literal.
  expect(page).toContain('echo <not-a-tag>');
});

it('keeps angle brackets literal inside inline code spans', async () => {
  const outputDir = await site();
  const doc: OpenCliDocument = {
    ...document,
    info: { ...document.info, description: 'Use `<profile>` for the flag value.' },
  };
  const sidebar = await writeVitePress(doc, { outputDir, basePath: '/cli' });
  const landing = await readFile(join(outputDir, sidebar[0]!.link.replace(/^\//, '') + '.md'), 'utf8');
  expect(landing).toContain('`<profile>`');
});

it('keeps shorter and mismatched delimiters inside a generated example fence', async () => {
  const outputDir = await site();
  const doc: OpenCliDocument = {
    ...document,
    commands: {
      send: {
        summary: 'Before <prose>',
        examples: [{ content: 'echo <code>\n```\n~~~\n```` trailing <code>\necho <more-code>' }],
        description: 'Description <prose>',
      },
    },
  };
  await writeVitePress(doc, { outputDir, basePath: '/cli' });
  const [name] = await readdir(join(outputDir, 'cli', 'commands'));
  const page = await readFile(join(outputDir, 'cli', 'commands', name!), 'utf8');
  expect(page).toContain('Before &lt;prose&gt;');
  expect(page).toContain('Description &lt;prose&gt;');
  expect(page).toContain('`````sh\necho <code>\n```\n~~~\n```` trailing <code>\necho <more-code>\n`````');
});

it.each(['`', '~'])('closes %s fences only on matching, sufficiently long delimiter lines', async (character) => {
  const outputDir = await site();
  const other = character === '`' ? '~' : '`';
  const description = [
    `${character.repeat(4)}lang`,
    'inside <code>',
    `${character.repeat(3)}`,
    'after short <code>',
    `${other.repeat(4)}`,
    'after other <code>',
    `${character.repeat(4)} trailing`,
    'after invalid close <code>',
    `   ${character.repeat(5)}  `,
    'following <prose>',
  ].join('\n');
  await writeVitePress({ ...document, info: { ...document.info, description } }, { outputDir });
  const page = await readFile(join(outputDir, 'index.md'), 'utf8');
  expect(page).toContain('inside <code>');
  expect(page).toContain('after short <code>');
  expect(page).toContain('after other <code>');
  expect(page).toContain('after invalid close <code>');
  expect(page).toContain('following &lt;prose&gt;');
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
