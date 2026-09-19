import { Ajv2020 } from 'ajv/dist/2020.js';
import * as formatsModule from 'ajv-formats';
import { parse as parseYaml } from 'yaml';
import { schema } from './schema.js';
import type { OpenCliDocument, CommandItemObject, FlagItemObject } from './types.js';
export type * from './types.js';

/** Supported version of the vendored OpenCLI schema. */
export const OPENCLI_VERSION = '1.0.0-alpha.14' as const;
/** Vendored JSON Schema used to validate OpenCLI documents. */
export const openCliSchema = schema;
const ajv = new Ajv2020({ allErrors: true, strict: false });
(formatsModule.default as unknown as (instance: Ajv2020) => void)(ajv);
const check = ajv.compile(schema);

/** Validate against the exact vendored upstream JSON Schema. */
export function validate(document: unknown): { valid: boolean; errors: string[] } {
  const valid = check(document);
  return {
    valid,
    errors: valid
      ? []
      : (check.errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`),
  };
}

/** Parse JSON or YAML and reject documents that do not match the specification. */
export function parse(input: string): OpenCliDocument {
  let document: unknown;
  try {
    document = JSON.parse(input);
  } catch {
    try {
      document = parseYaml(input, { uniqueKeys: true });
    } catch (error) {
      throw new Error(`Invalid OpenCLI YAML: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      });
    }
  }
  const result = validate(document);
  if (!result.valid) throw new Error(`Invalid OpenCLI document: ${result.errors.join('; ')}`);
  return document as OpenCliDocument;
}

const heading = (level: number, text: string) => `${'#'.repeat(level)} ${text}\n\n`;
const escapeCell = (value: unknown) => String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const code = (value: string) => `\`${value.replace(/`/g, '\\`')}\``;
const values = (choices: { value: string | number | boolean }[]) =>
  choices.map((choice) => String(choice.value)).join(', ');
const details = (item: {
  summary?: string;
  description?: string;
  choices?: { value: string | number | boolean }[];
  variadic?: boolean;
  minItems?: number;
  maxItems?: number;
  default?: string | number | boolean;
  aliases?: string[];
}) => {
  const parts = [item.description ?? item.summary ?? ''];
  if (item.aliases?.length) parts.push(`Aliases: ${item.aliases.map(code).join(', ')}`);
  if (item.variadic)
    parts.push(
      `Variadic${item.minItems === undefined ? '' : ` (min ${item.minItems})`}${item.maxItems === undefined ? '' : ` (max ${item.maxItems})`}`,
    );
  if (item.choices?.length) parts.push(`Choices: ${values(item.choices)}`);
  if (item.default !== undefined) parts.push(`Default: ${code(String(item.default))}`);
  return parts.filter(Boolean).join('; ');
};
function table(headers: string[], rows: unknown[][]): string {
  if (!rows.length) return '';
  return `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`).join('\n')}\n\n`;
}
function fenced(content: string, language = 'sh'): string {
  const longest = Math.max(0, ...Array.from(content.matchAll(/`+/g), (match) => match[0].length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}${language}\n${content}\n${fence}\n\n`;
}
function renderCommand(name: string, command: CommandItemObject): string {
  let out = heading(2, name);
  if (command.summary) out += `${command.summary}\n\n`;
  if (command.description) out += `${command.description}\n\n`;
  if (command.aliases?.length) out += `Aliases: ${command.aliases.map(code).join(', ')}\n\n`;
  if (command.kind === 'group') out += 'Command group\n\n';
  out += table(
    ['Argument', 'Type', 'Required', 'Description'],
    (command.args ?? []).map((arg) => [
      code(arg.name),
      arg.type ?? 'string',
      arg.required ? 'Yes' : 'No',
      details(arg),
    ]),
  );
  out += renderFlags(command.flags ?? []);
  out += renderExitCodes(command.exitCodes ?? []);
  if (command.examples?.length) {
    out += heading(3, 'Examples');
    for (const example of command.examples) {
      if (example.title) out += heading(4, example.title);
      out += fenced(example.content);
    }
  }
  return out;
}
function renderFlags(flags: FlagItemObject[]): string {
  return table(
    ['Flag', 'Type', 'Required', 'Description'],
    flags
      .filter((flag) => !flag.hidden)
      .map((flag) => [code(`--${flag.name}`), flag.type, flag.required ? 'Yes' : 'No', details(flag)]),
  );
}
function renderExitCodes(codes: NonNullable<CommandItemObject['exitCodes']>): string {
  return table(
    ['Exit code', 'Status', 'Description'],
    codes.map((item) => [item.code, item.status, item.description ?? item.summary]),
  );
}

function assertDocument(document: unknown): asserts document is OpenCliDocument {
  const result = validate(document);
  if (!result.valid) throw new Error(`Invalid OpenCLI document: ${result.errors.join('; ')}`);
}

/** Render a complete Markdown reference, preserving spec-authored Markdown prose. */
export function renderMarkdown(document: OpenCliDocument): string {
  assertDocument(document);
  let out = heading(1, document.info.title);
  if (document.info.summary) out += `${document.info.summary}\n\n`;
  if (document.info.description) out += `${document.info.description}\n\n`;
  out += `Binary: ${code(document.info.binary)} · Version: ${code(document.info.version)}\n\n`;
  if (document.install?.length)
    out +=
      heading(2, 'Installation') +
      table(
        ['Method', 'Command or URL', 'Description'],
        document.install.map((method) => [
          method.name,
          method.command ? code(method.command) : (method.url ?? ''),
          method.description ?? '',
        ]),
      );
  if (document.global?.flags?.length) out += heading(2, 'Global flags') + renderFlags(document.global.flags);
  if (document.global?.exitCodes?.length)
    out += heading(2, 'Global exit codes') + renderExitCodes(document.global.exitCodes);
  for (const [name, command] of Object.entries(document.commands ?? {}).toSorted(([a], [b]) => a.localeCompare(b))) {
    if (!command.hidden) out += renderCommand(name, command);
  }
  return out.trimEnd() + '\n';
}

export type GeneratedPage = { id: string; title: string; path: string; content: string };
const slug = (name: string) => {
  const readable =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'command';
  let hash = 2166136261;
  for (const codePoint of name) {
    hash ^= codePoint.codePointAt(0)!;
    hash = Math.imul(hash, 16777619);
  }
  return `${readable}-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

