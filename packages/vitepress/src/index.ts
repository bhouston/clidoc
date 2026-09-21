import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { generatePages, type SupportedOpenCliDocument } from '@clidoc/core';

export interface VitePressOptions {
  /** Site source root. Generated pages live below basePath. */
  outputDir: string;
  basePath?: string;
}

/**
 * VitePress's `v-pre` container stops Vue mustache interpolation but not Vue's
 * SFC template parser, which still tries to parse tag-shaped text like
 * `use <profile> to override`. Escape `<`/`>` outside fenced code blocks and
 * inline code spans so the build never sees an unbalanced "tag".
 */
function escapeAngleBrackets(content: string): string {
  const lines = content.split('\n');
  let fenceCharacter = '';
  let fenceLength = 0;
  return lines
    .map((line) => {
      if (fenceLength) {
        const closing = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
        if (closing?.[1]?.[0] === fenceCharacter && closing[1].length >= fenceLength) {
          fenceCharacter = '';
          fenceLength = 0;
        }
        return line;
      }
      const opening = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (opening?.[1] && (opening[1][0] === '~' || !opening[2]?.includes('`'))) {
        fenceCharacter = opening[1][0]!;
        fenceLength = opening[1].length;
        return line;
      }
      // Split on inline code spans (backtick runs) and only escape outside them.
      return line
        .split(/(`+.*?`+)/)
        .map((part, index) => (index % 2 === 0 ? part.replace(/</g, '&lt;').replace(/>/g, '&gt;') : part))
        .join('');
    })
    .join('\n');
}

const manifestName = '.clidoc-generated.json';
const legacyManifestName = '.opencli-generated.json';
function ownedPath(outputDir: string, name: string): string {
  const full = resolve(outputDir, name);
  const rel = relative(outputDir, full);
  if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || rel.startsWith(sep)) {
    throw new Error(`Generated filename escapes output directory: ${name}`);
  }
  return full;
}
async function previousFiles(outputDir: string, name: string): Promise<string[]> {
  try {
    const value: unknown = JSON.parse(await readFile(join(outputDir, name), 'utf8'));
    if (!Array.isArray(value)) throw new Error('Invalid generated file manifest');
    return value.filter(
      (entry): entry is string => typeof entry === 'string' && entry.endsWith('.md') && !entry.includes('..'),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/** Use in an async VitePress config and assign the result to themeConfig.sidebar. */
export async function writeVitePress(document: SupportedOpenCliDocument, options: VitePressOptions) {
  const pages = generatePages(document, { basePath: options.basePath });
  const outputDir = resolve(options.outputDir);
  await mkdir(outputDir, { recursive: true });
  const previous = await previousFiles(outputDir, manifestName);
  const legacy = await previousFiles(outputDir, legacyManifestName);
  const current = pages.map((page) => `${page.path.replace(/^\//, '') || 'index'}.md`);
  if (new Set(current).size !== current.length) throw new Error('Generated VitePress filenames collide');
  for (const [index, page] of pages.entries()) {
    const filename = ownedPath(outputDir, current[index]!);
    await mkdir(dirname(filename), { recursive: true });
    // VitePress's v-pre container keeps Vue expressions literal while parsing Markdown;
    // escaping angle brackets keeps Vue's SFC parser from choking on tag-shaped prose.
    const content = escapeAngleBrackets(page.content.trimEnd());
    await writeFile(filename, `::: v-pre\n\n${content}\n\n:::\n`);
  }
  for (const name of [...previous, ...legacy])
    if (!current.includes(name)) await rm(ownedPath(outputDir, name), { force: true });
  await writeFile(join(outputDir, manifestName), JSON.stringify(current, null, 2) + '\n');
  await rm(join(outputDir, legacyManifestName), { force: true });
  return pages.map((page) => ({ text: page.title, link: page.path }));
}
