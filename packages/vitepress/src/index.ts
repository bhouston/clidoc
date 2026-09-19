import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { generatePages, type OpenCliDocument } from '@clidoc/core';

export interface VitePressOptions {
  /** Site source root. Generated pages live below basePath. */
  outputDir: string;
  basePath?: string;
}

const manifestName = '.clidoc-generated.json';
function ownedPath(outputDir: string, name: string): string {
  const full = resolve(outputDir, name);
  const rel = relative(outputDir, full);
  if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || rel.startsWith(sep)) {
    throw new Error(`Generated filename escapes output directory: ${name}`);
  }
  return full;
}
async function previousFiles(outputDir: string): Promise<string[]> {
  try {
    const value: unknown = JSON.parse(await readFile(join(outputDir, manifestName), 'utf8'));
    if (!Array.isArray(value)) throw new Error('Invalid generated file manifest');
    return value.filter(
      (name): name is string => typeof name === 'string' && name.endsWith('.md') && !name.includes('..'),
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
  const previous = await previousFiles(outputDir);
  const current = pages.map((page) => `${page.path.replace(/^\//, '') || 'index'}.md`);
  for (const [index, page] of pages.entries()) {
    const filename = ownedPath(outputDir, current[index]!);
    await mkdir(dirname(filename), { recursive: true });
    // VitePress's v-pre container keeps Vue expressions literal while parsing Markdown.
    await writeFile(filename, `::: v-pre\n\n${page.content.trimEnd()}\n\n:::\n`);
  }
  for (const name of previous) if (!current.includes(name)) await rm(ownedPath(outputDir, name), { force: true });
  await writeFile(join(outputDir, manifestName), JSON.stringify(current, null, 2) + '\n');
  return pages.map((page) => ({ text: page.title, link: page.path }));
}
