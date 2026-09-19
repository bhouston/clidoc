import type { OpenCliDocument } from './types.js';

/** Hidden subcommand upstream OpenCLI adapters use for machine discovery. */
export const OPENCLI_DISCOVERY_COMMAND = '__opencli' as const;
/** Documented clidoc-only alias for backwards compatibility with `--opencli` flag consumers. */
export const OPENCLI_DISCOVERY_FLAG = '--opencli' as const;

/**
 * If argv requests the OpenCLI document (`__opencli` subcommand or `--opencli` flag), write it
 * to stdout (2-space indented JSON, single trailing newline) and return true. Otherwise return
 * false without writing anything, so the caller can continue parsing argv as usual.
 */
export function handleOpenCliRequest(
  argv: readonly string[],
  document: () => OpenCliDocument,
  write: (chunk: string) => void = (chunk) => process.stdout.write(chunk),
): boolean {
  if (argv.length !== 1 || (argv[0] !== OPENCLI_DISCOVERY_COMMAND && argv[0] !== OPENCLI_DISCOVERY_FLAG)) return false;
  write(`${JSON.stringify(document(), null, 2)}\n`);
  return true;
}
