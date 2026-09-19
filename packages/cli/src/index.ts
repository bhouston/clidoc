import { fileURLToPath } from 'node:url';
import yargs from 'yargs';
import { fileCommands } from 'yargs-file-commands';
export { cliDocument } from './definition.js';

/** Run without terminating the embedding process. Commands live in individual files. */
export async function runCli(argv: string[]): Promise<void> {
  await yargs(argv)
    .scriptName('opencli')
    .command(await fileCommands({ commandDirs: [fileURLToPath(new URL('./commands', import.meta.url))] }))
    .demandCommand(1)
    .strict()
    .help()
    .version(false)
    .exitProcess(false)
    .fail((message, error) => {
      throw error ?? new Error(message);
    })
    .parseAsync();
}
