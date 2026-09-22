import { describe, expect, it } from 'vitest';
import { mergeDocument } from './merge.js';
import type { OpenCliDocument } from './types.js';

/** Stand-in for what a framework package's `fromX()` (e.g. `fromYargs`) would generate. */
const generated: OpenCliDocument = {
  opencliVersion: '1.0.0-alpha.14',
  info: { title: 'Demo', binary: 'demo', version: '1.0.0' },
  commands: {
    'demo greet': {
      summary: 'Say hello',
      args: [{ name: 'name', type: 'string', required: true }],
      flags: [{ name: 'language', type: 'string', default: 'en' }],
      exitCodes: [{ code: 0, status: 'OK', summary: 'Success' }],
    },
  },
};

describe('mergeDocument', () => {
  it('deep-merges info, including license and contact', () => {
    const doc = mergeDocument(generated, {
      info: { license: { name: 'MIT', spdxId: 'MIT' }, contact: { email: 'team@demo.dev' } },
    });
    expect(doc.info).toMatchObject({
      title: 'Demo',
      license: { name: 'MIT', spdxId: 'MIT' },
      contact: { email: 'team@demo.dev' },
    });
  });

  it('replaces the install array wholesale', () => {
    const withInstall = mergeDocument(generated, { install: [{ name: 'npm', command: 'npm i -g demo' }] });
    const doc = mergeDocument(withInstall, { install: [{ name: 'brew', command: 'brew install demo' }] });
    expect(doc.install).toEqual([{ name: 'brew', command: 'brew install demo' }]);
  });

  it('deep-merges global, e.g. adding global flags and exit codes', () => {
    const doc = mergeDocument(generated, {
      global: { flags: [{ name: 'verbose', type: 'boolean' }] },
    });
    expect(doc.global?.flags).toEqual([{ name: 'verbose', type: 'boolean' }]);
  });

  it('appends to examples and exitCodes arrays instead of replacing them', () => {
    const doc = mergeDocument(generated, {
      commands: {
        'demo greet': {
          examples: [{ title: 'Basic', content: 'demo greet Ada' }],
          exitCodes: [{ code: 1, status: 'BAD_USER_INPUT_ERROR', summary: 'Missing name' }],
        },
      },
    });
    expect(doc.commands?.['demo greet'].examples).toEqual([{ title: 'Basic', content: 'demo greet Ada' }]);
    expect(doc.commands?.['demo greet'].exitCodes).toEqual([
      { code: 0, status: 'OK', summary: 'Success' },
      { code: 1, status: 'BAD_USER_INPUT_ERROR', summary: 'Missing name' },
    ]);
  });

  it('merges flags and args matched by name, preserving unmentioned fields', () => {
    const doc = mergeDocument(generated, {
      commands: {
        'demo greet': {
          flags: [{ name: 'language', alternativeSources: [{ type: '$ENV', property: 'LANG' }] }],
          args: [{ name: 'name', summary: 'Person to greet' }],
        },
      },
    });
    expect(doc.commands?.['demo greet'].flags).toEqual([
      { name: 'language', type: 'string', default: 'en', alternativeSources: [{ type: '$ENV', property: 'LANG' }] },
    ]);
    expect(doc.commands?.['demo greet'].args).toEqual([
      { name: 'name', type: 'string', required: true, summary: 'Person to greet' },
    ]);
  });

  it('appends a new, unmatched flag to the array instead of dropping it', () => {
    const doc = mergeDocument(generated, {
      commands: { 'demo greet': { flags: [{ name: 'loud', type: 'boolean' }] } },
    });
    expect(doc.commands?.['demo greet'].flags).toEqual([
      { name: 'language', type: 'string', default: 'en' },
      { name: 'loud', type: 'boolean' },
    ]);
  });

  it('rejects an incomplete new flag after merging', () => {
    expect(() =>
      mergeDocument(generated, { commands: { 'demo greet': { flags: [{ name: 'missing-type' }] } } }),
    ).toThrow(/Invalid OpenCLI document after merge/);
  });

  it('rejects an incomplete new nested metadata object after merging', () => {
    expect(() => mergeDocument(generated, { info: { license: { spdxId: 'MIT' } } })).toThrow(
      /Invalid OpenCLI document after merge/,
    );
  });

  it('adds a command that does not exist in the base document as-is', () => {
    const doc = mergeDocument(generated, {
      commands: { 'demo version': { summary: 'Print the version' } },
    });
    expect(doc.commands?.['demo version']).toEqual({ summary: 'Print the version' });
    expect(doc.commands?.['demo greet']).toBeDefined();
  });

  it('ignores an explicitly-undefined override value and keeps the base value', () => {
    const doc = mergeDocument(generated, { info: { summary: undefined, title: 'Renamed' } });
    expect(doc.info).toMatchObject({ title: 'Renamed', binary: 'demo', version: '1.0.0' });
  });

  it('does not mutate the base document', () => {
    const before = JSON.parse(JSON.stringify(generated));
    mergeDocument(generated, { commands: { 'demo greet': { summary: 'Changed' } } });
    expect(generated).toEqual(before);
  });

  it('throws a clear error listing validation problems for an invalid merge result', () => {
    expect(() =>
      mergeDocument(generated, {
        commands: {
          // @ts-expect-error intentionally invalid status to exercise the validation error path
          'demo greet': { exitCodes: [{ code: 2, status: 'NOT_A_REAL_STATUS', summary: 'Bad' }] },
        },
      }),
    ).toThrow(/Invalid OpenCLI document after merge/);
  });
});
