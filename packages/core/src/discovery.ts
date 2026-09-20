import { writeOpenCliDocument } from './docgen.js';
import type { OpenCliDocument } from './types.js';

/** Hidden subcommand upstream OpenCLI adapters use for machine discovery. */
export const OPENCLI_DISCOVERY_COMMAND = '__opencli' as const;

/** Sentinel returned by {@link parseOutArg} for argv this module doesn't recognize. */
const INVALID = Symbol('invalid');

/**
 * Parse `-o <file>` / `--out <file>` / `--out=<file>` from the args following `__opencli`,
 * matching upstream OpenCLI's `ocobra` adapter flag. Returns `undefined` for no args (write to
 * stdout), the file path for a recognized flag, or {@link INVALID} for anything else.
 */
function parseOutArg(args: readonly string[]): string | undefined | typeof INVALID {
  if (args.length === 0) return undefined;
  if (args.length === 1) {
    const match = /^(?:-o|--out)=(.+)$/.exec(args[0]!);
    return match ? match[1]! : INVALID;
  }
  if (args.length === 2 && (args[0] === '-o' || args[0] === '--out')) return args[1];
  return INVALID;
}

/**
 * If argv requests the OpenCLI document (`__opencli` subcommand, optionally with upstream's
 * `-o`/`--out <file>` flag), write it — JSON, 2-space indented, single trailing newline — to that
 * file or to stdout, and return true. Otherwise return false without writing anything, so the
 * caller can continue parsing argv as usual.
 */
export async function handleOpenCliRequest(
  argv: readonly string[],
  document: () => OpenCliDocument,
  write: (chunk: string) => void = (chunk) => process.stdout.write(chunk),
): Promise<boolean> {
  if (argv[0] !== OPENCLI_DISCOVERY_COMMAND) return false;
  const outFile = parseOutArg(argv.slice(1));
  if (outFile === INVALID) return false;
  if (outFile === undefined) {
    write(`${JSON.stringify(document(), null, 2)}\n`);
  } else {
    await writeOpenCliDocument(document(), outFile);
  }
  return true;
}
