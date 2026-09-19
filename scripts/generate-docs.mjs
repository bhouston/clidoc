import { mkdir, writeFile } from 'node:fs/promises';
import { cliDocument } from '../packages/cli/dist/index.js';
import { parse, renderMarkdown } from '../packages/core/dist/index.js';

const json = JSON.stringify(cliDocument(), null, 2) + '\n';
const document = parse(json);
await mkdir(new URL('../docs/generated/', import.meta.url), { recursive: true });
await writeFile(new URL('../docs/generated/clidoc.json', import.meta.url), json);
await writeFile(new URL('../docs/generated/cli.md', import.meta.url), renderMarkdown(document));
