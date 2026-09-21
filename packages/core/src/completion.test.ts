import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { generateCompletion, type CompletionShell, type OpenCliDocument } from './index.js';

const directory = mkdtempSync(join(tmpdir(), 'clidoc-completion-'));
afterAll(() => rmSync(directory, { recursive: true, force: true }));
const choices = (values: (string | number | boolean)[]) => values.map((value) => ({ value }));
const document: OpenCliDocument = {
  opencliVersion: '1.0.0-alpha.14',
  info: { title: 'Demo', binary: 'demo', version: '1' },
  global: {
    flags: [
      { name: 'verbose', type: 'boolean', aliases: ['v'] },
      { name: 'config', type: 'string', aliases: ['c'], choices: choices(['local', 'remote']) },
      { name: 'secret', type: 'boolean', hidden: true },
    ],
  },
  commands: {
    demo: { flags: [{ name: 'root', type: 'boolean' }] },
    'demo deploy': {
      aliases: ['d'],
      flags: [
        { name: 'format', type: 'string', aliases: ['f', 'output-format'], choices: choices(['json', 'yaml']) },
        { name: 'force', type: 'boolean' },
        { name: 'internal', type: 'string', hidden: true },
      ],
      args: [
        { name: 'target', choices: choices(['production', 'staging']) },
        { name: 'labels', variadic: true, choices: choices(['blue', 'green']) },
      ],
    },
    'demo admin': { kind: 'group', aliases: ['a'] },
    'demo admin users list': { flags: [{ name: 'all', type: 'boolean' }] },
    'demo hidden': { hidden: true, aliases: ['h'] },
    'demo hidden child': {},
    'demo quote': {
      args: [
        {
          name: 'value',
          choices: choices(["a'b", 'two words', '$(touch PWNED)', '`touch PWNED`', '*', 'a\\b', 42, true]),
        },
      ],
    },
  },
};
const quote = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;
const fq = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
function complete(shell: CompletionShell, words: string[], source = document): string[] {
  const script = generateCompletion(source, { shell });
  const name = script.match(/_clidoc_[a-f0-9]+/)![0];
  const path = join(directory, `completion.${shell}`);
  writeFileSync(path, script);
  let command: string;
  if (shell === 'bash') {
    command = `source ${quote(path)}\nsource ${quote(path)}\nCOMP_WORDS=(${words.map(quote).join(' ')})\nCOMP_CWORD=${words.length - 1}\n${name}\nprintf '%s\\n' "\${COMPREPLY[@]}"`;
  } else if (shell === 'zsh') {
    // Run the generated parser in zsh; capture compadd's data outside a ZLE widget.
    command = `compdef() { :; }\n_files() { :; }\ncompset() { :; }\ncompadd() { while [[ "$1" != -- ]]; do shift; done; shift; printf '%s\\n' "$@"; }\nsource ${quote(path)}\nwords=(${words.map(quote).join(' ')})\nCURRENT=${words.length}\n${name}`;
  } else {
    // Fish runs its actual native completion machinery, including commandline and filtering.
    const line = words.map((word, i) => (i === words.length - 1 ? word : quote(word))).join(' ');
    command = `source ${fq(path)}\nsource ${fq(path)}\ncomplete -C ${fq(line)}`;
  }
  const startup = shell === 'bash' ? ['--noprofile', '--norc'] : shell === 'zsh' ? ['-f'] : ['--no-config'];
  const output = execFileSync(shell, [...startup, '-c', command], { cwd: directory, encoding: 'utf8' });
  return output
    .trimEnd()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t')[0]!);
}

