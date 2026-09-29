import { mkdir, writeFile } from 'node:fs/promises';
import { cliDocument } from '../packages/cli/dist/index.js';
import { parse, renderMarkdown } from '../packages/core/dist/index.js';

const cli = cliDocument();
// Set by the website deploy from the release tag; package.json versions are only bumped at release time
if (process.env.CLIDOC_VERSION) cli.info.version = process.env.CLIDOC_VERSION;
const json = JSON.stringify(cli, null, 2) + '\n';
const document = parse(json);
await mkdir(new URL('../docs/generated/', import.meta.url), { recursive: true });
await writeFile(new URL('../docs/generated/clidoc.json', import.meta.url), json);
await writeFile(new URL('../docs/generated/cli.md', import.meta.url), renderMarkdown(document));
