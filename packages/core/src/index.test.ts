import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generatePages, OPENCLI_VERSION, openCliSchema, parse, renderMarkdown, validate } from './index.js';
import type { OpenCliDocument } from './types.js';

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../../../upstream/opencli/examples/${name}`, import.meta.url)), 'utf8');
const doc: OpenCliDocument = {
  opencliVersion: OPENCLI_VERSION,
  info: { title: 'Acme | CLI', binary: 'acme', version: '2.0', summary: 'Useful **commands**' },
  global: { flags: [{ name: 'verbose', type: 'boolean' }] },
  commands: {
    'acme run': {
      summary: 'Run now',
      args: [{ name: 'file', required: true }],
      flags: [
        { name: 'force', type: 'boolean' },
        { name: 'secret', type: 'string', hidden: true },
      ],
      exitCodes: [{ code: 0, status: 'OK', summary: 'Completed' }],
      examples: [{ title: 'Basic', content: 'acme run file' }],
    },
    'acme hidden': { hidden: true },
  },
};

describe('OpenCLI schema', () => {
  it('bundles the pinned schema unchanged', () => {
    const upstream = JSON.parse(
      readFileSync(fileURLToPath(new URL('../../../upstream/opencli/spec.schema.json', import.meta.url)), 'utf8'),
    );
    expect(openCliSchema).toEqual(upstream);
  });
  it('validates upstream examples', () => {
    for (const name of ['petstore-cli.ocs.json', 'petstore-cli.ocs.yaml', 'pleasantries-cli.ocs.yaml']) {
      expect(validate(parse(fixture(name))).valid).toBe(true);
    }
  });
  it('rejects schema violations with paths', () => {
    expect(() => parse(fixture('tea.ocs.yaml'))).toThrow(/global\/config/);
    expect(
      validate({ ...doc, info: { ...doc.info, binary: 42 } }).errors.some((error) => error.includes('/info/binary')),
    ).toBe(true);
    expect(validate({ ...doc, opencliVersion: 'wrong' }).valid).toBe(false);
    expect(() => parse('opencliVersion: [')).toThrow(/YAML/);
    expect(() => parse('{}')).toThrow(/OpenCLI document/);
    expect(() => renderMarkdown({} as OpenCliDocument)).toThrow(/OpenCLI document/);
    expect(() => generatePages({} as OpenCliDocument)).toThrow(/OpenCLI document/);
  });
});

describe('rendering', () => {
  it('sorts commands and chooses a safe fence for examples containing backticks', () => {
    const document: OpenCliDocument = {
      ...doc,
      commands: {
        'acme zulu': { examples: [{ content: 'echo ```nested```' }] },
        'acme alpha': { summary: 'First command' },
      },
    };
    const markdown = renderMarkdown(document);
    expect(markdown.indexOf('## acme alpha')).toBeLessThan(markdown.indexOf('## acme zulu'));
    expect(markdown).toContain('````sh\necho ```nested```\n````');
    const pages = generatePages(document);
    expect(pages.slice(1).map((page) => page.title)).toEqual(['acme alpha', 'acme zulu']);
    expect(pages[2]?.content).toContain('````sh');
  });
  it('renders content, global and command details in Markdown', () => {
    const rendered = renderMarkdown(doc);
    expect(rendered).toContain('# Acme | CLI');
    expect(rendered).toContain('Useful **commands**');
    expect(rendered).toContain('## Global flags');
    expect(rendered).toContain('## acme run');
    expect(rendered).toContain('acme run file');
    expect(rendered).not.toContain('acme hidden');
    expect(rendered).not.toContain('secret');
  });
  it('generates deterministic paths and navigation', () => {
    const pages = generatePages(doc, { basePath: '/docs/cli/' });
    expect(pages.map((page) => page.path)).toEqual(['/docs/cli', '/docs/cli/commands/acme-run-df5b3682']);
    expect(pages[0]?.content).toContain('](/docs/cli/commands/acme-run-df5b3682)');
    expect(pages[0]?.content).toContain('## Global flags');
    expect(generatePages(doc)).toEqual(generatePages(doc));
  });
});

describe('optional document sections', () => {
  it('renders installation methods, aliases, choices, defaults, and examples with backticks', () => {
    const rich: OpenCliDocument = {
      opencliVersion: OPENCLI_VERSION,
      info: { title: 'Rich', binary: 'rich', version: '1', description: 'Long description' },
      install: [
        { name: 'npm', command: 'npm i rich', description: 'Install it' },
        { name: 'source', url: 'https://example.com' },
      ],
      global: { exitCodes: [{ code: 1, status: 'BAD_USER_INPUT_ERROR', summary: 'Bad' }] },
      commands: {
        'rich build': {
          kind: 'group',
          description: 'Build things',
          aliases: ['b'],
          args: [
            {
              name: 'files',
              type: 'string',
              variadic: true,
              minItems: 1,
              maxItems: 3,
              choices: [{ value: 'one' }],
              description: 'Input|files',
            },
          ],
          flags: [
            {
              name: 'mode',
              type: 'string',
              aliases: ['m'],
              choices: [{ value: 'safe' }],
              default: 'safe',
              required: true,
            },
          ],
          examples: [{ content: 'rich build `file`' }],
        },
      },
    };
    const markdown = renderMarkdown(rich);
    expect(markdown).toContain('## Installation');
    expect(markdown).toContain('https://example.com');
    expect(markdown).toContain('## Global exit codes');
    expect(markdown).toContain('Command group');
    expect(markdown).toContain('Aliases:');
    expect(markdown).toContain('Variadic (min 1) (max 3)');
    expect(markdown).toContain('Choices: one');
    expect(markdown).toContain('Default:');
    expect(markdown).toContain('Input\\|files');
    expect(markdown).toContain('```sh');
    expect(generatePages(rich, { basePath: 'guide' })[0]?.path).toBe('/guide');
    const landing = generatePages(rich)[0]?.content;
    expect(landing).toContain('## Installation');
    expect(landing).toContain('## Global exit codes');
  });
  it('keeps paths safe for hostile names and rejects traversal base paths', () => {
    const special: OpenCliDocument = { ...doc, commands: { '../foo': {}, '..\\foo': {}, '☃': {}, FOO: {} } };
    const pages = generatePages(special);
    expect(new Set(pages.map((page) => page.path)).size).toBe(pages.length);
    expect(pages.slice(1).every((page) => /^\/commands\/[a-z0-9-]+$/.test(page.path))).toBe(true);
    expect(() => generatePages(special, { basePath: '/docs/../out' })).toThrow(/basePath/);
    expect(() => generatePages(special, { basePath: '/docs/%2e%2e/out' })).toThrow(/basePath/);
  });
});

describe('minimal optional branches', () => {
  it('renders minimal documents and optional fallbacks', () => {
    const minimal: OpenCliDocument = {
      opencliVersion: OPENCLI_VERSION,
      info: { title: 'Minimal', binary: 'min', version: '1' },
    };
    expect(renderMarkdown(minimal)).toBe('# Minimal\n\nBinary: `min` · Version: `1`\n');
    expect(generatePages(minimal)[0]?.content).not.toContain('Commands');
    const sparse: OpenCliDocument = {
      ...minimal,
      install: [{ name: 'source', url: 'https://example.com' }],
      commands: {
        min: {
          args: [{ name: 'values', variadic: true }],
          flags: [{ name: 'n', type: 'number' }],
          exitCodes: [{ code: 2, status: 'INTERNAL_CLI_ERROR', summary: 'Oops', description: 'Detailed' }],
        },
      },
    };
    const rendered = renderMarkdown(sparse);
    expect(rendered).toContain('Variadic');
    expect(rendered).not.toContain('Variadic (min');
    expect(rendered).toContain('Detailed');
  });
});
