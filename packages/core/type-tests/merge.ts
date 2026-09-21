import { mergeDocument } from '../src/merge.js';
import type { OpenCliDocument } from '../src/types.js';

declare const document: OpenCliDocument;

// Keep the override example in packages/core/README.md type-checkable.
export const documented = mergeDocument(document, {
  info: { license: { name: 'MIT', spdxId: 'MIT' } },
  install: [{ name: 'npm', command: 'npm i -g my-cli' }],
  commands: {
    'my-cli greet': {
      examples: [{ title: 'Basic', content: 'my-cli greet Ada' }],
      exitCodes: [{ code: 1, status: 'BAD_USER_INPUT_ERROR', summary: 'Missing name' }],
      flags: [{ name: 'language', alternativeSources: [{ type: '$ENV', property: 'LANG' }] }],
    },
  },
});

// A complete document still requires the type of a new flag.
export const incompleteDocument: OpenCliDocument = {
  opencliVersion: '1.0.0-alpha.14',
  info: { title: 'Demo', binary: 'demo', version: '1' },
  commands: {
    demo: {
      flags: [
        // @ts-expect-error A new flag cannot omit type in OpenCliDocument.
        { name: 'missing-type' },
      ],
    },
  },
};
