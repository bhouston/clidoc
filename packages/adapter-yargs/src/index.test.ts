import { describe, expect, it } from 'vitest';
import { fromYargs } from './index.js';
import { defineCommand } from 'yargs-file-commands';
const info = { title: 'Demo', binary: 'demo', version: '1.0.0' };
describe('fromYargs', () => {
  it('maps declarative command modules', () => {
    const doc = fromYargs(
      [
        {
          command: ['greet <name> [items..]', 'hello'],
          describe: 'Say hello',
          builder: {
            language: { alias: 'l', type: 'string', choices: ['en', 'fr'], default: 'en', demandOption: true },
            quiet: { type: 'boolean', hidden: true },
          },
        },
      ],
      info,
    );
    expect(doc.commands?.['demo greet']).toMatchObject({
      summary: 'Say hello',
      aliases: ['hello'],
      args: [
        { name: 'name', required: true },
        { name: 'items', variadic: true },
      ],
      flags: [
        { name: 'language', aliases: ['l'], choices: [{ value: 'en' }, { value: 'fr' }], required: true },
        { name: 'quiet', type: 'boolean', hidden: true },
      ],
    });
  });
  it('accepts an actual defineCommand module without running its handler', () => {
    let ran = false;
    const command = defineCommand({
      command: 'greet <name>',
      builder: (yargs) =>
        yargs
          .positional('name', { type: 'string', describe: 'Person', choices: ['Ada', 'Grace'] })
          .option('count', { type: 'number', default: 2 }),
      handler: () => {
        ran = true;
      },
    });
    const doc = fromYargs([command], info);
    expect(ran).toBe(false);
    expect(doc.commands?.['demo greet']).toMatchObject({
      args: [{ name: 'name', summary: 'Person', choices: [{ value: 'Ada' }, { value: 'Grace' }] }],
      flags: [{ name: 'count', type: 'number', default: 2 }],
    });
  });
  it('records callback builder options and positional metadata without running handlers', () => {
    const doc = fromYargs(
      [
        {
          command: 'run <name>',
          builder: (yargs: any) =>
            yargs
              .positional('name', { type: 'string', describe: 'Person', demandOption: true })
              .option('count', { type: 'number', default: 2 }),
        },
      ],
      info,
    );
    expect(doc.commands?.['demo run']).toMatchObject({
      args: [{ name: 'name', summary: 'Person', required: true }],
      flags: [{ name: 'count', type: 'number', default: 2 }],
    });
  });
});

describe('Yargs metadata variants', () => {
  it('supports aliases, choices, arrays, and options() builder', () => {
    const doc = fromYargs(
      [
        {
          command: 'copy [paths..]',
          aliases: 'cp',
          builder: (yargs: any) =>
            yargs.options({
              force: { type: 'boolean', alias: ['f'], describe: 'Overwrite' },
              levels: { type: 'number', array: true, choices: [1, 2], default: 1 },
            }),
        },
      ],
      info,
    );
    expect(doc.commands?.['demo copy']).toMatchObject({
      aliases: ['cp'],
      args: [{ name: 'paths', variadic: true }],
      flags: [
        { name: 'force', aliases: ['f'], summary: 'Overwrite' },
        { name: 'levels', type: 'number', variadic: true, choices: [{ value: 1 }, { value: 2 }], default: 1 },
      ],
    });
  });
  it('rejects commands lacking a name and asynchronous builders', () => {
    expect(() => fromYargs([{ command: [] }], info)).toThrow('needs a command');
    expect(() => fromYargs([{ command: 'go', builder: async () => undefined }], info)).toThrow('Asynchronous');
  });
});

describe('Yargs sparse metadata', () => {
  it('handles command modules with no builder or optional metadata', () => {
    const doc = fromYargs(
      [
        { command: 'status' },
        {
          command: 'run [count]',
          describe: false,
          builder: { verbose: { description: 'Extra output', default: false }, mode: {} },
        },
      ],
      info,
    );
    expect(doc.commands?.['demo status']).toEqual({});
    expect(doc.commands?.['demo run']?.hidden).toBe(true);
    expect(doc.commands?.['demo run']).toMatchObject({
      args: [{ name: 'count', required: false }],
      flags: [
        { name: 'verbose', type: 'string', summary: 'Extra output', default: false },
        { name: 'mode', type: 'string' },
      ],
    });
  });
  it('maps numeric positionals and array aliases', () => {
    const doc = fromYargs(
      [
        {
          command: ['scale <factor>', 'resize'],
          aliases: ['s'],
          builder: (yargs: any) =>
            yargs
              .positional('factor', { type: 'number', description: 'Scale factor' })
              .option('debug', { type: 'boolean' }),
        },
      ],
      info,
    );
    expect(doc.commands?.['demo scale']).toMatchObject({
      aliases: ['resize', 's'],
      args: [{ name: 'factor', type: 'number', summary: 'Scale factor' }],
      flags: [{ name: 'debug', type: 'boolean' }],
    });
  });
});
