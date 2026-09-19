import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { generatePages, type OpenCliDocument } from '@clidoc/core';

export interface VitePressOptions {
  /** Site source root. Generated pages live below basePath. */
  outputDir: string;
  basePath?: string;
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
export async function writeVitePress(document: OpenCliDocument, options: VitePressOptions) {
  const pages = generatePages(document, { basePath: options.basePath });
  const outputDir = resolve(options.outputDir);
  await mkdir(outputDir, { recursive: true });
  const previous = await previousFiles(outputDir, manifestName);
  const legacy = await previousFiles(outputDir, legacyManifestName);
  const current = pages.map((page) => `${page.path.replace(/^\//, '') || 'index'}.md`);
  for (const [index, page] of pages.entries()) {
    const filename = ownedPath(outputDir, current[index]!);
    await mkdir(dirname(filename), { recursive: true });
    // VitePress's v-pre container keeps Vue expressions literal while parsing Markdown.
    await writeFile(filename, `::: v-pre\n\n${page.content.trimEnd()}\n\n:::\n`);
  }
  for (const name of [...previous, ...legacy])
    if (!current.includes(name)) await rm(ownedPath(outputDir, name), { force: true });
  await writeFile(join(outputDir, manifestName), JSON.stringify(current, null, 2) + '\n');
  await rm(join(outputDir, legacyManifestName), { force: true });
  return pages.map((page) => ({ text: page.title, link: page.path }));
}
