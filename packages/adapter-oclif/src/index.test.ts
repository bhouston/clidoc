import { describe, expect, it } from 'vitest';
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
              role: { type: 'string', char: 'r', options: ['admin', 'user'], default: 'user' },
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
  });
});

describe('oclif metadata variants', () => {
  it('supports hidden commands and numeric repeatable flags', () => {
    const doc = fromOclif(
      {
        commands: {
          admin: {
            description: 'Administration',
            hidden: true,
            flags: {
              count: { type: 'integer', required: true, multiple: true, default: 2, description: 'Count' },
              ratio: { type: 'number' },
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
        { name: 'count', type: 'integer', required: true, variadic: true, default: 2 },
        { name: 'ratio', type: 'number' },
        { name: 'verbose', type: 'boolean' },
      ],
    });
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
