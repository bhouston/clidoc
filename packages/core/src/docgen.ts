import { writeFile } from 'node:fs/promises';
import { renderMarkdown } from './index.js';
import type { InfoObject, OpenCliDocument } from './types.js';

/** The minimal shape of `package.json` used to derive an {@link InfoObject}. */
export type PackageJsonLike = {
  name?: string;
  version?: string;
  description?: string;
  bin?: string | Record<string, string>;
};

/** Strip a npm scope (`@scope/name` -> `name`) for use as a default binary name. */
function unscopedName(name: string): string {
  return name.replace(/^@[^/]+\//, '');
}

/**
 * Derive an {@link InfoObject} from a parsed `package.json`, so adapters don't each need their
 * own `title`/`binary`/`version` bookkeeping. `overrides` wins over anything derived from `pkg`,
 * and is required for whatever `pkg` cannot express (e.g. a package that exposes several binaries).
 */
export function infoFromPackageJson(pkg: PackageJsonLike, overrides: Partial<InfoObject> = {}): InfoObject {
  const binary =
    overrides.binary ??
    (typeof pkg.bin === 'object' && pkg.bin !== null ? Object.keys(pkg.bin)[0] : undefined) ??
    (pkg.name ? unscopedName(pkg.name) : undefined);
  if (!binary) throw new Error('infoFromPackageJson: could not determine a binary name; pass overrides.binary');
  const version = overrides.version ?? pkg.version;
  if (!version) throw new Error('infoFromPackageJson: package.json has no version; pass overrides.version');
  const title = overrides.title ?? pkg.name ?? binary;
  const info: InfoObject = { ...overrides, title, binary, version };
  if (info.summary === undefined && pkg.description !== undefined) info.summary = pkg.description;
  return info;
}

/** Output format for {@link writeOpenCliDocument}. */
export type DocumentFormat = 'json' | 'markdown';

/** Render `document` (JSON or Markdown) and write it to `output`, shared by every adapter's docgen command. */
export async function writeOpenCliDocument(
  document: OpenCliDocument,
  output: string,
  format: DocumentFormat = 'json',
): Promise<void> {
  const content = format === 'markdown' ? renderMarkdown(document) : `${JSON.stringify(document, null, 2)}\n`;
  await writeFile(output, content);
}
