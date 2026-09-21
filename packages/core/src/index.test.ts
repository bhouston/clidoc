import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generatePages, OPENCLI_VERSION, openCliSchema, parse, renderMarkdown, validate } from './index.js';
import type { OpenCliDocument } from './types.js';

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../../../upstream/opencli/examples/${name}`, import.meta.url)), 'utf8');
const upstreamFiles = [
  'spec.schema.json',
  'examples/petstore-cli.ocs.json',
  'examples/petstore-cli.ocs.yaml',
  'examples/pleasantries-cli.ocs.yaml',
  'examples/tea.ocs.yaml',
];
const hasUpstreamFiles = upstreamFiles.every((name) =>
  existsSync(fileURLToPath(new URL(`../../../upstream/opencli/${name}`, import.meta.url))),
);
beforeAll(() => {
  if (!hasUpstreamFiles) {
    process.stderr.write(
      'Warning: skipping upstream OpenCLI fixture tests because submodule files are missing. Run `git submodule update --init --recursive` to enable them.\n',
    );
  }
});
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
  it.skipIf(!hasUpstreamFiles)('bundles the pinned schema unchanged', () => {
    const upstream = JSON.parse(
      readFileSync(fileURLToPath(new URL('../../../upstream/opencli/spec.schema.json', import.meta.url)), 'utf8'),
    );
    expect(openCliSchema).toEqual(upstream);
  });
  it.skipIf(!hasUpstreamFiles)('validates upstream examples', () => {
    for (const name of ['petstore-cli.ocs.json', 'petstore-cli.ocs.yaml', 'pleasantries-cli.ocs.yaml']) {
      expect(validate(parse(fixture(name))).valid).toBe(true);
    }
  });
  it('rejects schema violations with paths', () => {
    expect(
      validate({ ...doc, info: { ...doc.info, binary: 42 } }).errors.some((error) => error.includes('/info/binary')),
    ).toBe(true);
    expect(validate({ ...doc, opencliVersion: 'wrong' }).valid).toBe(false);
    expect(() => parse('opencliVersion: [')).toThrow(/YAML/);
    expect(() => parse('{}')).toThrow(/OpenCLI document/);
    expect(() => renderMarkdown({} as OpenCliDocument)).toThrow(/OpenCLI document/);
    expect(() => generatePages({} as OpenCliDocument)).toThrow(/OpenCLI document/);
  });
  it.skipIf(!hasUpstreamFiles)('rejects invalid upstream examples with paths', () => {
    expect(() => parse(fixture('tea.ocs.yaml'))).toThrow(/global\/config/);
  });
  it('reports which parser failed based on the input shape', () => {
    expect(() => parse('{ "opencliVersion": ')).toThrow(/Invalid OpenCLI JSON:/);
    expect(() => parse('[')).toThrow(/Invalid OpenCLI JSON:/);
    expect(() => parse('opencliVersion: [')).toThrow(/Invalid OpenCLI YAML:/);
    expect(() => parse('{ "opencliVersion": ', { format: 'json' })).toThrow(/Invalid OpenCLI JSON:/);
    expect(() => parse('opencliVersion: 1', { format: 'yaml' })).toThrow(/Invalid OpenCLI document/);
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
  it('renders inline code spans with backticks using a wider delimiter', () => {
    const document: OpenCliDocument = {
      ...doc,
      commands: {
        'acme run': {
          ...doc.commands!['acme run'],
          flags: [{ name: 'x', type: 'string', default: 'a`b' }],
        },
      },
    };
    const markdown = renderMarkdown(document);
    expect(markdown).toContain('Default: ``a`b``');
    expect(markdown).not.toContain('\\`');
  });
  it('pads code spans that start or end with a backtick', () => {
    const document: OpenCliDocument = {
      ...doc,
      commands: {
        'acme run': { ...doc.commands!['acme run'], flags: [{ name: 'x', type: 'string', default: '`a' }] },
      },
    };
    expect(renderMarkdown(document)).toContain('Default: `` `a ``');
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
  it('renders a conventional usage synopsis from command and global metadata', () => {
    const usage: OpenCliDocument = {
      ...doc,
      global: {
        flags: [
          { name: 'verbose', type: 'boolean' },
          { name: 'config', type: 'string', hint: '<path>', required: true },
          { name: 'internal', type: 'boolean', hidden: true },
        ],
      },
      commands: {
        'deploy service <legacy-argument> [flags]': {
          args: [{ name: 'target', required: true }, { name: 'environment' }, { name: 'files', variadic: true }],
          flags: [
            { name: 'verbose', type: 'boolean', required: true },
            { name: 'force', type: 'boolean' },
            { name: 'output', type: 'string', hint: 'format' },
            { name: 'token', type: 'string', required: true },
            { name: 'label', type: 'string', variadic: true },
          ],
        },
      },
    };
    const expected =
      '```sh\nacme deploy service <target> [<environment>] [<files>...] --verbose --config <path> [--force] [--output <format>] --token <token> [--label <label>]...\n```';
    expect(renderMarkdown(usage)).toContain('### Usage\n\n' + expected);
    expect(generatePages(usage)[1]?.content).toContain(expected);
    expect(renderMarkdown(usage)).not.toContain('--internal');
  });
  it('shows repeatable required inputs at least once in usage', () => {
    const usage: OpenCliDocument = {
      ...doc,
      global: undefined,
      commands: {
        'acme collect': {
          args: [{ name: 'item', variadic: true, minItems: 1 }],
          flags: [{ name: 'tag', type: 'string', variadic: true, minItems: 1 }],
        },
      },
    };
    const markdown = renderMarkdown(usage);
    expect(markdown).toContain('acme collect <item>... --tag <tag> [--tag <tag>]...');
    expect(markdown).toContain('| `item` | string | Yes | Variadic (min 1) |');
  });
  it('places the option delimiter before passthrough arguments', () => {
    const usage: OpenCliDocument = {
      ...doc,
      global: { flags: [{ name: 'verbose', type: 'boolean' }] },
      commands: {
        'acme exec [flags] -- <arguments>': {
          args: [
            { name: 'script', required: true },
            { name: 'arguments', variadic: true, passthrough: true },
          ],
          flags: [{ name: 'shell', type: 'string' }],
        },
      },
    };
    expect(renderMarkdown(usage)).toContain('acme exec [--verbose] [--shell <shell>] <script> [-- <arguments>...]');
  });
  it('preserves operands embedded in a command key when structured arguments are absent', () => {
    const usage: OpenCliDocument = {
      ...doc,
      global: undefined,
      commands: { 'send <file> [flags]': { flags: [{ name: 'verbose', type: 'boolean' }] } },
    };
    expect(renderMarkdown(usage)).toContain('acme send <file> [--verbose]');
  });
  it('does not restore a legacy flags placeholder when all structured flags are hidden', () => {
    const usage: OpenCliDocument = {
      ...doc,
      global: { flags: [{ name: 'internal', type: 'boolean', hidden: true }] },
      commands: { 'send <file> [flags]': {} },
    };
    const markdown = renderMarkdown(usage);
    expect(markdown).toContain('```sh\nacme send <file>\n```');
    expect(markdown).not.toContain('```sh\nacme send <file> [flags]');
    expect(markdown).not.toContain('--internal');
  });
  it('generates deterministic paths and navigation, stripping the binary prefix', () => {
    const pages = generatePages(doc, { basePath: '/docs/cli/' });
    expect(pages.map((page) => page.path)).toEqual(['/docs/cli', '/docs/cli/commands/run']);
    expect(pages[1]?.id).toBe('command-run');
    expect(pages[0]?.content).toContain('](/docs/cli/commands/run)');
    expect(pages[0]?.content).toContain('## Global flags');
    expect(generatePages(doc)).toEqual(generatePages(doc));
  });
  it('keeps routes unique and stable when similar or hash-shaped commands are added', () => {
    const collision: OpenCliDocument = {
      ...doc,
      commands: { 'acme foo bar': { summary: 'space' }, 'acme foo-bar': { summary: 'hyphen' } },
    };
    const before = generatePages(collision).slice(1);
    const added = generatePages({
      ...collision,
      commands: { ...collision.commands, 'acme foo-bar-3dad685f': { summary: 'hash-shaped' } },
    }).slice(1);
    expect(new Set(added.map((page) => page.path)).size).toBe(3);
    expect(new Set(added.map((page) => page.id)).size).toBe(3);
    expect(added.filter((page) => page.title !== 'acme foo-bar-3dad685f')).toEqual(before);
    expect(added.find((page) => page.title === 'acme foo-bar')?.path).toBe('/commands/foo-bar');
    expect(added.find((page) => page.title === 'acme foo bar')?.path).toMatch(/^\/commands\/foo-bar~[a-f0-9]{64}$/);
    // A command route never collides with the landing page's own `/` route.
    expect(generatePages(collision)[0]?.path).toBe('/');
    expect(added.map((page) => page.path)).not.toContain('/');
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
        'rich group': { kind: 'group' },
        'rich build': {
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
  it('renders license, contact, config, alternative sources, hint, passthrough, and choice descriptions', () => {
    const full: OpenCliDocument = {
      opencliVersion: OPENCLI_VERSION,
      info: {
        title: 'Full',
        binary: 'full',
        version: '1',
        license: { name: 'MIT', spdxId: 'MIT', url: 'https://spdx.org/licenses/MIT.html' },
        contact: { name: 'Full Team', email: 'team@example.com', url: 'https://example.com' },
      },
      global: { config: { json: '~/.full/config.json', toml: '~/.full/config.toml', yaml: '~/.full/config.yaml' } },
      commands: {
        'full run': {
          args: [{ name: 'target', passthrough: true }],
          flags: [
            {
              name: 'output',
              type: 'string',
              hint: '<format>',
              choices: [{ value: 'json', description: 'Emit JSON' }, { value: 'text' }],
              alternativeSources: [
                { type: '$ENV', property: 'FULL_OUTPUT' },
                { type: '$FILE', property: '$.output' },
              ],
            },
          ],
        },
      },
    };
    const markdown = renderMarkdown(full);
    expect(markdown).toContain('License: [MIT](https://spdx.org/licenses/MIT.html) (MIT)');
    expect(markdown).toContain('Contact: Full Team · team@example.com · https://example.com');
    expect(markdown).toContain('## Configuration');
    expect(markdown).toContain('~/.full/config.json');
    expect(markdown).toContain('Passthrough');
    expect(markdown).toContain('Hint: <format>');
    expect(markdown).toContain('Choices: json (Emit JSON), text');
    expect(markdown).toContain('Env: `FULL_OUTPUT`');
    expect(markdown).toContain('File: `$.output`');

    const landing = generatePages(full)[0]?.content ?? '';
    expect(landing).toContain('License: [MIT](https://spdx.org/licenses/MIT.html) (MIT)');
    expect(landing).toContain('Contact: Full Team · team@example.com · https://example.com');
    expect(landing).toContain('## Configuration');
    expect(landing).toContain('~/.full/config.yaml');
  });
  it('renders license and contact fallbacks and ignores empty config', () => {
    const sparse: OpenCliDocument = {
      opencliVersion: OPENCLI_VERSION,
      info: {
        title: 'Sparse',
        binary: 'sparse',
        version: '1',
        license: { name: 'Proprietary' },
        contact: { email: 'help@example.com' },
      },
      global: { config: { json: '~/.sparse/config.json' } },
    };
    const markdown = renderMarkdown(sparse);
    expect(markdown).toContain('License: Proprietary\n\n');
    expect(markdown).toContain('Contact: help@example.com\n\n');
    expect(markdown).toContain('| JSON | `~/.sparse/config.json` |');
    expect(markdown).not.toContain('| TOML |');
    const extensionOnlyConfig: OpenCliDocument = { ...sparse, global: { config: { 'x-custom': true } } };
    expect(renderMarkdown(extensionOnlyConfig)).not.toContain('## Configuration');
  });
  it.skipIf(!hasUpstreamFiles)('renders upstream petstore fields', () => {
    const petstore = parse(fixture('petstore-cli.ocs.yaml'));
    const markdown = renderMarkdown(petstore);
    expect(markdown).toContain('License:');
    expect(markdown).toContain('Contact:');
    expect(markdown).toContain('## Configuration');
    expect(markdown).toContain('Env: `PETSTORE_USER`');
  });
  it('keeps paths safe for hostile names and rejects traversal base paths', () => {
    const special: OpenCliDocument = { ...doc, commands: { '../foo': {}, '..\\foo': {}, '☃': {}, FOO: {} } };
    const pages = generatePages(special);
    expect(new Set(pages.map((page) => page.path)).size).toBe(pages.length);
    expect(pages.slice(1).every((page) => /^\/commands\/[a-z0-9-]+~[a-f0-9]{64}$/.test(page.path))).toBe(true);
    expect(() => generatePages(special, { basePath: '/docs/../out' })).toThrow(/basePath/);
    expect(() => generatePages(special, { basePath: '/docs/%2e%2e/out' })).toThrow(/basePath/);
  });
});

describe('minimal optional branches', () => {
  it('renders a positive variadic minimum as required', () => {
    const repeatable: OpenCliDocument = {
      opencliVersion: OPENCLI_VERSION,
      info: { title: 'Demo', binary: 'demo', version: '1' },
      commands: {
        demo: {
          flags: [
            { name: 'items', type: 'string', variadic: true, minItems: 1 },
            { name: 'extras', type: 'string', variadic: true, minItems: 0 },
          ],
        },
      },
    };
    const rendered = renderMarkdown(repeatable);
    expect(rendered).toContain('| `--items` | string | Yes | Variadic (min 1) |');
    expect(rendered).toContain('| `--extras` | string | No | Variadic (min 0) |');
  });

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
