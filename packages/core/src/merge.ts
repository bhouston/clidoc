import { validate } from './index.js';
import type { CommandItemObject, GlobalObject, InfoObject, InstallMethodItemObject, OpenCliDocument } from './types.js';

/**
 * Author-supplied additions layered onto a generated OpenCLI document by {@link mergeDocument}.
 * Every field mirrors the shape of {@link OpenCliDocument} but is optional throughout, so an
 * author only needs to specify what they want to add or change.
 */
export type DocumentOverrides = {
  info?: Partial<InfoObject>;
  install?: InstallMethodItemObject[];
  global?: Partial<GlobalObject>;
  commands?: Record<string, Partial<CommandItemObject>>;
  [key: `x-${string}`]: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Arrays under these keys are appended rather than replaced. */
const APPEND_KEYS = new Set(['examples', 'exitCodes']);
/** Arrays under these keys are merged item-by-item, matched by `name`. */
const NAME_MERGE_KEYS = new Set(['flags', 'args']);

/** Merge two arrays of `{ name: ... }` items (flags/args): match by `name`, append the rest. */
function mergeNamedArray(base: unknown[], override: unknown[]): unknown[] {
  const result = (base as Record<string, unknown>[]).map((item) => ({ ...item }));
  for (const item of override as Record<string, unknown>[]) {
    const index = result.findIndex((entry) => entry.name === item.name);
    if (index >= 0) result[index] = mergeObjects(result[index]!, item);
    else result.push(item);
  }
  return result;
}

function mergeValue(key: string, base: unknown, override: unknown): unknown {
  if (override === undefined) return base;
  if (Array.isArray(base) && Array.isArray(override)) {
    if (APPEND_KEYS.has(key)) return [...base, ...override];
    if (NAME_MERGE_KEYS.has(key)) return mergeNamedArray(base, override);
    return override;
  }
  if (isPlainObject(base) && isPlainObject(override)) return mergeObjects(base, override);
  return override;
}

function mergeObjects(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) result[key] = mergeValue(key, base[key], override[key]);
  return result;
}

/**
 * Return a new document with `overrides` deep-merged onto `base`. Plain objects merge
 * recursively (so `info.license`, `global`, and individual commands can be extended without
 * repeating the rest). Arrays in `overrides` replace the base array, except `examples` and
 * `exitCodes`, which append, and `flags`/`args`, which are merged item-by-item matched by
 * `name` (so an author can add e.g. `alternativeSources` to one generated flag without
 * repeating the whole flag list). Commands not present in `base` are added as-is.
 *
 * Throws if the merged result fails OpenCLI schema validation, listing every problem found.
 */
export function mergeDocument(base: OpenCliDocument, overrides: DocumentOverrides): OpenCliDocument {
  const merged = mergeObjects(base as unknown as Record<string, unknown>, overrides as Record<string, unknown>);
  const result = merged as unknown as OpenCliDocument;
  const { valid, errors } = validate(result);
  if (!valid) throw new Error(`Invalid OpenCLI document after merge: ${errors.join('; ')}`);
  return result;
}