/** Produce a landing page and one page per visible command with safe, stable routes. */
export function generatePages(document: OpenCliDocument, options: { basePath?: string } = {}): GeneratedPage[] {
  assertDocument(document);
  const rawBase = (options.basePath ?? '').replace(/\\/g, '/');
  const segments = rawBase.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..' || /%(?:2e|2f|5c)/i.test(segment)))
    throw new Error('Invalid basePath segment');
  const prefix = segments.length ? '/' + segments.map((segment) => encodeURIComponent(segment)).join('/') : '';
  const pages: GeneratedPage[] = [];
  const names = Object.keys(document.commands ?? {})
    .filter((name) => !document.commands?.[name]?.hidden)
    .toSorted((a, b) => a.localeCompare(b));
  let landing = heading(1, document.info.title);
  if (document.info.summary) landing += `${document.info.summary}\n\n`;
  if (document.info.description) landing += `${document.info.description}\n\n`;
  landing += `Binary: ${code(document.info.binary)} · Version: ${code(document.info.version)}\n\n`;
  if (document.install?.length)
    landing +=
      heading(2, 'Installation') +
      table(
        ['Method', 'Command or URL', 'Description'],
        document.install.map((method) => [
          method.name,
          method.command ? code(method.command) : (method.url ?? ''),
          method.description ?? '',
        ]),
      );
  if (document.global?.flags?.length) landing += heading(2, 'Global flags') + renderFlags(document.global.flags);
  if (document.global?.exitCodes?.length)
    landing += heading(2, 'Global exit codes') + renderExitCodes(document.global.exitCodes);
  if (names.length)
    landing +=
      heading(2, 'Commands') +
      names.map((name) => `- [${name.replace(/[[\]\\]/g, '\\$&')}](${`${prefix}/commands/${slug(name)}`})`).join('\n') +
      '\n\n';
  pages.push({ id: 'index', title: document.info.title, path: prefix || '/', content: landing.trimEnd() + '\n' });
  for (const name of names) {
    const route = slug(name);
    pages.push({
      id: `command-${route}`,
      title: name,
      path: `${prefix}/commands/${route}`,
      content: renderCommand(name, document.commands![name]!).trimEnd() + '\n',
    });
  }
  return pages;
}
