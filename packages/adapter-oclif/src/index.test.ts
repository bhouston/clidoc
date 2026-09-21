import { describe, expect, it } from 'vitest';
import { validate } from '@clidoc/core';
import { fromOclif } from './index.js';
const info = { title: 'Demo', binary: 'demo', version: '1.0.0' };
describe('fromOclif', () => {
  it('maps generated manifest metadata', () => {
    const doc = fromOclif(
      {
        commands: {
          'user:add': {
            summary: 'Add user',
            aliases: ['user:create'],
            args: { name: { required: true, description: 'Name', options: ['Ada', 'Grace'] } },
            flags: {
              role: { type: 'option', char: 'r', options: ['admin', 'user'], default: 'user' },
              quiet: { type: 'boolean', hidden: true },
            },
          },
        },
      },
      info,
    );
    expect(doc.commands?.['demo user add']).toMatchObject({
      summary: 'Add user',
      aliases: ['user:create'],
      args: [{ name: 'name', required: true, summary: 'Name', choices: [{ value: 'Ada' }, { value: 'Grace' }] }],
      flags: [
        { name: 'role', aliases: ['r'], default: 'user' },
        { name: 'quiet', type: 'boolean', hidden: true },
      ],
    });
    expect(validate(doc)).toEqual({ valid: true, errors: [] });
  });
});

describe('oclif metadata variants', () => {
  it('supports hidden commands and repeatable option flags', () => {
    const doc = fromOclif(
      {
        commands: {
          admin: {
            description: 'Administration',
            hidden: true,
            flags: {
              count: { type: 'option', required: true, multiple: true, default: 2, description: 'Count' },
              verbose: { type: 'boolean', summary: 'Verbose' },
            },
          },
        },
      },
      info,
    );
    expect(doc.commands?.['demo admin']).toMatchObject({
      summary: 'Administration',
      hidden: true,
      flags: [
        { name: 'count', type: 'string', minItems: 1, variadic: true, default: 2 },
        { name: 'verbose', type: 'boolean' },
      ],
    });
    expect(doc.commands?.['demo admin']?.flags?.[0]?.required).toBeUndefined();
    expect(validate(doc)).toEqual({ valid: true, errors: [] });
  });
});

describe('oclif sparse manifest', () => {
  it('omits empty metadata and preserves flag and argument fallbacks', () => {
    const doc = fromOclif(
      {
        commands: {
          empty: { flags: {}, args: {}, aliases: [] },
          launch: {
            description: 'Launch',
            flags: { mode: { description: 'Mode' }, enabled: { default: false } },
            args: { target: { options: [1, 2] }, optional: {} },
          },
        },
      },
      info,
    );
    expect(doc.commands?.['demo empty']).toEqual({});
    expect(doc.commands?.['demo launch']).toMatchObject({
      summary: 'Launch',
      flags: [
        { name: 'mode', type: 'string', summary: 'Mode' },
        { name: 'enabled', type: 'string', default: false },
      ],
      args: [{ name: 'target', choices: [{ value: 1 }, { value: 2 }] }, { name: 'optional' }],
    });
  });
});

describe('oclif examples', () => {
  it('maps string and object examples to spec examples', () => {
    const doc = fromOclif(
      {
        commands: {
          greet: {
            description: 'Greet',
            examples: ['$ demo greet Ada', { command: '$ demo greet Ada --language fr', description: 'In French' }],
          },
        },
      },
      info,
    );
    expect(doc.commands?.['demo greet']).toMatchObject({
      examples: [{ content: '$ demo greet Ada' }, { title: 'In French', content: '$ demo greet Ada --language fr' }],
    });
  });
});

describe('oclif variadic args and arg defaults', () => {
  it('maps args.multiple to variadic and folds default into the summary', () => {
    const doc = fromOclif(
      {
        commands: {
          copy: {
            args: {
              files: { multiple: true, description: 'Files to copy' },
              mode: { default: 'safe' },
            },
          },
        },
      },
      info,
    );
    expect(doc.commands?.['demo copy']).toMatchObject({
      args: [
        { name: 'files', variadic: true, summary: 'Files to copy' },
        { name: 'mode', summary: 'Default: safe.' },
      ],
    });
  });
});

describe('oclif flag env, hint, and aliases', () => {
  it('maps env to alternativeSources, helpValue to hint, and merges aliases', () => {
    const doc = fromOclif(
      {
        commands: {
          deploy: {
            flags: {
              token: { type: 'option', env: 'DEMO_TOKEN', helpValue: 'TOKEN' },
              region: {
                type: 'option',
                char: 'r',
                aliases: ['zone'],
                charAliases: ['z'],
                helpValue: ['REGION', 'us-east-1'],
              },
            },
          },
        },
      },
      info,
    );
    expect(doc.commands?.['demo deploy']).toMatchObject({
      flags: [
        { name: 'token', hint: 'TOKEN', alternativeSources: [{ type: '$ENV', property: 'DEMO_TOKEN' }] },
        { name: 'region', aliases: ['r', 'zone', 'z'], hint: 'REGION' },
      ],
    });
  });
});

describe('oclif topics', () => {
  it('synthesises group commands from manifest topics without overwriting real commands', () => {
    const doc = fromOclif(
      {
        commands: {
          'user:add': { description: 'Add a user' },
        },
        topics: {
          user: { description: 'Manage users' },
          'user:add': { description: 'This should never win over a real command' },
          admin: { description: 'Admin tools', hidden: true },
        },
      },
      info,
    );
    expect(doc.commands?.['demo user']).toEqual({ kind: 'group', summary: 'Manage users' });
    expect(doc.commands?.['demo user add']).toMatchObject({ summary: 'Add a user' });
    expect(doc.commands?.['demo admin']).toEqual({ kind: 'group', summary: 'Admin tools', hidden: true });
    expect(validate(doc)).toEqual({ valid: true, errors: [] });
  });
});
