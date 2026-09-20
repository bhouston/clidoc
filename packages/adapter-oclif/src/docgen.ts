import { Command, Flags } from '@oclif/core';
import { writeOpenCliDocument } from '@clidoc/core';
import type { DocumentFormat, InfoObject } from '@clidoc/core';
import { fromOclif } from './index.js';
import type { OclifManifest } from './index.js';

export interface CreateDocgenCommandOptions {
  /** Overrides the command's help description. */
  description?: string;
}

/**
 * Build a ready-to-export oclif `docgen` command: `--output <file>` (required) and
 * `--format <json|markdown>` (default `json`), writing the document produced from
 * `getManifestAndInfo()` via `@clidoc/core`'s `writeOpenCliDocument`. Default-export the result
 * from `src/commands/docgen.ts`. Kept in its own entry point (`@clidoc/adapter-oclif/docgen`) so
 * importing `fromOclif` from the package root never requires `@oclif/core` to be installed.
 */
export function createDocgenCommand(
  getManifestAndInfo: () => { manifest: OclifManifest; info: InfoObject },
  options: CreateDocgenCommandOptions = {},
): Command.Class {
  return class Docgen extends Command {
    static override description = options.description ?? 'Write the OpenCLI document to a file';
    static override flags = {
      output: Flags.string({ description: 'Output file', required: true }),
      format: Flags.string({ description: 'Output format', options: ['json', 'markdown'], default: 'json' }),
    };
    async run(): Promise<void> {
      const { flags } = await this.parse(Docgen);
      const { manifest, info } = getManifestAndInfo();
      await writeOpenCliDocument(fromOclif(manifest, info), flags.output, flags.format as DocumentFormat);
    }
  };
}