for (const shell of ['bash', 'zsh', 'fish'] as const) {
  describe(shell, () => {
    it('registers a syntactically valid, deterministic standalone script', () => {
      const script = generateCompletion(document, { shell });
      expect(script).toBe(generateCompletion(document, { shell }));
      execFileSync(shell, ['-n'], { input: script });
      expect(script).not.toContain('node ');
    });
    it('completes visible root commands and aliases', () => {
      expect(complete(shell, ['demo', ''])).toEqual(expect.arrayContaining(['deploy', 'd', 'admin', 'a', 'quote']));
      expect(complete(shell, ['demo', ''])).not.toEqual(expect.arrayContaining(['hidden']));
      expect(complete(shell, ['demo', ''])).not.toContain('h');
    });
    it('traverses nested commands, implicit groups, and parent aliases', () => {
      expect(complete(shell, ['demo', 'a', ''])).toContain('users');
      expect(complete(shell, ['demo', 'a', 'users', ''])).toContain('list');
      expect(complete(shell, ['demo', 'admin', 'users', 'list', '--'])).toContain('--all');
    });
    it('includes global flags and local aliases but hides private and sibling flags', () => {
      const flags = complete(shell, ['demo', 'd', '-']);
      expect(flags).toEqual(expect.arrayContaining(['--format', '-f', '--output-format', '--verbose', '-v']));
      for (const hidden of ['--secret', '--internal', '--root', '--all']) expect(flags).not.toContain(hidden);
    });
    it('completes separate values without treating option values as commands', () => {
      expect(complete(shell, ['demo', 'deploy', '-f', ''])).toEqual(['json', 'yaml']);
      expect(complete(shell, ['demo', '--config', 'deploy', ''])).toContain('deploy');
      expect(complete(shell, ['demo', '--config=deploy', ''])).toContain('deploy');
      expect(complete(shell, ['demo', '--verbose', 'deploy', ''])).toContain('production');
    });
    it('completes inline values and handles the Bash word-break tokenization', () => {
      const matches = complete(shell, ['demo', 'deploy', '--format=']);
      expect(matches.map((match) => match.replace(/^--format=/, ''))).toEqual(['json', 'yaml']);
      if (shell === 'bash') expect(complete(shell, ['demo', 'deploy', '--format', '=', 'j'])).toEqual(['json']);
    });
    it('completes positional and repeated positional choices and respects --', () => {
      expect(complete(shell, ['demo', 'deploy', ''])).toEqual(['production', 'staging']);
      expect(complete(shell, ['demo', 'deploy', 'production', ''])).toEqual(['blue', 'green']);
      expect(complete(shell, ['demo', 'deploy', 'production', 'blue', ''])).toEqual(['blue', 'green']);
      expect(complete(shell, ['demo', 'deploy', '--', ''])).toEqual(['production', 'staging']);
      expect(complete(shell, ['demo', 'deploy', '--', '--format', ''])).toEqual(['blue', 'green']);
    });
    it('treats metacharacters and whitespace in schema choices as data', () => {
      const matches = complete(shell, ['demo', 'quote', '']);
      expect(matches).toEqual(expect.arrayContaining(['42', 'true']));
      expect(matches).toEqual(
        expect.arrayContaining(["a'b", 'two words', '$(touch PWNED)', '`touch PWNED`', '*', 'a\\b']),
      );
      expect(() => execFileSync('test', ['-e', join(directory, 'PWNED')])).toThrow();
    });
    it('offers filenames for unconstrained option values', () => {
      writeFileSync(join(directory, 'file with space.txt'), 'fixture');
      const source = { ...document, global: { flags: [{ name: 'file', type: 'string' as const }] } };
      if (shell !== 'zsh') {
        expect(complete(shell, ['demo', '--file', 'file'], source)).toContain('file with space.txt');
        expect(
          complete(shell, ['demo', '--file=file'], source).map((value) => value.replace(/^--file=/, '')),
        ).toContain('file with space.txt');
      }
    });
    it('quotes wildcard characters in command names and option lookup keys', () => {
      const source = {
        ...document,
        commands: {
          'demo x*': { flags: [{ name: 'f*', type: 'string' as const, choices: choices(['literal']) }] },
        },
      };
      expect(complete(shell, ['demo', 'x*', '--f*', ''], source)).toContain('literal');
    });
    it('supports documents without commands, global flags or positional metadata', () => {
      const minimal = { ...document, commands: undefined, global: undefined };
      expect(generateCompletion(minimal, { shell, binary: 'renamed' })).toContain('renamed');
      expect(complete(shell, ['demo', '-'], minimal)).toEqual([]);
    });
  });
}

it('rejects invalid documents, unsupported shells and unsafe executable names', () => {
  expect(() => generateCompletion({} as OpenCliDocument, { shell: 'bash' })).toThrow('Invalid OpenCLI');
  expect(() => generateCompletion(document, { shell: 'powershell' as CompletionShell })).toThrow('Unsupported');
  for (const binary of ['', 'two words', '../demo', '$(touch PWNED)', 'demo\ncommand'])
    expect(() => generateCompletion(document, { shell: 'bash', binary })).toThrow('single executable');
});
it('rejects inconsistent command paths, aliases, and control characters', () => {
  const withCommands = (commands: OpenCliDocument['commands']) => ({ ...document, commands });
  expect(() => generateCompletion(withCommands({ other: {} }), { shell: 'bash' })).toThrow('must start');
  for (const alias of ['', 'two words'])
    expect(() => generateCompletion(withCommands({ 'demo run': { aliases: [alias] } }), { shell: 'bash' })).toThrow(
      'single words',
    );
  expect(() =>
    generateCompletion(withCommands({ 'demo run': { aliases: ['stop'] }, 'demo stop': {} }), { shell: 'bash' }),
  ).toThrow('Ambiguous');
  expect(() =>
    generateCompletion(withCommands({ 'demo run': { args: [{ name: 'arg', choices: choices(['bad\nvalue']) }] } }), {
      shell: 'bash',
    }),
  ).toThrow('control characters');
  expect(() => generateCompletion(withCommands({ 'demo bad\nname': {} }), { shell: 'bash' })).toThrow(
    'control characters',
  );
  expect(generateCompletion(withCommands({ 'demo run': { aliases: ['run'] } }), { shell: 'bash' })).toContain('run');
});
