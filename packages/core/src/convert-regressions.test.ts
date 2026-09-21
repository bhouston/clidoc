import { describe, expect, it } from 'vitest';
import {
  convertDocument,
  ConversionError,
  DEFAULT_OPENCLI_DIALECT,
  type OpenCliDocument,
  type OpenCliDevDocument,
} from './index.js';

const old = (): OpenCliDocument => ({
  opencliVersion: '1.0.0-alpha.14',
  info: { title: 'App', binary: 'app', version: '1' },
  commands: { 'app run': {} },
});
const modern = (): OpenCliDevDocument => ({
  opencli: '0.1.0',
  info: { title: 'App', binaryName: 'app', version: '1' },
  commands: [{ name: 'run', operationId: 'run' }],
});
function checkFailure(action: () => unknown, message: string) {
  try {
    action();
    expect.fail('Expected conversion failure');
  } catch (error) {
    expect(error).toBeInstanceOf(ConversionError);
    expect((error as ConversionError).message).toContain(message);
    expect((error as ConversionError).diagnostics.length).toBeGreaterThan(0);
  }
}

describe('conversion boundaries', () => {
  it('defaults to bcdxn and does not alias the input object on same-dialect conversion', () => {
    expect(DEFAULT_OPENCLI_DIALECT).toBe('bcdxn');
    const input = old();
    const result = convertDocument(input, { info: { title: undefined } });
    (result.document as OpenCliDocument).info.title = 'Changed';
    expect(input.info.title).toBe('App');
    const dev = modern();
    const converted = convertDocument(dev, { to: 'opencli-dev' });
    expect(converted.document).toEqual(dev);
    expect(converted.document).not.toBe(dev);
  });

  it.each([
    [
      'summary longer than the target allows',
      (source: OpenCliDocument) => {
        source.info.summary = 'x'.repeat(121);
      },
      'maxLength',
    ],
    [
      'invalid flag identifier',
      (source: OpenCliDocument) => {
        source.commands!['app run']!.flags = [{ name: 'Upper', type: 'string' }];
      },
      'pattern',
    ],
    [
      'duplicate command aliases',
      (source: OpenCliDocument) => {
        source.commands!['app run']!.aliases = ['r', 'r'];
      },
      'duplicate',
    ],
    [
      'exit status outside the target range',
      (source: OpenCliDocument) => {
        source.global = { exitCodes: [{ code: 256, status: 'OK', summary: 'Code' }] };
      },
      '255',
    ],
    [
      'empty command collection',
      (source: OpenCliDocument) => {
        delete source.commands;
      },
      'minItems',
    ],
  ] as const)('never returns invalid target output: %s', (_, mutate, fragment) => {
    const input = old();
    mutate(input);
    checkFailure(
      () => convertDocument(input, { to: 'opencli-dev', allowLossy: true }),
      'Converted OpenCLI document is invalid',
    );
    // Validation errors are included in the exception, not only stored on an opaque property.
    try {
      convertDocument(input, { to: 'opencli-dev', allowLossy: true });
    } catch (error) {
      expect(String(error)).toMatch(
        new RegExp(
          fragment === 'maxLength' ? '121|120|characters' : fragment === 'minItems' ? 'fewer than 1|items' : fragment,
        ),
      );
    }
  });

  it('requires explicit identity when the source cannot identify the target CLI', () => {
    const input = modern();
    delete input.info;
    checkFailure(() => convertDocument(input, { allowLossy: true, info: { title: 'App' } }), '/info/binary');
    checkFailure(
      () => convertDocument(input, { allowLossy: true, info: { title: 'App', binary: 'app' } }),
      '/info/version',
    );
    checkFailure(() => convertDocument(modern(), { allowLossy: true, info: { binary: 'two words' } }), '/info/binary');
    checkFailure(() => convertDocument(old(), { to: 'opencli-dev', info: { title: '' } }), '/info');
    checkFailure(() => convertDocument(old(), { to: 'opencli-dev', info: { binary: 'two words' } }), '/info/binary');
  });

  it('preserves valid executable tokens distinct from command-name restrictions', () => {
    const input = old();
    input.info.binary = 'App.exe';
    input.commands = { 'App.exe run': {} };
    const result = convertDocument(input, { to: 'opencli-dev' });
    expect((result.document as OpenCliDevDocument).info!.binaryName).toBe('App.exe');
    expect(
      (convertDocument(result.document, { allowLossy: true }).document as OpenCliDocument).commands,
    ).toHaveProperty('App.exe run');
  });

  it('refuses to hide previously visible descendants', () => {
    const input = old();
    input.commands = { 'app admin': { kind: 'group', hidden: true }, 'app admin show': {} };
    checkFailure(() => convertDocument(input, { to: 'opencli-dev', allowLossy: true }), 'visibility');
    input.commands['app admin show']!.hidden = true;
    const result = convertDocument(input, { to: 'opencli-dev' }).document as OpenCliDevDocument;
    expect(result.commands[0]).toMatchObject({ hidden: true, commands: [{ hidden: true }] });
  });

  it('reports root metadata loss without inventing a runnable root', () => {
    const input = old();
    input.commands!.app = { kind: 'group', summary: 'Root group', 'x-source': 'extra' };
    const result = convertDocument(input, { to: 'opencli-dev', allowLossy: true });
    expect(result.diagnostics.some((item) => item.path.endsWith('/x-source'))).toBe(true);
    expect((result.document as OpenCliDevDocument).commands).toHaveLength(1);
    delete input.commands!.app;
    input.commands!.app = { kind: 'group' };
    expect(convertDocument(input, { to: 'opencli-dev' }).diagnostics).toEqual([]);
  });

  it('preserves uppercase hyphenated argument labels without a spurious loss', () => {
    const input = old();
    input.commands!['app run']!.args = [{ name: 'SOURCE-FILE', description: 'Input file' }];
    const result = convertDocument(input, { to: 'opencli-dev' });
    expect(result.diagnostics).toEqual([]);
    expect((result.document as OpenCliDevDocument).commands[0]).toMatchObject({
      arguments: [{ name: 'SOURCE-FILE', description: 'Input file', required: false }],
    });
  });
});
