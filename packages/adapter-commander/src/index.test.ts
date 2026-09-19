import { describe, expect, it } from 'vitest';
import { Argument, Command, Option } from 'commander';
import { fromCommander } from './index.js';

const info = { title: 'Demo', binary: 'demo', version: '1.0.0' };
describe('fromCommander', () => {
  it('maps commands, args, flags and aliases without running actions', () => {
    const root = new Command('ignored').description('CLI');
    const group = root.command('users').description('User commands');
    let ran = false;
    group
      .command('add <name> [tags...]')
      .alias('create')
      .description('Add user')
      .addOption(
        new Option('-r, --role <role>', 'Role').choices(['admin', 'user']).makeOptionMandatory().default('user'),
      )
      .addOption(new Option('--verbose', 'Verbose').hideHelp())
      .action(() => {
        ran = true;
      });
    const doc = fromCommander(root, info);
    expect(ran).toBe(false);
    expect(doc.opencliVersion).toBe('1.0.0-alpha.14');
    expect(doc.commands?.['demo users']?.kind).toBe('group');
    expect(doc.commands?.['demo users add']).toMatchObject({
      summary: 'Add user',
      aliases: ['create'],
      args: [
        { name: 'name', required: true },
        { name: 'tags', variadic: true },
      ],
      flags: [
        { name: 'role', aliases: ['r'], type: 'string', required: true, default: 'user' },
        { name: 'verbose', type: 'boolean', hidden: true },
      ],
    });
  });
});

describe('Commander metadata variants', () => {
  it('handles optional, variadic, boolean, default and choice values', () => {
    const root = new Command('demo');
    root.argument('[mode]', 'Mode');
    root.option('--count <count>', 'Count', '3');
    root.option('-q, --quiet', 'Quiet');
    root.addArgument(new Argument('[choice]', 'Selection').choices(['a', 'b']));
    root.addOption(new Option('--items <items...>').default(false));
    const doc = fromCommander(root, info);
    expect(doc.commands?.demo?.args?.[0]).toMatchObject({ name: 'mode', summary: 'Mode' });
    expect(doc.commands?.demo?.args?.[1]).toMatchObject({ name: 'choice', choices: [{ value: 'a' }, { value: 'b' }] });
    expect(doc.commands?.demo?.flags).toMatchObject([
      { name: 'count', type: 'string', default: '3' },
      { name: 'quiet', aliases: ['q'], type: 'boolean' },
      { name: 'items', variadic: true, default: false },
    ]);
  });
});
