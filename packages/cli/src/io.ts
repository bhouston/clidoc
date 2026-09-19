import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export async function output(content: string, filename?: string): Promise<void> {
  if (!filename) {
    process.stdout.write(content);
    return;
  }
  const destination = resolve(filename);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content);
}
